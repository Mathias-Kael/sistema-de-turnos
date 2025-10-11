-- =============================================================
-- Migration: remove_public_select
-- Fecha: 2025-10-10 23:12:22
-- Objetivo: Eliminar todas las políticas SELECT públicas vulnerables.
--           A partir de esta migración, todo acceso público deberá pasar
--           por Edge Functions con validaciones explícitas.
-- =============================================================

-- Businesses
DROP POLICY IF EXISTS "Public read shared businesses" ON businesses;
DROP POLICY IF EXISTS "Public read businesses with valid token" ON businesses;

-- Employees
DROP POLICY IF EXISTS "Public read employees of shared businesses" ON employees;

-- Services
DROP POLICY IF EXISTS "Public read services of shared businesses" ON services;

-- Bookings
DROP POLICY IF EXISTS "Public read bookings of shared businesses" ON bookings;

-- Booking Services
DROP POLICY IF EXISTS "Public read booking_services of shared businesses" ON booking_services;

-- Service Employees
DROP POLICY IF EXISTS "Public read service_employees of shared businesses" ON service_employees;
