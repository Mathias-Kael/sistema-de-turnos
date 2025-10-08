-- Migration: Auto-populate booking_services service_name & service_price
-- Fecha: 2025-10-08

-- 1. Drop trigger/function previos si existieran
DROP TRIGGER IF EXISTS trg_populate_booking_services ON booking_services;
DROP FUNCTION IF EXISTS fn_populate_booking_services();

-- 2. Crear función
CREATE OR REPLACE FUNCTION fn_populate_booking_services()
RETURNS TRIGGER AS $$
DECLARE
  svc RECORD;
BEGIN
  SELECT id, name, price
    INTO svc
    FROM services
   WHERE id = NEW.service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service % not found', NEW.service_id;
  END IF;
  NEW.service_name := svc.name;
  NEW.service_price := svc.price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger BEFORE INSERT
CREATE TRIGGER trg_populate_booking_services
BEFORE INSERT ON booking_services
FOR EACH ROW
EXECUTE FUNCTION fn_populate_booking_services();

-- 4. Backfill histórico (para filas con valores vacíos o nulos)
UPDATE booking_services bs
SET service_name = s.name,
    service_price = s.price
FROM services s
WHERE bs.service_id = s.id
  AND (bs.service_name IS NULL OR bs.service_name = '' OR bs.service_price IS NULL OR bs.service_price = 0);
