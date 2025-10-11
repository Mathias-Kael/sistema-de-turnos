-- =============================================================
-- Migration: hardening_booking_services_trigger
-- Fecha: 2025-10-10 23:50:50
-- Objetivo: endurecer trigger booking_services para evitar abuso de SECURITY DEFINER
--            tras la eliminación de políticas públicas.
-- =============================================================

-- 1. Eliminar trigger y función existentes (si quedan de migraciones previas)
DROP TRIGGER IF EXISTS trg_populate_booking_services ON booking_services;
DROP FUNCTION IF EXISTS fn_populate_booking_services();

-- 2. Crear función SIN SECURITY DEFINER (usar privilegios del invocador)
CREATE OR REPLACE FUNCTION fn_populate_booking_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  svc RECORD;
BEGIN
  -- La función asume que RLS validó business_id/service_id previamente.
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
$$;

-- 3. Crear trigger BEFORE INSERT con la nueva función endurecida
CREATE TRIGGER trg_populate_booking_services
BEFORE INSERT ON booking_services
FOR EACH ROW
EXECUTE FUNCTION fn_populate_booking_services();
