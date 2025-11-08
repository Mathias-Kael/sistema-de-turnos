# ASTRA - Fix Horarios Medianoche: Implementación Completa

**Fecha:** 7 Noviembre 2025  
**Feature:** Soporte horarios que cruzan medianoche (ej: 22:00-02:00)  
**Estrategia:** Columna `crosses_midnight` + lógica aplicación  
**Responsable:** Claude 4.5 Sonnet (DB + Strategy)  
**Prioridad:** P1 - Market blocker (canchas, bares, gimnasios 24h)

---

## 🎯 PROBLEMA Y SOLUCIÓN

### **Problem Statement**
Sistema actual falla con horarios tipo `22:00-02:00` porque `start_time > end_time`

**Mercados bloqueados:**
- Canchas: 20:00-02:00 
- Bares/Boliches: 22:00-06:00
- Gimnasios 24h: 06:00-22:00 del día siguiente
- **Impact:** ~25% market expansion perdida

### **Solución Arquitectónica**
**Approach:** Detección automática + flag explícito en DB

1. **Admin UX:** Sin cambios - configura "22:00 - 02:00" normal
2. **DB:** Column `crosses_midnight BOOLEAN` para optimización
3. **App Logic:** Auto-detección + generación slots divididos
4. **UX Enhancement:** Modal confirmación para prevenir errores

---

## 🗄️ CAMBIOS BASE DE DATOS

### **Estado Actual (Pre-Implementation)**
```sql
-- Horarios almacenados en JSONB
businesses: work_hours JSONB
employees: work_hours JSONB

-- Ejemplo estructura actual:
{
  "monday": [{"open": "09:00", "close": "17:00"}],
  "tuesday": [{"open": "09:00", "close": "17:00"}]
}
```

### **Modificaciones Requeridas**

#### 1. Agregar Column a `businesses`
```sql
ALTER TABLE businesses 
ADD COLUMN crosses_midnight_business BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN businesses.crosses_midnight_business IS 
'Auto-detecta si algún horario del negocio cruza medianoche (22:00-02:00)';
```

#### 2. Agregar Column a `employees`
```sql
ALTER TABLE employees 
ADD COLUMN crosses_midnight_employee BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN employees.crosses_midnight_employee IS 
'Auto-detecta si algún horario del empleado cruza medianoche';
```

#### 3. Índices para Performance
```sql
-- Optimización queries "negocios abiertos ahora"
CREATE INDEX idx_businesses_crosses_midnight 
ON businesses(crosses_midnight_business) 
WHERE crosses_midnight_business = TRUE;

CREATE INDEX idx_employees_crosses_midnight 
ON employees(crosses_midnight_employee) 
WHERE crosses_midnight_employee = TRUE;
```

---

## 🛡️ PLAN DE SEGURIDAD Y ROLLBACK

### **Fase 0: Backup Completo (OBLIGATORIO)**
```sql
-- 1. Backup tabla businesses
CREATE TABLE businesses_backup_20251107_midnight AS 
SELECT * FROM businesses;

-- 2. Backup tabla employees  
CREATE TABLE employees_backup_20251107_midnight AS 
SELECT * FROM employees;

-- 3. Verificación backup
SELECT 
  (SELECT COUNT(*) FROM businesses) as businesses_orig,
  (SELECT COUNT(*) FROM businesses_backup_20251107_midnight) as businesses_backup,
  (SELECT COUNT(*) FROM employees) as employees_orig,
  (SELECT COUNT(*) FROM employees_backup_20251107_midnight) as employees_backup;
-- ✅ Deben ser iguales
```

### **Rollback Plans por Fase**

#### Rollback Fase 1 (Agregar columnas)
```sql
-- EMERGENCY ROLLBACK - Eliminar columnas agregadas
ALTER TABLE businesses DROP COLUMN crosses_midnight_business;
ALTER TABLE employees DROP COLUMN crosses_midnight_employee;

-- Verificar estructura restaurada
\d businesses;
\d employees;
```

