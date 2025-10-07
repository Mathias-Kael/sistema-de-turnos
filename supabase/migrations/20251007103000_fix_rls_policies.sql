-- =============================================================
-- Migration: fix_rls_policies
-- Fecha: 2025-10-07 10:30:00 (UTC aprox)
-- Objetivo: Reemplazar políticas permisivas (qual: true) por
--           políticas restrictivas basadas en share token válido
-- Estrategia: 
--   - Lectura pública SOLO de datos pertenecientes a negocios con
--     share_token activo (status activos, token vigente)
--   - Escritura pública BLOQUEADA excepto creación de bookings y
--     booking_services bajo un negocio compartido válido
--   - Resto de escrituras requieren service_role (sin política => denegado)
-- Nota: Futuro (auth): introducir owner_id y políticas basadas en auth.uid()
-- =============================================================

-- ============================================
-- 1. DROP de políticas inseguras anteriores
-- ============================================

-- Businesses
DROP POLICY IF EXISTS "Public read active businesses" ON businesses;
DROP POLICY IF EXISTS "Allow insert businesses" ON businesses;
DROP POLICY IF EXISTS "Allow update own business" ON businesses;

-- Employees
DROP POLICY IF EXISTS "Business data visible to public" ON employees;
DROP POLICY IF EXISTS "Allow insert employees" ON employees;
DROP POLICY IF EXISTS "Allow update employees" ON employees;

-- Services
DROP POLICY IF EXISTS "Business services visible to public" ON services;
DROP POLICY IF EXISTS "Allow insert services" ON services;
DROP POLICY IF EXISTS "Allow update services" ON services;

-- Bookings
DROP POLICY IF EXISTS "Business bookings visible to public" ON bookings;
DROP POLICY IF EXISTS "Allow insert bookings" ON bookings;
DROP POLICY IF EXISTS "Allow update bookings" ON bookings;
DROP POLICY IF EXISTS "Allow delete bookings" ON bookings;

-- Service Employees
DROP POLICY IF EXISTS "Allow all on service_employees" ON service_employees;

-- Booking Services
DROP POLICY IF EXISTS "Allow all on booking_services" ON booking_services;

-- ============================================
-- 2. Políticas reutilizables: sub‑consulta de negocios compartidos
-- ============================================
-- Criterio de negocio compartido y visible públicamente:
--  * status = 'active'
--  * share_token no nulo
--  * share_token_status = 'active'
--  * share_token_expires_at nulo o futuro
-- Usado en múltiples USING / WITH CHECK para consistencia.

-- ============================================
-- 3. BUSINESSES (SOLO LECTURA PÚBLICA)
-- ============================================
CREATE POLICY "Public read businesses with valid token"
ON businesses FOR SELECT
TO public
USING (
  status = 'active'
  AND share_token IS NOT NULL
  AND share_token_status = 'active'
  AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
);
-- Sin políticas INSERT/UPDATE/DELETE => denegado para anon

-- ============================================
-- 4. EMPLOYEES
-- ============================================
CREATE POLICY "Public read employees of shared businesses"
ON employees FOR SELECT
TO public
USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active'
      AND share_token IS NOT NULL
      AND share_token_status = 'active'
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  )
);
-- (Sin políticas de escritura)

-- ============================================
-- 5. SERVICES
-- ============================================
CREATE POLICY "Public read services of shared businesses"
ON services FOR SELECT
TO public
USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active'
      AND share_token IS NOT NULL
      AND share_token_status = 'active'
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  )
);
-- (Sin políticas de escritura)

-- ============================================
-- 6. SERVICE_EMPLOYEES (solo lectura relacional)
-- ============================================
CREATE POLICY "Public read service_employees of shared businesses"
ON service_employees FOR SELECT
TO public
USING (
  service_id IN (
    SELECT id FROM services
    WHERE business_id IN (
      SELECT id FROM businesses
      WHERE status = 'active'
        AND share_token IS NOT NULL
        AND share_token_status = 'active'
        AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
    )
  )
);
-- (Sin políticas de escritura)

-- ============================================
-- 7. BOOKINGS
-- ============================================
CREATE POLICY "Public read bookings of shared businesses"
ON bookings FOR SELECT
TO public
USING (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active'
      AND share_token IS NOT NULL
      AND share_token_status = 'active'
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  )
);

CREATE POLICY "Public insert bookings to shared businesses"
ON bookings FOR INSERT
TO public
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active'
      AND share_token IS NOT NULL
      AND share_token_status = 'active'
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  )
);
-- (Sin update/delete para público)

-- ============================================
-- 8. BOOKING_SERVICES
-- ============================================
CREATE POLICY "Public read booking_services of shared businesses"
ON booking_services FOR SELECT
TO public
USING (
  booking_id IN (
    SELECT id FROM bookings
    WHERE business_id IN (
      SELECT id FROM businesses
      WHERE status = 'active'
        AND share_token IS NOT NULL
        AND share_token_status = 'active'
        AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
    )
  )
);

CREATE POLICY "Public insert booking_services for shared bookings"
ON booking_services FOR INSERT
TO public
WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings
    WHERE business_id IN (
      SELECT id FROM businesses
      WHERE status = 'active'
        AND share_token IS NOT NULL
        AND share_token_status = 'active'
        AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
    )
  )
);
-- (Sin update/delete para público)

-- ============================================
-- 9. Notas Futuras (no ejecutable)
-- ============================================
-- FUTURO (auth):
--  * ALTER TABLE businesses ADD COLUMN owner_id uuid REFERENCES auth.users(id);
--  * Políticas adicionales: USING (auth.uid() = owner_id)
--  * Permitir CRUD completo al owner; mantener políticas públicas SOLO SELECT/INSERT limitadas
--  * Opcional: Row Level Security granular por bookings (cliente) cuando se introduzca auth de cliente

-- FIN DE MIGRACIÓN
