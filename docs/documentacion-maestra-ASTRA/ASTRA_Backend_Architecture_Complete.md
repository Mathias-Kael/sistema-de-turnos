# ASTRA Backend Architecture Complete

**Última actualización:** 8 Diciembre 2025  
**Autor:** Claude 4.5 Opus (Strategic Architect)  
**Proyecto:** ASTRA Multi-tenant SaaS - astraturnos.com

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| Tablas activas | 9 |
| Tablas backup | 4 |
| Edge Functions | 8 |
| Migraciones | 22 |
| Policies RLS | 31 |
| Índices | 28 |

### Datos Producción

| Tabla | Registros |
|-------|-----------|
| businesses | 9 |
| employees | 26 |
| services | 58 |
| bookings | 335 |
| clients | 48 |
| categories | 16 |
| service_employees | 72 |
| booking_services | 296 |
| service_categories | 49 |

---

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                  │
│                   (React + TypeScript)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                        │
│                    astraturnos.com (CDN)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌────────────────────┐ ┌────────────┐ ┌────────────────────┐
│   Supabase Auth    │ │   Edge     │ │   Supabase         │
│   (JWT + OAuth)    │ │   Functions│ │   Storage          │
└────────────────────┘ └────────────┘ └────────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL + RLS                              │
│               (Supabase Cloud - South America)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

**Admin (Autenticado):**
```
Admin → JWT Auth → Edge Functions (con RLS) → PostgreSQL
```

**Cliente Público:**
```
Cliente → share_token → validate-public-token → Service Role → PostgreSQL
```

---

## 📁 DATABASE SCHEMA

### Diagrama Entidad-Relación

```
┌──────────────────┐
│   auth.users     │
│   (Supabase)     │
└────────┬─────────┘
         │ owner_id
         ▼
┌──────────────────┐       ┌──────────────────┐
│    businesses    │───────│     clients      │
│  (9 registros)   │       │  (48 registros)  │
└────────┬─────────┘       └──────────────────┘
         │
    ┌────┴────┬─────────────┬───────────────┐
    ▼         ▼             ▼               ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│employees│ │services│ │bookings  │ │ categories   │
│  (26)   │ │  (58)  │ │  (335)   │ │    (16)      │
└────┬────┘ └───┬────┘ └────┬─────┘ └──────┬───────┘
     │          │           │              │
     │          │           │              │
     └────┬─────┘           │              │
          ▼                 │              │
   ┌──────────────┐         │              │
   │service_      │         │              │
   │employees (72)│         │              │
   └──────────────┘         │              │
          │                 │              │
          │                 ▼              │
          │         ┌──────────────┐       │
          │         │booking_      │       │
          │         │services (296)│       │
          │         └──────────────┘       │
          │                                │
          │                                ▼
          │                       ┌──────────────┐
          │                       │service_      │
          └───────────────────────│categories(49)│
                                  └──────────────┘
```

### Tablas Core