#### Rollback Fase 2 (Lógica aplicación)
```bash
# Git rollback - código frontend
git revert <commit-hash-midnight-logic>
git push origin main

# Re-deploy automático via Vercel
```

#### Rollback Fase 3 (Población datos)
```sql
-- Reset columnas a DEFAULT FALSE
UPDATE businesses SET crosses_midnight_business = FALSE;
UPDATE employees SET crosses_midnight_employee = FALSE;
```

#### Rollback Completo (Disaster Recovery)
```sql
-- ÚLTIMO RECURSO: Restaurar desde backup
DROP TABLE businesses;
DROP TABLE employees;

-- Recrear desde backup
CREATE TABLE businesses AS SELECT * FROM businesses_backup_20251107_midnight;
CREATE TABLE employees AS SELECT * FROM employees_backup_20251107_midnight;

-- Recrear foreign keys y constraints
-- (Ver script de recreación completa)
```

---

## 🔄 PLAN DE IMPLEMENTACIÓN STEP-BY-STEP

### **Fase 1: Database Changes (5-10 min)**
**Objetivo:** Agregar columnas sin impactar funcionamiento actual

**Steps:**
1. ✅ Backup completo (verificado)
2. 🔄 ADD COLUMN businesses (DEFAULT FALSE)
3. 🔄 ADD COLUMN employees (DEFAULT FALSE)  
4. ✅ Verificar app sigue funcionando normal
5. 🔄 CREATE INDEX para optimización

**Success Criteria:**
- App funciona exactamente igual que antes
- Columnas nuevas = FALSE para todos los registros
- Zero downtime user-facing

**Rollback:** DROP COLUMN si hay problemas

### **Fase 2: Frontend Logic (30-45 min)**
**Objetivo:** Lógica detección + generación slots

**Files to modify:**
- `utils/availability.ts` - Detección + slot generation
- Modal confirmation component - UX enhancement
- Business/Employee forms - Auto-population lógica

**Logic Core:**
```typescript
// Auto-detection
function detectsCrossesMidnight(workHours: WorkHours): boolean {
  return workHours.some(interval => 
    timeToMinutes(interval.open) > timeToMinutes(interval.close)
  );
}

// Slot generation dividido
function generateSlotsAcrossMidnight(interval, duration) {
  // Segment 1: start-23:59
  // Segment 2: 00:00-end
  return [...segment1Slots, ...segment2Slots];
}
```

**Rollback:** Git revert específico

### **Fase 3: Data Population (10-15 min)**
**Objetivo:** Populate columnas para horarios existentes que cruzan medianoche

```sql
-- Update businesses con horarios medianoche
UPDATE businesses 
SET crosses_midnight_business = TRUE
WHERE work_hours::text ~ '(2[0-3]|[0-1][0-9]):[0-5][0-9].*close.*0[0-9]:[0-5][0-9]';

-- Update employees con horarios medianoche  
UPDATE employees 
SET crosses_midnight_employee = TRUE
WHERE work_hours::text ~ '(2[0-3]|[0-1][0-9]):[0-5][0-9].*close.*0[0-9]:[0-5][0-9]';
```

**Rollback:** Reset a FALSE

### **Fase 4: Testing & Validation (15 min)**
**Objetivo:** Validar funcionalidad end-to-end

**Test Cases:**
1. ✅ Configurar horario normal (9-17) → funciona igual
2. ✅ Configurar horario medianoche (22-02) → modal confirmación
3. ✅ Generar slots medianoche → lista continua correcta
4. ✅ Validar "abierto ahora" logic → 01:30 = abierto si 22-06
5. ✅ Performance test → no degradación notable

---

## 🎨 UX ENHANCEMENT: MODAL CONFIRMACIÓN

### **Trigger:** Admin configura start_time > end_time

```
┌─────────────────────────────────────────┐
│ ⚠️  Horario detectado cruza medianoche   │
├─────────────────────────────────────────┤
│                                         │
│ Configuraste: 22:00 - 02:00            │
│                                         │
│ Esto significa:                         │
│ • Abierto 4 horas (22:00-02:00)        │
│ • Cruza al día siguiente                │
│ • Clientes pueden reservar madrugada    │
│                                         │
│ ¿Es correcto?                           │
│                                         │
│ [Sí, abierto hasta madrugada] [Corregir]│
└─────────────────────────────────────────┘
```

