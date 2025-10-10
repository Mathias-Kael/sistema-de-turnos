-- =============================================================
-- Migration: security_fix_rls
-- Fecha: 2025-10-10 20:46:43
-- Objetivo: Fix crítico de seguridad RLS - enfoque híbrido
-- 
-- ESTRATEGIA:
-- 1. Eliminar INSERT público directo - Solo Edge Functions
-- 2. Mantener SELECT público con validación via token
-- 3. Agregar políticas authenticated con owner_id validation
-- 
-- CAMBIOS CRÍTICOS:
-- - DROP políticas INSERT públicas inseguras
-- - CREATE políticas owner_id para usuarios authenticated
-- - Preparar migración a function-based INSERT validation
-- =============================================================

-- ============================================
-- PASO 1: ELIMINAR POLÍTICAS INSERT PÚBLICAS
-- ============================================

-- Bookings: Eliminar INSERT público directo
DROP POLICY IF EXISTS "Public insert bookings to shared businesses" ON bookings;

-- Booking Services: Eliminar INSERT público directo  
DROP POLICY IF EXISTS "Public insert booking_services for shared bookings" ON booking_services;

-- NOTA: Las políticas SELECT públicas se mantienen temporalmente
-- para permitir visualización via share_token. En el futuro,
-- migraremos a validación via Edge Function parameter.

-- ============================================
-- PASO 2: POLÍTICAS AUTHENTICATED - BUSINESSES
-- ============================================

-- Owner tiene acceso COMPLETO a su negocio
CREATE POLICY "Owners full access businesses"
ON businesses
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ============================================
-- PASO 3: POLÍTICAS AUTHENTICATED - EMPLOYEES
-- ============================================

-- Owner puede gestionar empleados de su negocio
CREATE POLICY "Owners full access employees"
ON employees  
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- PASO 4: POLÍTICAS AUTHENTICATED - SERVICES
-- ============================================

-- Owner puede gestionar servicios de su negocio
CREATE POLICY "Owners full access services"
ON services
FOR ALL
TO authenticated  
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- PASO 5: POLÍTICAS AUTHENTICATED - SERVICE_EMPLOYEES
-- ============================================

-- Owner puede gestionar asignaciones de servicios-empleados
CREATE POLICY "Owners full access service_employees"
ON service_employees
FOR ALL
TO authenticated
USING (
  service_id IN (
    SELECT id FROM services
    WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  service_id IN (
    SELECT id FROM services
    WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
);

-- ============================================
-- PASO 6: POLÍTICAS AUTHENTICATED - BOOKINGS
-- ============================================

-- Owner puede gestionar reservas de su negocio
CREATE POLICY "Owners full access bookings"
ON bookings
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- PASO 7: POLÍTICAS AUTHENTICATED - BOOKING_SERVICES
-- ============================================

-- Owner puede gestionar servicios de reservas de su negocio
CREATE POLICY "Owners full access booking_services"
ON booking_services
FOR ALL
TO authenticated
USING (
  booking_id IN (
    SELECT id FROM bookings
    WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings
    WHERE business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
);

-- ============================================
-- VERIFICACIÓN DE ESTADO POST-MIGRACIÓN
-- ============================================

-- Comentarios para referencia futura:
-- 
-- PÚBLICO (anon):
--   ✅ SELECT: Permitido via share_token validation
--   ❌ INSERT: BLOQUEADO - Solo via Edge Functions
--   ❌ UPDATE: BLOQUEADO
--   ❌ DELETE: BLOQUEADO
--
-- AUTHENTICATED (usuarios con auth.uid()):
--   ✅ SELECT: Permitido solo sus propios datos (owner_id = auth.uid())
--   ✅ INSERT: Permitido solo en su negocio
--   ✅ UPDATE: Permitido solo sus propios datos
--   ✅ DELETE: Permitido solo sus propios datos
--
-- EDGE FUNCTIONS:
--   ✅ Usan service_role key - bypass RLS
--   ✅ public-bookings maneja INSERT de reservas
--   ✅ admin-* functions validan JWT owner_id

-- ============================================
-- TESTING CHECKLIST
-- ============================================
-- [ ] Admin CRUD con authenticated user funciona
-- [ ] Cliente público puede leer datos via share_token
-- [ ] Cliente público NO puede INSERT directo (error RLS)
-- [ ] Cliente público puede reservar via public-bookings Edge Function
-- [ ] No hay cross-tenant data leaks (test con 2 owners)
-- [ ] Edge Functions con service_role siguen funcionando

-- FIN DE MIGRACIÓN