#### businesses (9 rows)
```sql
id                    UUID PRIMARY KEY
name                  TEXT NOT NULL
description           TEXT
phone                 TEXT
whatsapp              TEXT              -- WhatsApp con formato internacional
instagram             TEXT              -- Username sin @
facebook              TEXT              -- Nombre de página
profile_image_url     TEXT
cover_image_url       TEXT
branding              JSONB             -- {font, textColor, primaryColor, secondaryColor}
hours                 JSONB             -- Horarios por día
status                TEXT              -- active | closed
share_token           TEXT UNIQUE       -- Token para booking público
share_token_status    TEXT              -- active | paused | revoked
share_token_expires_at TIMESTAMPTZ
owner_id              UUID → auth.users -- Dueño del negocio
payment_alias         TEXT              -- Alias Mercado Pago
payment_cbu           TEXT              -- CBU bancario
deposit_info          TEXT              -- Instrucciones adicionales
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### employees (26 rows)
```sql
id                    UUID PRIMARY KEY
business_id           UUID → businesses
name                  TEXT NOT NULL
avatar_url            TEXT
whatsapp              TEXT
hours                 JSONB             -- Horarios individuales
archived              BOOLEAN DEFAULT false  -- Soft delete
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### services (58 rows)
```sql
id                    UUID PRIMARY KEY
business_id           UUID → businesses
name                  TEXT NOT NULL
description           TEXT
duration              INTEGER           -- Minutos
buffer                INTEGER DEFAULT 0 -- Buffer post-servicio
price                 NUMERIC
requires_deposit      BOOLEAN DEFAULT false
deposit_amount        NUMERIC           -- Monto seña específico
archived              BOOLEAN DEFAULT false
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### bookings (335 rows)
```sql
id                    UUID PRIMARY KEY
business_id           UUID → businesses
employee_id           UUID → employees
client_name           TEXT NOT NULL
client_phone          TEXT NOT NULL
booking_date          DATE
start_time            TIME
end_time              TIME
status                TEXT              -- pending | confirmed | cancelled | completed
notes                 TEXT
archived              BOOLEAN DEFAULT false
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### clients (48 rows)
```sql
id                    UUID PRIMARY KEY
business_id           UUID → businesses
name                  TEXT NOT NULL
phone                 TEXT NOT NULL     -- UNIQUE per business
email                 TEXT
notes                 TEXT
tags                  TEXT[]            -- ["VIP", "Frecuente"]
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

#### categories (16 rows)
```sql
id                    UUID PRIMARY KEY
business_id           UUID → businesses
name                  TEXT NOT NULL
icon                  TEXT DEFAULT 'sparkles'
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

### Tablas Junction (Many-to-Many)

#### service_employees (72 rows)
```sql
service_id            UUID → services
employee_id           UUID → employees
PRIMARY KEY (service_id, employee_id)
```

#### booking_services (296 rows)
```sql
booking_id            UUID → bookings
service_id            UUID → services
service_name          TEXT              -- Denormalizado para historial
service_price         NUMERIC           -- Denormalizado para historial
PRIMARY KEY (booking_id, service_id)
```

#### service_categories (49 rows)
```sql
service_id            UUID → services
category_id           UUID → categories
PRIMARY KEY (service_id, category_id)
```

---

## 🔐 ROW LEVEL SECURITY (RLS)

### Patrón Multi-tenant

Todas las tablas con RLS habilitado siguen el mismo patrón:

```sql
-- Usuarios autenticados solo ven datos de sus negocios
business_id IN (
  SELECT id FROM businesses 
  WHERE owner_id = auth.uid()
)
```

### Policies por Tabla

#### businesses
| Policy | Role | Action | Descripción |
|--------|------|--------|-------------|
| Owners can manage their businesses | authenticated | ALL | owner_id = auth.uid() |
| Owners full access businesses | authenticated | ALL | Duplicada - consolidar |
| Edge Functions can read by token | service_role | SELECT | Token validation |

#### employees, services, bookings, clients, categories
| Policy | Role | Action | Descripción |
|--------|------|--------|-------------|
| Owners can manage | authenticated | ALL | Via business ownership |
| Owners full access | authenticated | ALL | Duplicada - consolidar |
| Edge Functions can read | service_role | SELECT | Para public booking |

#### Junction Tables (service_employees, booking_services, service_categories)
| Policy | Role | Action | Descripción |
|--------|------|--------|-------------|
| Owners can manage | authenticated | ALL | Via parent table ownership |
| Owners full access | authenticated | ALL | Duplicada - consolidar |
| Edge Functions can read | service_role | SELECT | Para public booking |

**Nota:** Existen 31 policies totales. Varias tablas tienen policies duplicadas ("Owners can manage" + "Owners full access") que deberían consolidarse.

---

## ⚡ EDGE FUNCTIONS

### Catálogo de Functions