**Previene:**
- Error típico: Admin quería 09:00-14:00 pero puso 02:00
- Confirma intención real vs accidente
- Explica consecuencias claramente

---

## 📊 MÉTRICAS Y MONITOREO

### **KPIs de Éxito**
```sql
-- Performance: Tiempo respuesta availability queries
SELECT AVG(duration_ms) FROM availability_query_logs 
WHERE query_type = 'midnight_crossing';

-- Adoption: Negocios usando horarios medianoche
SELECT COUNT(*) FROM businesses 
WHERE crosses_midnight_business = TRUE;

-- Errors: Overlaps o double bookings
SELECT COUNT(*) FROM bookings b1
JOIN bookings b2 ON b1.employee_id = b2.employee_id 
WHERE b1.id != b2.id 
AND (b1.start_time, b1.end_time) OVERLAPS (b2.start_time, b2.end_time);
```

### **Alertas Críticas**
- Double bookings detectados
- Queries availability > 500ms
- Modal "cruza medianoche" rechazado > 30% (UX problem)

---

## 🚦 GATES DE DECISIÓN

**Post-Fase 1:**
- ✅ App funciona normal → Continuar Fase 2
- ❌ Error detectado → Rollback inmediato

**Post-Fase 2:**
- ✅ Logic tests passing → Continuar Fase 3  
- ❌ Logic bugs → Fix code, no DB rollback needed

**Post-Fase 3:**
- ✅ Data populated correctly → Proceder testing
- ❌ Data inconsistency → Reset columns, investigate

**Final Go/No-Go:**
- ✅ E2E tests passing → Merge to production
- ❌ Any critical issue → Full rollback plan

---

## 🎯 DIFERENCIADOR DE MERCADO

**Marketing Impact:**
> "Únicos en el mercado con soporte real para horarios nocturnos.
> 
> Mientras la competencia dice 'no soportamos 24h', ASTRA Turnos permite:
> - Canchas hasta las 2 AM
> - Bares con horario completo nocturno  
> - Gimnasios 24/7 sin restricciones técnicas
> 
> Tu negocio no tiene que adaptarse a limitaciones del software."

**Competitive Edge:** Funcionalidad NO disponible en competidores directos.

---

## ⏱️ TIMELINE ESTIMADO

| Fase | Duración | Agente | Risk Level |
|------|----------|--------|------------|
| 0: Backup | 5 min | Claude | 🟢 Low |
| 1: DB Changes | 10 min | Claude | 🟡 Medium |
| 2: Frontend Logic | 45 min | ChatGPT 5 | 🟢 Low |
| 3: Data Population | 15 min | Claude | 🟡 Medium |
| 4: Testing | 15 min | ChatGPT 5 | 🟢 Low |
| **TOTAL** | **90 min** | | |

**Critical Path:** Fase 1 (DB) es blocker para el resto

---

## ✅ PRERREQUISITOS PARA PROCEDER

1. ✅ Documentación completa (este documento)
2. 🔄 Acceso Claude a Supabase DB
3. 🔄 Backup verification successful  
4. ✅ Rollback plans definidos
5. ✅ Success criteria claros
6. 🔄 Matías approval final

---

## 📞 NEXT STEPS

**Comando para continuar:**
> "Claude, procede con Fase 0: Backup. Verifica acceso Supabase primero."

**Documentos relacionados:**
- `ASTRA_Roadmap_Priorizado_Final_07Nov2025.md` - Context general
- Conversación chat anterior - Análisis inicial problema

---

*Documentación creada: 7 Nov 2025 - PRE-IMPLEMENTATION*  
*Status: 📋 PLAN COMPLETE - PENDING SUPABASE ACCESS*  
*Próxima acción: Configurar acceso DB + ejecutar Fase 0*
