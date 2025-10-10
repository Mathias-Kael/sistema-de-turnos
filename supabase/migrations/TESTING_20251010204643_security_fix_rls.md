# Testing Plan: Security Fix RLS Migration

## Migration Details
- **File**: `20251010204643_security_fix_rls.sql`
- **Date**: 2025-10-10
- **Objective**: Eliminar INSERT público directo, agregar políticas owner_id

---

## Pre-Migration Checklist

- [ ] Backup de base de datos
- [ ] Verificar políticas actuales: `\dp businesses` en psql
- [ ] Listar Edge Functions desplegadas: `supabase functions list`
- [ ] Confirmar que `public-bookings` está deployado y funcional

---

## Apply Migration

```bash
# Opción 1: Via Supabase CLI (recomendado)
supabase db push

# Opción 2: Via Dashboard SQL Editor
# Copiar contenido de 20251010204643_security_fix_rls.sql y ejecutar
```

---

## Post-Migration Testing

### Test 1: Admin CRUD (Authenticated User)

**Setup:**
```javascript
// En navegador, con usuario autenticado
const { data: business } = await supabase
  .from('businesses')
  .update({ name: 'Test Update' })
  .eq('id', businessId)
  .select()
  .single();

console.log('✅ Update successful:', business);
```

**Expected:**
- ✅ UPDATE exitoso si `owner_id = auth.uid()`
- ❌ Error si `owner_id != auth.uid()` (cross-tenant protection)

---

### Test 2: Public SELECT (Anon Key)

**Setup:**
```javascript
// Cliente público con share_token
const { data: business } = await supabase
  .from('businesses')
  .select('*')
  .eq('share_token', 'valid-token-here')
  .single();

console.log('✅ Public read successful:', business);
```

**Expected:**
- ✅ SELECT exitoso con share_token válido
- ❌ NULL si share_token inválido o expirado

---

### Test 3: Public INSERT (Should FAIL)

**Setup:**
```javascript
// Cliente público intenta INSERT directo
const { data, error } = await supabase
  .from('bookings')
  .insert({
    business_id: 'some-id',
    client_name: 'Test',
    // ...
  });

console.log('Expected error:', error);
```

**Expected:**
- ❌ Error RLS: "new row violates row-level security policy"
- ✅ Esta es la seguridad funcionando correctamente

---

### Test 4: Public Booking via Edge Function

**Setup:**
```javascript
// Cliente público reserva via Edge Function
const response = await fetch('https://[project].supabase.co/functions/v1/public-bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify({
    token: 'valid-share-token',
    services: [{ id: 'service-id' }],
    date: '2025-10-15',
    start: '10:00',
    end: '10:30',
    employeeId: 'employee-id',
    client: {
      name: 'Juan Pérez',
      phone: '+54912345678'
    }
  })
});

const result = await response.json();
console.log('✅ Booking created via Edge Function:', result);
```

**Expected:**
- ✅ INSERT exitoso via Edge Function (service_role bypass)
- ✅ Retorna `{ data: { id: 'booking-id' } }`

---

### Test 5: Cross-Tenant Protection

**Setup:**
```javascript
// Usuario A autenticado
const userA_id = 'user-a-auth-uid';
const businessA_id = 'business-owned-by-user-a';

// Usuario B autenticado (diferente sesión)
const userB_id = 'user-b-auth-uid';

// Usuario B intenta modificar negocio de Usuario A
const { data, error } = await supabase
  .from('businesses')
  .update({ name: 'Hacked!' })
  .eq('id', businessA_id)
  .select();

console.log('Expected: No rows returned, error:', error);
```

**Expected:**
- ❌ UPDATE falla silenciosamente (no rows affected)
- ✅ Política `owner_id = auth.uid()` protege cross-tenant access

---

### Test 6: Admin Functions with JWT

**Setup:**
```javascript
// Frontend con usuario autenticado
const { data: { session } } = await supabase.auth.getSession();
const jwt = session.access_token;

const response = await fetch('https://[project].supabase.co/functions/v1/admin-businesses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify({
    action: 'update',
    data: {
      id: businessId,
      name: 'Updated via EF'
    }
  })
});

const result = await response.json();
console.log('✅ Admin EF update:', result);
```

**Expected:**
- ✅ UPDATE exitoso si JWT válido y owner_id coincide
- ❌ Error "Unauthorized" si JWT inválido
- ❌ Error si intenta modificar negocio de otro owner

---

## Validation Queries (SQL)

### Check RLS Policies
```sql
-- Ver políticas activas
SELECT 
  schemaname, tablename, policyname, 
  permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Specific Policies
```sql
-- Verificar que INSERT público fue eliminado
SELECT * FROM pg_policies 
WHERE tablename = 'bookings' 
  AND policyname LIKE '%insert%'
  AND 'public' = ANY(roles);
-- Expected: 0 rows (ninguna política INSERT para public)

-- Verificar que políticas owner existen
SELECT * FROM pg_policies 
WHERE tablename = 'businesses' 
  AND policyname LIKE '%Owners%';
-- Expected: 1 row (Owners full access businesses)
```

---

## Rollback Plan

Si la migración causa problemas:

```sql
-- Restaurar INSERT público (temporal, solo para emergencia)
CREATE POLICY "TEMP_Public_insert_bookings"
ON bookings FOR INSERT
TO public
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active'
      AND share_token IS NOT NULL
      AND share_token_status = 'active'
  )
);

-- Notificar al equipo y planear fix
```

---

## Success Criteria

- ✅ Admin CRUD funciona con authenticated users
- ✅ Cliente público puede leer datos via share_token
- ✅ Cliente público **NO** puede INSERT directo (RLS block)
- ✅ Cliente público puede reservar via `public-bookings` Edge Function
- ✅ Cross-tenant protection verificado (owner_id isolation)
- ✅ Edge Functions con service_role funcionan normalmente
- ✅ No errores 500 en producción
- ✅ Logs de Supabase sin anomalías RLS

---

## Monitoring

Post-deployment, monitorear:

1. **Supabase Dashboard → Logs → Database**
   - Buscar errores RLS: "violates row-level security"
   - Expected: Solo intentos públicos de INSERT bloqueados

2. **Edge Functions Logs**
   - Verificar que `public-bookings` sigue funcionando
   - Verificar que `admin-*` functions validan JWT correctamente

3. **Frontend Console**
   - Verificar que no hay errores inesperados en operaciones CRUD
   - Confirmar que reservas públicas funcionan normalmente

---

## Notes

- Las políticas SELECT públicas se mantienen temporalmente para backward compatibility
- En futuro, migrar a function-based validation para SELECT también
- Considerar agregar índices en `owner_id` si performance degrada:
  ```sql
  CREATE INDEX idx_businesses_owner ON businesses(owner_id);
  CREATE INDEX idx_bookings_business_owner ON bookings(business_id);
  ```

---

**Testing Date**: _____________  
**Tested By**: _____________  
**Status**: [ ] Pass [ ] Fail  
**Notes**: _____________________________________