| Slug | Versión | Propósito | Auth |
|------|---------|-----------|------|
| validate-public-token | 23 | Validar share_token y retornar business data | service_role |
| public-bookings | 8 | Crear reservas desde form público | service_role |
| analytics-dashboard | 5 | Métricas de negocio | JWT |
| admin-businesses | 9 | CRUD businesses | JWT + RLS |
| admin-employees | 2 | CRUD employees | JWT + RLS |
| admin-services | 2 | CRUD services | JWT + RLS |
| admin-bookings | 2 | Update/Delete bookings | JWT + RLS |
| admin-service-employees | 2 | Gestionar asignaciones | JWT + RLS |

### validate-public-token (v23)

**Propósito:** Gateway para booking público. Valida token y retorna datos completos del negocio.

**Flujo:**
1. Recibe `{ token: string }`
2. Valida existencia y estado del token
3. Verifica expiración
4. Retorna business + employees + services + bookings + categories (transformados)

**Seguridad:**
- No requiere JWT (endpoint público)
- Usa service_role para bypass RLS
- Filtra empleados/servicios archived
- Solo retorna bookings no-archived

### public-bookings (v8)

**Propósito:** Crear reservas desde formulario público.

**Validaciones:**
1. Token válido y activo
2. Servicios existen y pertenecen al business
3. Duración calculada coincide con start/end
4. No hay overlap con bookings existentes

**Protección de Concurrencia:**
- Valida overlap en DB antes de insert
- Crea booking_services atomicamente

### analytics-dashboard (v5)

**Propósito:** Generar métricas para dashboard admin.

**Métricas:**
- Revenue por período (day/week/month)
- Top 3 servicios
- Top 5 clientes frecuentes
- Días pico
- Datos históricos opcionales

**Filtros:**
- Excluye bookings con client_name = 'BREAK'
- Solo cuenta past bookings (no futuros)
- Status: confirmed, completed, pending

---

## 🗄️ STORED PROCEDURES

### create_booking_safe

**Propósito:** Crear reservas con protección de concurrencia.

```sql
CREATE FUNCTION create_booking_safe(
  p_employee_id uuid,
  p_date date,
  p_start time,
  p_end time,
  p_client_name text,
  p_client_phone text,
  p_business_id uuid,
  p_service_ids uuid[]
) RETURNS uuid
```

**Mecanismo:**
1. Lock pesimista por empleado+fecha (`FOR UPDATE`)
2. Validación overlap excluyendo cancelled
3. Insert booking
4. Insert booking_services atomicamente

**Nota:** SECURITY DEFINER - ejecuta con permisos del creador.

### update_updated_at_column

**Propósito:** Trigger automático para `updated_at`.

Aplicado a: businesses, employees, services, bookings, clients, categories

### fn_populate_booking_services

**Propósito:** Trigger para auto-populate campos denormalizados en booking_services.

---

## 📊 ÍNDICES

### Cobertura Completa de Índices

El sistema tiene **28 índices** correctamente configurados para todas las operaciones.

#### Bookings (tabla más consultada)
```sql
idx_bookings_business              (business_id)
idx_bookings_employee              (employee_id)
idx_bookings_date                  (booking_date)
idx_bookings_status                (status)
idx_bookings_employee_date_status  (employee_id, booking_date, status)  -- Compuesto principal
```

#### Businesses
```sql
idx_businesses_owner_id            (owner_id)
idx_businesses_share_token         (share_token)
```

#### Clients
```sql
idx_clients_business               (business_id)
idx_clients_phone                  (phone)                              -- Búsqueda por teléfono
idx_clients_phone_business         (business_id, phone) UNIQUE          -- Constraint duplicados
idx_clients_name                   GIN (to_tsvector('spanish', name))   -- Full text search
```

#### Services/Employees
```sql
idx_services_business              (business_id)
idx_services_archived              (business_id, archived) WHERE archived = false
idx_employees_business             (business_id)
idx_employees_archived             (business_id, archived) WHERE archived = false
```

#### Junction Tables
```sql
idx_service_categories_service     (service_id)
idx_service_categories_category    (category_id)
-- booking_services y service_employees usan PKs compuestas
```

### Estado de Índices

✅ **Todos los índices son funcionales y necesarios:**

