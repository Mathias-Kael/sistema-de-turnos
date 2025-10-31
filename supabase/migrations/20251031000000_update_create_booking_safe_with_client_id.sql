-- Migration: Update create_booking_safe RPC to support optional client_id
-- Date: 2025-10-31
-- Feature: Clientes Recurrentes - Fase 2
-- Description: Adds p_client_id parameter to the booking creation RPC
--              Maintains backward compatibility (parameter is optional)

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS create_booking_safe(
  p_employee_id UUID,
  p_date DATE,
  p_start TEXT,
  p_end TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_business_id UUID,
  p_service_ids UUID[]
);

-- Recreate function with client_id support
CREATE OR REPLACE FUNCTION create_booking_safe(
  p_employee_id UUID,
  p_date DATE,
  p_start TEXT,
  p_end TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_business_id UUID,
  p_service_ids UUID[],
  p_client_id UUID DEFAULT NULL,  -- ← NEW: Optional client_id
  p_client_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_service_id UUID;
  v_service_name TEXT;
  v_service_price NUMERIC;
  v_start_minutes INT;
  v_end_minutes INT;
  v_overlap_count INT;
BEGIN
  -- Validate employee belongs to business
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = p_employee_id 
    AND business_id = p_business_id 
    AND archived = false
  ) THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Validate all services belong to business
  IF EXISTS (
    SELECT 1 FROM services 
    WHERE id = ANY(p_service_ids) 
    AND (business_id != p_business_id OR archived = true)
  ) THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  -- Convert times to minutes for overlap detection
  v_start_minutes := (EXTRACT(HOUR FROM p_start::TIME) * 60 + EXTRACT(MINUTE FROM p_start::TIME))::INT;
  v_end_minutes := (EXTRACT(HOUR FROM p_end::TIME) * 60 + EXTRACT(MINUTE FROM p_end::TIME))::INT;

  -- Check for overlapping bookings
  SELECT COUNT(*) INTO v_overlap_count
  FROM bookings
  WHERE employee_id = p_employee_id
    AND booking_date = p_date
    AND archived = false
    AND (
      -- New booking starts during existing booking
      (v_start_minutes >= (EXTRACT(HOUR FROM start_time::TIME) * 60 + EXTRACT(MINUTE FROM start_time::TIME))::INT
       AND v_start_minutes < (EXTRACT(HOUR FROM end_time::TIME) * 60 + EXTRACT(MINUTE FROM end_time::TIME))::INT)
      OR
      -- New booking ends during existing booking  
      (v_end_minutes > (EXTRACT(HOUR FROM start_time::TIME) * 60 + EXTRACT(MINUTE FROM start_time::TIME))::INT
       AND v_end_minutes <= (EXTRACT(HOUR FROM end_time::TIME) * 60 + EXTRACT(MINUTE FROM end_time::TIME))::INT)
      OR
      -- New booking completely contains existing booking
      (v_start_minutes <= (EXTRACT(HOUR FROM start_time::TIME) * 60 + EXTRACT(MINUTE FROM start_time::TIME))::INT
       AND v_end_minutes >= (EXTRACT(HOUR FROM end_time::TIME) * 60 + EXTRACT(MINUTE FROM end_time::TIME))::INT)
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Employee already has booking at this time';
  END IF;

  -- Insert booking with optional client_id
  INSERT INTO bookings (
    business_id,
    employee_id,
    client_name,
    client_phone,
    client_email,
    client_id,  -- ← NEW: Associate with registered client if provided
    booking_date,
    start_time,
    end_time,
    status
  ) VALUES (
    p_business_id,
    p_employee_id,
    p_client_name,
    p_client_phone,
    p_client_email,
    p_client_id,  -- ← Will be NULL if not provided (backward compatible)
    p_date,
    p_start::TIME,
    p_end::TIME,
    'confirmed'
  ) RETURNING id INTO v_booking_id;

  -- Insert booking_services records
  FOREACH v_service_id IN ARRAY p_service_ids
  LOOP
    -- Get service details
    SELECT name, price INTO v_service_name, v_service_price
    FROM services
    WHERE id = v_service_id;

    INSERT INTO booking_services (
      booking_id,
      service_id,
      service_name,
      service_price
    ) VALUES (
      v_booking_id,
      v_service_id,
      v_service_name,
      v_service_price
    );
  END LOOP;

  RETURN v_booking_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_booking_safe(UUID, DATE, TEXT, TEXT, TEXT, TEXT, UUID, UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_safe(UUID, DATE, TEXT, TEXT, TEXT, TEXT, UUID, UUID[], UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION create_booking_safe IS 'Creates a booking with overlap validation. Now supports optional client_id for registered clients (Fase 2 - Clientes Recurrentes).';
