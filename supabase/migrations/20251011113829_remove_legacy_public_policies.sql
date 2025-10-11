-- =============================================================
-- Migration: remove_legacy_public_policies
-- Fecha: 2025-10-11 11:38:29
-- Objetivo: Eliminar políticas legacy TO public que permitían cross-tenant access.
--           Tras esta migración, todo acceso público se realiza únicamente via Edge Functions.
-- =============================================================

-- Businesses
DROP POLICY IF EXISTS public_read_business_by_share_token ON businesses;

-- Employees
DROP POLICY IF EXISTS select_employees ON employees;

-- Services
DROP POLICY IF EXISTS select_services ON services;

-- Bookings
DROP POLICY IF EXISTS select_bookings_public ON bookings;

-- Service Employees
DROP POLICY IF EXISTS select_service_employees ON service_employees;

-- Booking Services
DROP POLICY IF EXISTS select_booking_services ON booking_services;