| Índice | Propósito | Estado |
|--------|-----------|--------|
| idx_employees_archived | Filtrar empleados archivados para soft delete | ✅ Funcional |
| idx_clients_name | Búsqueda de clientes por nombre (autocomplete) | ✅ Funcional |
| idx_clients_phone | Búsqueda de clientes por teléfono | ✅ Funcional |
| idx_bookings_employee_date_status | Query availability principal | ✅ Crítico |

**Nota:** Los advisors de Supabase pueden reportar índices como "unused" basándose en ventanas de medición cortas. Esto NO significa que sean innecesarios - están diseñados para soportar features implementadas.

---

## 🧩 EXTENSIONES POSTGRESQL

### Habilitadas

| Extensión | Versión | Propósito |
|-----------|---------|-----------|
| plpgsql | 1.0 | Lenguaje procedural |
| pgcrypto | 1.3 | Funciones criptográficas |
| uuid-ossp | 1.1 | Generación UUIDs |
| pg_graphql | 1.5.11 | Soporte GraphQL |
| pg_stat_statements | 1.11 | Tracking queries |
| supabase_vault | 0.3.1 | Secrets management |

### Disponibles (no instaladas)

- `pg_cron` - Job scheduling
- `vector` - Embeddings (para futuro AI)
- `pg_trgm` - Fuzzy search
- `postgis` - Geolocation

---

## 📜 HISTORIAL DE MIGRACIONES

| Versión | Nombre | Fecha Est. | Descripción |
|---------|--------|------------|-------------|
| 20251007090000 | enable_rls | Oct 7 | Habilitación inicial RLS |
| 20251007103000 | fix_rls_policies | Oct 7 | Correcciones policies |
| 20251008130000 | booking_services_trigger | Oct 8 | Trigger auto-populate |
| 20251009063308 | add_owner_id_to_businesses | Oct 9 | FK a auth.users |
| 20251009063331 | update_rls_policies_for_auth | Oct 9 | Policies basadas en owner |
| 20251010204643 | security_fix_rls | Oct 10 | Hardening seguridad |
| 20251010231222 | remove_public_select | Oct 10 | Eliminar acceso público |
| 20251010235050 | hardening_booking_services_trigger | Oct 10 | Robustez trigger |
| 20251011030759 | remote_sync | Oct 11 | Sync configuración |
| 20251011113829 | remove_legacy_public_policies | Oct 11 | Limpieza policies legacy |
| 20251019190811 | fix_business_creation_trigger | Oct 19 | Fix trigger creación |
| 20251019190940 | remove_auto_business_creation | Oct 19 | Eliminar auto-create |
| 20251029224347 | add_social_media_fields | Oct 29 | WhatsApp, IG, FB |
| 20251031012212 | add_soft_delete_services_employees | Oct 31 | Archived flag |
| 20251031155006 | create_clients_table | Oct 31 | Tabla clientes |
| 20251031155018 | create_clients_rls_policies | Oct 31 | RLS clientes |
| 20251031155033 | add_client_id_to_bookings | Oct 31 | FK bookings→clients |
| 20251101214141 | create_categories_table | Nov 1 | Tabla categorías |
| 20251101214150 | create_service_categories_junction | Nov 1 | Many-to-many |
| 20251101214201 | create_categories_rls_policies | Nov 1 | RLS categorías |
| 20251102015244 | add_icon_to_categories | Nov 2 | Campo icon |
| 20251203151814 | add_payment_fields_v2 | Dic 3 | Alias, CBU, deposit_info |

---

## ⚠️ ADVISORS: ISSUES ACTUALES

### 🔴 SEGURIDAD (Pendientes)

#### Tablas Backup sin RLS
**Problema:** 4 tablas de backup sin RLS (reducido de 11 tras cleanup).

**Tablas:**
- businesses_backup_20251129
- businesses_backup_20251130_before_rollback
- businesses_backup_payment_fields_20251203
- analytics_backup_20251204

