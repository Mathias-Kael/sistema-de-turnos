# SOLUCIÓN DE PROBLEMAS - ASTRA

**Sistema de Gestión de Turnos Multi-tenant SaaS**  
**Última actualización:** 21 Noviembre 2025

---

## 📋 ÍNDICE

1. [Troubleshooting por Categoría](#troubleshooting-por-categoría)
2. [Fixes Históricos Documentados](#fixes-históricos-documentados)
3. [Issues Conocidos](#issues-conocidos)
4. [Procedimientos de Emergencia](#procedimientos-de-emergencia)
5. [Logs y Diagnóstico](#logs-y-diagnóstico)

---

## TROUBLESHOOTING POR CATEGORÍA

### 🔐 Autenticación y Seguridad

#### Reset Password Flow No Funciona
**Síntomas:**
- Usuario no recibe email de recuperación
- Link de reset expira o es inválido
- Nueva contraseña no se guarda

**Diagnóstico:**
```bash
# 1. Verificar configuración SMTP en Supabase
Dashboard → Authentication → Email Templates

# 2. Check redirect URLs
Dashboard → Authentication → URL Configuration
# Debe incluir: https://astraturnos.com/reset-password

# 3. Verificar logs de email
Dashboard → Logs → Filter: "email"
```

**Soluciones comunes:**
- **Email no llega:** Verificar SMTP configuration en Supabase Auth settings
- **Token inválido:** Tokens expiran en 1 hora - regenerar nuevo link
- **Contraseña no persiste:** Verificar que `updateUser()` se ejecuta correctamente

**Fix aplicado (Octubre 2025):**
- Enfoque híbrido: `onAuthStateChange` + hash params fallback
- Validación mínimo 8 caracteres
- Mensajes traducidos a español
- Auto-redirect post-éxito

---

#### RLS Policy Blocks Query
**Síntomas:**
- Query retorna vacío aun con datos existentes
- Error: "permission denied for table X"

**Diagnóstico:**
```sql
-- Test como service_role (bypass RLS)
SELECT * FROM businesses WHERE id = 'xxx';

-- Test como anon (con RLS)
SELECT * FROM businesses WHERE id = 'xxx';

-- Ver policies activas
SELECT * FROM pg_policies WHERE tablename = 'businesses';
```

**Soluciones:**
- **Policy demasiado restrictiva:** Ajustar condiciones en policy
- **Missing policy:** Crear policy para operación específica
- **Wrong role:** Usar service_role para operaciones admin cuando corresponda

---

### 🗄️ Base de Datos

#### Supabase MCP Connectivity Lost
**Síntomas:**
- Claude no puede ejecutar queries
- Error: "Token inválido o permisos incorrectos"
- Tools de Supabase no responden

**Fix documentado (8 Nov 2025):**

**Root cause:** Token expirado o configuración incorrecta en `claude_desktop_config.json`

**Solución:**
1. **Generar nuevo Personal Access Token:**
   ```
   Supabase Dashboard → Account → Access Tokens
   - Name: "Claude Desktop MCP"
   - Expiration: NEVER
   - Scopes: ALL enabled
   ```

2. **Actualizar configuración:**
   ```json
   {
     "supabase": {
       "command": "npx",
       "args": [
         "-y",
         "@supabase/mcp-server-supabase@latest",
         "--project-ref=YOUR_PROJECT_REF",
         "--access-token=YOUR_NEW_PAT"
       ]
     }
   }
   ```

3. **Reiniciar Claude Desktop**

4. **Verificar:**
   ```bash
   # Test inmediato
   supabase:list_tables
   ```

**Lecciones aprendidas:**
- Leer logs COMPLETOS (timestamp crítico)
- Separar síntomas de root cause
- PAT con NEVER expiration para proyectos dev
- `--access-token` en args (no env variables)

---

#### Migration Conflicts
**Síntomas:**
- Migration falla al aplicar
- Error: "relation already exists"
- Inconsistencia entre local y remoto

**Diagnóstico:**
```bash
# Ver migrations aplicadas
supabase migration list

# Ver diferencias
supabase db diff

# Status actual
supabase db status
```

**Soluciones:**
```bash
# Reset completo (DESARROLLO SOLO)
supabase db reset

# Aplicar migrations específicas
supabase db push --include-all

# Crear migration desde diferencias
supabase db diff -f nombre_migration
```

---

### 📅 Scheduling y Disponibilidad

#### Slots No Disponibles Después de Reserva Corta
**Bug histórico (26 Oct 2025):**

**Problema:** Sistema no generaba slots disponibles después de reserva corta
- Horario: 14:00-20:00
- Reserva: 14:00-14:30 (30 min)
- Siguiente disponible mostraba: 16:00
- Debería mostrar: 14:30

**Root cause:**
```typescript
// Bug en availability.ts línea 115-118
if ((minutoActual - inicioIntervalo) % duracionTotal !== 0) {
    continue; // ❌ Rechazaba slots no alineados con apertura
}
```

**Fix implementado:** Algoritmo de "gaps dinámicos"
1. Calcular huecos libres entre reservas
2. Generar slots SOLO en huecos disponibles
3. Filtrar por hora actual solo al final

**Archivos modificados:**
- `utils/availability.ts` - Nueva función `calcularHuecosLibres()`
- Stored procedure `create_booking_safe()` - Prevención concurrencia

---

#### Horarios Cruzando Medianoche
**Problema (8 Nov 2025):**
Negocios nocturnos (22:00-02:00) no generaban slots correctamente

**Soluciones intentadas:**
1. **Toggle "Modo Medianoche"** - IMPLEMENTADO LUEGO ROLLBACK
   - Agregó complejidad significativa (5 hot fixes)
   - Multiplicó surface de testing
   - No sostenible para tamaño de equipo

2. **Enfoque actual recomendado:** Múltiples intervalos
   ```
   Intervalo 1: 22:00-00:00
   Intervalo 2: 00:00-02:00
   ```

**Status actual:** Feature en rollback, usar múltiples intervalos

**Lecciones aprendidas:**
- Complejidad gates: stop after 2nd HOT FIX
- Staging mandatory para DB schema changes
- Educación admin vs engineering complexity

---

### 🎨 Frontend y UX

#### Autocomplete Reset Behavior
**Bug conocido (31 Oct 2025):**

**Síntomas:**
- Cliente seleccionado en autocomplete se resetea
- Requiere re-selección

**Root cause:**
```typescript
// State conflict en ClientSearchInput
const handleClientSelect = (client) => {
  setSelectedClient(client);
  // ❌ Falta: setQuery(client.name); 
  // ❌ Falta: setIsOpen(false);
  onClientSelect(client);
};
```

**Fix pendiente:**
```typescript
const handleClientSelect = (client) => {
  setSelectedClient(client);
  setQuery(client.name); // ← ADD
  setIsOpen(false);      // ← ADD
  onClientSelect(client);
};
```

**Prioridad:** P2 (Medium)  
**Effort:** 15-30 minutos

---

#### Header +Reserva No Guarda en DB
**Bug crítico resuelto (6 Nov 2025):**

**Síntomas:**
- Modal se abría correctamente
- Form completado
- No guardaba en base de datos

**Root cause:**
```typescript
// AdminView.tsx
const handleAddBooking = () => {
  console.log('Booking saved'); // ❌ Placeholder, no persistence
};
```

**Fix aplicado:**
```typescript
// Import statements agregados
import { useBusinessDispatch } from '../../context/BusinessContext';
import { Booking } from '../../types';

// Handler con backend integration
const handleAddBooking = async (bookingData: Partial<Booking>) => {
  dispatch({ type: 'CREATE_BOOKING', payload: bookingData });
};

// Wiring correcto
<ManualBookingModal onSave={handleAddBooking} />
```

---

### 🔄 Deployment y Build

#### Build Errors - TypeScript Compilation
**Síntomas:**
```bash
Error: TypeScript compilation failed
Type 'X' is not assignable to type 'Y'
```

**Diagnóstico:**
```bash
# Check locally
npm run type-check

# Ver errores específicos
npm run build 2>&1 | grep "error TS"
```

**Soluciones comunes:**
- Missing type imports
- Interface mismatch con Supabase types
- Regenerar types: `supabase gen types typescript`

---

#### Out of Memory During Build
**Síntomas:**
```bash
JavaScript heap out of memory
FATAL ERROR: Reached heap limit
```

**Fix:**
```json
// package.json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"
  }
}
```

---

#### DNS No Resuelve
**Síntomas:**
- Dominio no carga
- SSL certificate error
- "Your connection is not private"

**Diagnóstico:**
```bash
# Check DNS propagation
dig astraturnos.com
nslookup astraturnos.com

# Verify nameservers
dig astraturnos.com NS

# Expected:
# ns1.vercel-dns.com
# ns2.vercel-dns.com
```

**Soluciones:**
- **DNS no propagado:** Esperar 24-48 hrs
- **Nameservers incorrectos:** Verificar en Namecheap
- **SSL error:** Vercel Dashboard → Domains → Refresh Certificate

---

## FIXES HISTÓRICOS DOCUMENTADOS

### Mock Backend Regression (26 Oct 2025)
**Problema:** Tests E2E con `devMock=1` fallaban

**Root cause:** `BusinessContext.tsx` siempre llamaba Supabase, ignorando flag

**Fix:**
```typescript
case 'CREATE_BOOKING':
    if (devMock) {
        const updated = await backend.createBookingSafe(bookingData);
        dispatch({ type: 'UPDATE_BUSINESS', payload: updated });
    } else {
        await createBookingSafe(bookingData);
        const updated = await backend.getBusinessData();
        dispatch({ type: 'UPDATE_BUSINESS', payload: updated });
    }
    break;
```

---

### Error Messages en Inglés (26 Oct 2025)
**Problema:** Usuarios veían errores en inglés

**Fix:** Diccionario de traducciones
```typescript
const ERROR_TRANSLATIONS: Record<string, string> = {
  'Employee already has booking at this time': 
    'El empleado ya tiene una reserva en este horario',
  'Slot overlaps': 
    'Este horario se superpone con otra reserva existente',
  // ... más traducciones
};
```

**Archivos:** `api.ts`, `supabaseBackend.ts`

---

### Íconos de Categorías No Visibles (2 Nov 2025)
**Problema:** Edge Function no retornaba campo `icon`

**Root cause:** Query SELECT no incluía columna

**Fix:**
```typescript
// Edge Function v13
const { data: services } = await supabase
  .from('services')
  .select(`
    *,
    service_categories!inner (
      categories (
        id,
        name,
        icon  // ← AGREGADO
      )
    )
  `)
```

**Resultado:** Redeploy Edge Function → íconos visibles

---

### useBusinessState en Vista Pública (2 Nov 2025)
**Problema:** `ServiceSelector` usaba hook no disponible en `PublicClientLoader`

**Fix:** Categories como prop opcional + fallback
```typescript
interface ServiceSelectorProps {
  categories?: Category[]; // ← Opcional
  // ...
}

// Fallback cuando no hay categories
const groupedServices = categories 
  ? groupByCategories(services, categories)
  : { 'Sin categoría': services };
```

---

### Fix: Reservas Canceladas Bloquean Slots (28 Nov 2025)
**Síntomas:**
Los usuarios no podían reservar en un slot si una reserva anterior había sido cancelada (`status: 'cancelled'`). El calendario lo mostraba ocupado.

**Causa Raíz:**
Lógica de filtro incompleta en dos capas:
1.  **Backend (Supabase/Claude Desktop):** La función `create_booking_safe` solo filtraba por `archived = false`, ignorando el `status`.
2.  **Frontend (VSCode Agent):** `services/api.ts` incluía los bookings cancelados en la lista de slots ocupados.

**Solución (Doble Capa):**
1.  **DB Fix (Claude Desktop):** Migración para actualizar `create_booking_safe` con la condición **`AND status != 'cancelled'`**. (También se aprovechó para corregir la *signature* de la función incluyendo `p_client_id` y `p_client_email`).
2.  **Frontend Fix (VSCode Agent):** Se añadieron filtros `&& booking.status !== 'cancelled'` en `getAvailableSlots` y `findAvailableEmployeeForSlot` dentro de `services/api.ts`.

**Severidad:** P1 (Bloqueo de Revenue).

---

## ISSUES CONOCIDOS

### Technical Debt Registrado

#### P1 - Alta Prioridad

**Loading States Faltantes**
- **Issue:** Botones sin feedback visual durante operaciones async
- **Impact:** Usuarios clickean múltiples veces, confusión
- **Files:** Múltiples componentes
- **Effort:** 2-3 horas audit + implementation

**Unit Testing Coverage**
- **Missing tests:** `ClientSearchInput`, `ClientFormModal`, `ClientList`
- **Impact:** CI/CD sin cobertura completa
- **Effort:** 2-3 horas

#### P2 - Media Prioridad

**Accessibility Pass**
- **Issue:** Missing aria-labels en varios componentes
- **Standard:** WCAG 2.1 AA compliance
- **Effort:** 45-60 minutos

**Code Duplication**
- **Issue:** Lógica de cliente management duplicada en 3 componentes
- **Solution:** Custom hook `useClientManagement`
- **Effort:** 90-120 minutos

#### P3 - Baja Prioridad

**Email Validation Enhancement**
- **Current:** Basic `email.includes('@')`
- **Target:** Robust regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Effort:** 15 minutos

**Backup Tables sin RLS**
- **Issue:** 5 backup tables sin Row Level Security
- **Risk:** Teórico (no usado por app)
- **Fix:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

---

### Bugs Reportados sin Fix

**ASTRA-CLIENT-001:** Autocomplete reset behavior (ver arriba)

**ASTRA-PERF-001:** Bundle size optimization
- **Current:** 572 kB (gzipped 169 kB)
- **Target:** <500 kB
- **Actions:** Lazy loading, code splitting, tree shaking

---

## PROCEDIMIENTOS DE EMERGENCIA

### Rollback Rápido (<5 minutos)

**Síntomas que requieren rollback:**
- Build failure en producción
- Bug crítico reportado por múltiples usuarios
- Database corruption detectada
- Security vulnerability

**Procedimiento:**
```bash
# 1. Vercel Dashboard → Deployments
# 2. Identificar último deployment estable
# 3. Click "Rollback to this Deployment"
# 4. Verificar astraturnos.com carga correctamente
# 5. Notificar equipo si hubo downtime
```

---

### Database Corruption

**Síntomas:**
- Queries retornan data inconsistente
- Integrity constraints failing
- Duplicate records

**Procedimiento:**
```sql
-- 1. STOP writes (deshabilitar public booking form)

-- 2. Assess damage
SELECT COUNT(*) FROM bookings WHERE id IS NULL;
SELECT * FROM bookings WHERE created_at > updated_at;

-- 3. Restore from backup
TRUNCATE affected_table;
INSERT INTO affected_table SELECT * FROM backup_table;

-- 4. Verify integrity
SELECT COUNT(*) FROM affected_table;

-- 5. Re-enable writes
```

---

### Supabase Outage

**Síntomas:**
- All API calls failing
- Auth not working
- Database unreachable

**Procedimiento:**
1. Check [Supabase Status Page](https://status.supabase.com)
2. Si planned maintenance → Wait
3. Si unplanned → Contact Supabase support
4. Comunicar a usuarios via banner/email
5. Monitorear recovery

---

## LOGS Y DIAGNÓSTICO

### Supabase Logs

**Ubicación:** Dashboard → Logs

**Tipos de logs:**
- **API:** Request/response para debug API calls
- **Postgres:** Database queries y errors
- **Auth:** Login attempts, password resets
- **Realtime:** Subscriptions (si usado)

**Filtros útiles:**
```
# Errores recientes
level:error timestamp>2h

# Queries lentas
type:postgres duration>1000

# Failed auth
type:auth status:error

# Usuario específico
user_id:xxx
```

---

### Vercel Logs

**Ubicación:** Dashboard → Deployments → [Deployment] → Logs

**Buscar por:**
- Build errors
- Runtime errors
- Function timeouts
- 404s frecuentes

---

### Browser Console

**Errores comunes:**

**CORS Error:**
```
Access to fetch blocked by CORS policy
```
→ Verificar Supabase CORS settings

**Failed to fetch:**
```
TypeError: Failed to fetch
```
→ Network issue o API down

**Supabase client error:**
```
Missing supabaseUrl or supabaseKey
```
→ Check environment variables

---

### Performance Profiling

**Chrome DevTools:**
```
1. Network tab → Identify slow resources
2. Performance tab → Record interaction
3. Lighthouse → Run audit
```

**Optimization checklist:**
- [ ] Lazy load routes
- [ ] Optimize images (WebP, lazy loading)
- [ ] Code splitting
- [ ] Cache static assets
- [ ] Reduce font families

---

## CHECKLIST DIAGNÓSTICO GENERAL

Cuando algo falla, seguir este proceso:

### 1. Replicar el problema
- [ ] Reproducir en ambiente local
- [ ] Reproducir en staging
- [ ] Confirmar en producción

### 2. Aislar la causa
- [ ] Check recent deployments
- [ ] Review recent migrations
- [ ] Check external dependencies (Supabase status)
- [ ] Review logs

### 3. Identificar severidad
- [ ] **P0 (Crítico):** Usuarios no pueden usar sistema
- [ ] **P1 (Alto):** Feature principal rota
- [ ] **P2 (Medio):** Feature secundaria afectada
- [ ] **P3 (Bajo):** Cosmético o edge case

### 4. Aplicar fix
- [ ] Desarrollar en branch
- [ ] Test localmente
- [ ] Deploy a staging
- [ ] Validate fix
- [ ] Deploy a producción

### 5. Documentar
- [ ] Agregar entry a este documento
- [ ] Actualizar tests si aplica
- [ ] Comunicar a equipo

---

## CONTACTOS Y RECURSOS

**Soporte técnico:**
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support

**Documentación:**
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev

**Community:**
- Supabase Discord
- Vercel Community

---

**Última actualización:** 21 Noviembre 2025  
**Mantenido por:** Claude (Arquitecto ASTRA)  
**Contribuciones:** Reportar issues vía Git o documentar fixes directamente