**Remediación:**
```sql
-- Opción A: Habilitar RLS (nadie accede excepto service_role)
ALTER TABLE businesses_backup_20251129 ENABLE ROW LEVEL SECURITY;

-- Opción B: Eliminar cuando ya no necesarias
DROP TABLE businesses_backup_20251129;
```

#### Functions sin search_path fijo
**Problema:** 3 funciones vulnerables a search_path manipulation.

**Funciones:**
- update_updated_at_column
- fn_populate_booking_services
- create_booking_safe

**Remediación:**
```sql
ALTER FUNCTION public.update_updated_at_column()
SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_populate_booking_services()
SET search_path = public, pg_temp;

ALTER FUNCTION public.create_booking_safe(uuid, date, time, time, text, text, uuid, uuid[])
SET search_path = public, pg_temp;
```

#### Leaked Password Protection Disabled
**Problema:** No verifica contraseñas comprometidas en HaveIBeenPwned.

**Remediación:** Habilitar en Supabase Dashboard → Auth → Settings → Password Strength.

### 🟡 PERFORMANCE (Optimizaciones Opcionales)

#### RLS Policies con auth.uid() sin subquery
**Problema:** Re-evalúa auth.uid() por cada fila en tablas grandes.

**Ejemplo actual:**
```sql
owner_id = auth.uid()
```

**Optimizado:**
```sql
owner_id = (SELECT auth.uid())
```

**Impacto:** Bajo en escala actual (335 bookings). Considerar si escala a miles.

#### Duplicate Permissive Policies
**Problema:** Múltiples policies con mismo rol/acción (redundancia).

**Tablas afectadas:** businesses, employees, services, bookings, booking_services, service_employees

**Remediación:** Consolidar "Owners can manage" y "Owners full access" en una sola policy por tabla.

---

## 🔧 TROUBLESHOOTING COMÚN

### Error: "Employee already has booking at this time"
**Causa:** Slot ya ocupado por otra reserva confirmada.
**Solución:** Verificar disponibilidad antes de crear.

### Error: "Invalid token"
**Causa:** share_token inexistente, inactivo o expirado.
**Debug:**
```sql
SELECT share_token, share_token_status, share_token_expires_at 
FROM businesses 
WHERE share_token = 'TOKEN';
```

### Error: "Booking link disabled"
**Causa:** business.status != 'active' o share_token_status != 'active'.

### Error: "Service mismatch"
**Causa:** Servicio no pertenece al business del token.

### Reservas canceladas siguen bloqueando slots
**Solución:** Ya corregido en create_booking_safe con `status != 'cancelled'`.

### Datos de otro negocio visibles
**Causa:** RLS policy incorrecta o bypass accidental.
**Debug:** Verificar owner_id del business y policies aplicadas.

---

## 📋 CHECKLIST PRODUCCIÓN

### ✅ Completado (8 Dic 2025)
- [x] Cleanup 8 tablas backup obsoletas
- [x] Re-auditoría post-cleanup exitosa
- [x] Verificación integridad datos producción

### Seguridad (Pendiente)
- [ ] Habilitar RLS en 4 tablas backup restantes o eliminarlas
- [ ] Fijar search_path en 3 stored procedures
- [ ] Habilitar leaked password protection
- [ ] Consolidar policies duplicadas

### Performance (Opcional)
- [ ] Optimizar policies con (SELECT auth.uid()) cuando escale
- [ ] Monitorear pg_stat_statements

### Mantenimiento
- [ ] Documentar nuevas migraciones
- [ ] Backup periódico automatizado

---

## 📚 REFERENCIAS

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Edge Functions](https://supabase.com/docs/guides/functions)

---

## 📝 CHANGELOG DOCUMENTO

| Fecha | Cambios |
|-------|---------|
| 5 Dic 2025 | Versión inicial - Auditoría completa |
| 8 Dic 2025 | Post-cleanup: Actualizado conteo tablas (13 vs 20), corrección sección índices, eliminada recomendación incorrecta de eliminar índices "unused" |

---

**Documento generado por auditoría automatizada**  
**Próxima revisión recomendada:** Post-implementación security fixes
