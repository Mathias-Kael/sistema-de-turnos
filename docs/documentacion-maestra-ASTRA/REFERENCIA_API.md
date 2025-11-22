# REFERENCIA API - ASTRA

**Sistema de Gestión de Turnos Multi-tenant SaaS**  
**Última actualización:** 21 Noviembre 2025

---

## 📋 ÍNDICE

1. [Edge Functions](#edge-functions)
2. [Stored Procedures](#stored-procedures)
3. [Client Query Patterns](#client-query-patterns)
4. [Autenticación y Seguridad](#autenticación-y-seguridad)
5. [Rate Limiting y Protecciones](#rate-limiting-y-protecciones)
6. [Manejo de Errores](#manejo-de-errores)

---

## EDGE FUNCTIONS

### Resumen de Functions

| Function | Auth | Propósito | Status |
|----------|------|-----------|--------|
| `validate-public-token` | No JWT | Validar share token y retornar el estado completo del negocio (servicios, empleados, etc.). | ✅ Active |
| `public-bookings` | No JWT | Crear una nueva reserva desde la vista pública. | ✅ Active |
| `admin-businesses` | JWT | Actualizar los datos del negocio (nombre, branding, horarios). | ✅ Active |
| `admin-employees` | JWT | CRUD para los empleados de un negocio. | ✅ Active |
| `admin-services` | JWT | CRUD para los servicios de un negocio. | ✅ Active |
| `admin-service-employees` | JWT | Actualizar la asignación de empleados a un servicio. | ✅ Active |
| `admin-bookings` | JWT | Actualizar o eliminar una reserva existente. | ✅ Active |

---

### 1. validate-public-token

**Propósito:** Validar share token y retornar data completa del negocio para vista pública.

**Endpoint:** `POST /functions/v1/validate-public-token`

**Autenticación:** ❌ No requiere JWT (acceso público)

**Request:**
```typescript
{
  token: string  // Share token del negocio
}
```

**Response Success (200):**
```typescript
{
  data: {
    business: {
      id: string;
      name: string;
      description: string;
      phone: string;
      whatsapp?: string;
      instagram?: string;
      facebook?: string;
      profileImageUrl: string | null;
      coverImageUrl: string | null;
      branding: {
        font: string;
        textColor: string;
        primaryColor: string;
        secondaryColor: string;
      };
      hours: {
        monday: { enabled: boolean; start: string; end: string };
        tuesday: { enabled: boolean; start: string; end: string };
        // ... resto días
      };
      shareToken: string;
      shareTokenStatus: 'active' | 'paused' | 'revoked';
      shareTokenExpiresAt: string | null;
      
      employees: Array<{
        id: string;
        businessId: string;
        name: string;
        avatarUrl: string;
        whatsapp: string | null;
        hours: object;
      }>;
      
      services: Array<{
        id: string;
        businessId: string;
        name: string;
        description: string;
        duration: number;  // minutos
        buffer: number;    // minutos
        price: number;
        requiresDeposit: boolean;
        employeeIds: string[];
        categoryIds?: string[];
      }>;
      
      categories: Array<{
        id: string;
        businessId: string;
        name: string;
        icon?: string;
        createdAt: string;
        updatedAt: string;
      }>;
      
      bookings: Array<{
        id: string;
        businessId: string;
        employeeId: string;
        client: {
          name: string;
          email: string | null;
          phone: string;
        };
        date: string;     // YYYY-MM-DD
        start: string;    // HH:mm
        end: string;      // HH:mm
        status: string;
        notes: string | null;
        services: Array<{
          id: string;
          name: string;
          price: number;
        }>;
      }>;
    }
  }
}
```

**Response Errors:**
```typescript
// 400 Bad Request
{ error: "Missing token" }

// 401 Unauthorized
{ error: "Invalid token" }
{ error: "Booking link disabled" }
{ error: "Booking link expired" }

// 500 Internal Server Error
{ error: "Internal server error" }
```

**Validaciones:**
1. Token existe y es string
2. Business encontrado con ese token
3. Business status = 'active'
4. share_token_status = 'active'
5. Si hay `share_token_expires_at`, verificar no expirado

**Queries ejecutadas:**
```sql
-- 1. Business lookup
SELECT * FROM businesses 
WHERE share_token = ? 
  AND status = 'active'
LIMIT 1;

-- 2. Employees (no archived)
SELECT * FROM employees 
WHERE business_id = ? 
  AND archived = false;

-- 3. Services (no archived)
SELECT * FROM services 
WHERE business_id = ? 
  AND archived = false;

-- 4. Bookings (no archived)
SELECT * FROM bookings 
WHERE business_id = ?;

-- 5. Service-Employee relations
SELECT * FROM service_employees 
WHERE service_id IN (...);

-- 6. Service-Category relations
SELECT * FROM service_categories 
WHERE service_id IN (...);

-- 7. Booking-Services
SELECT * FROM booking_services 
WHERE booking_id IN (...);

-- 8. Categories
SELECT * FROM categories 
WHERE business_id = ?;
```

**Performance:**
- Parallel queries usando `Promise.all()`
- Típicamente 8 queries en ~50-100ms
- Transform data server-side (camelCase)

**Ejemplo uso:**
```typescript
const response = await fetch(
  'https://<project>.supabase.co/functions/v1/validate-public-token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'abc-123-xyz' })
  }
);

const { data } = await response.json();
const business = data.business;
```

---

### 2. public-bookings

**Propósito:** Crear reserva pública sin autenticación usando share token.

**Endpoint:** `POST /functions/v1/public-bookings`

**Autenticación:** ❌ No requiere JWT (validación por token)

**Request:**
```typescript
{
  token: string;              // Share token del negocio
  services: Array<{
    id: string;               // Service ID
  }>;
  employeeId: string;
  date: string;               // YYYY-MM-DD
  start: string;              // HH:mm
  end: string;                // HH:mm
  client: {
    name: string;
    phone: string;
    email?: string;
    id?: string; // Opcional, para vincular a un cliente existente
  };
  notes?: string;
}
```

**Response Success (200):**
```typescript
{
  data: {
    id: string  // Booking ID creado
  }
}
```

**Response Errors:**
```typescript
// 400 Bad Request
{ error: "Missing token" }
{ error: "Missing services" }
{ error: "Invalid date" }
{ error: "Invalid time" }
{ error: "Missing client info" }
{ error: "Missing employeeId" }
{ error: "Invalid token" }
{ error: "Booking disabled" }
{ error: "Token expired" }
{ error: "Service lookup failed" }
{ error: "Some services not found" }
{ error: "Service mismatch" }
{ error: "Duration mismatch" }
{ error: "Slot no longer available" }
{ error: "Insert failed" }
// NOTA: La implementación real devuelve estos errores como un string genérico en un objeto de error.
// { "error": "El mensaje de error específico" }
```

**Validaciones:**

**1. Request validation:**
```typescript
// Token presente
if (!body.token) throw new Error('Missing token');

// Al menos un servicio
if (!body.services?.length) throw new Error('Missing services');

// Formato fecha válido
if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) throw new Error('Invalid date');

// Formato tiempo válido
if (!/^([0-1]\d|2[0-3]):[0-5]\d$/.test(body.start)) throw new Error('Invalid time');

// Datos cliente completos
if (!body.client?.name || !body.client?.phone) throw new Error('Missing client info');
```

**2. Business validation:**
```sql
SELECT id, share_token_status, share_token_expires_at 
FROM businesses 
WHERE share_token = ? 
  AND status = 'active'
LIMIT 1;
```

**3. Services validation:**
```sql
SELECT id, name, price, duration, buffer, business_id 
FROM services 
WHERE id IN (?) 
  AND archived = false;

-- Verificar:
-- - Todos los service_ids existen
-- - Todos pertenecen al business correcto
```

**4. Duration calculation:**
```typescript
const totalDuration = services.reduce(
  (acc, svc) => acc + svc.duration + (svc.buffer || 0),
  0
);

// Validar que start-end matchea duración total
const startMinutes = timeToMinutes(body.start);
const endMinutes = timeToMinutes(body.end);

if (endMinutes - startMinutes !== totalDuration) {
  throw new Error('Duration mismatch');
}
```

**5. Overlap detection:**
```sql
SELECT start_time, end_time 
FROM bookings 
WHERE business_id = ? 
  AND employee_id = ? 
  AND booking_date = ? 
  AND archived = false;

-- JavaScript check:
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}
```

**6. Insert booking + services (usando `create_booking_safe`):**
```sql
-- La lógica de inserción está encapsulada en la Stored Procedure para seguridad transaccional.
-- La Edge Function invoca el RPC.
const { data, error } = await supabaseAdmin.rpc('create_booking_safe', {
  p_employee_id: bookingData.employee_id,
  p_date: bookingData.date,
  p_start: bookingData.start_time,
  p_end: bookingData.end_time,
  p_client_name: bookingData.client_name,
  p_client_phone: bookingData.client_phone,
  p_business_id: businessId,
  p_service_ids: serviceIds,
  p_client_id: bookingData.client.id || null
});
```

**Helpers:**
```typescript
// Convertir HH:mm a minutos
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Detectar overlap entre dos rangos
function overlaps(aStart: number, aEnd: number, 
                  bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}
```

**Ejemplo uso:**
```typescript
const response = await fetch(
  'https://<project>.supabase.co/functions/v1/public-bookings',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'abc-123-xyz',
      services: [{ id: 'service-uuid-1' }],
      employeeId: 'employee-uuid-1',
      date: '2025-11-25',
      start: '14:00',
      end: '16:00',
      client: {
        name: 'María González',
        phone: '+54 9 3764 123456',
        email: 'maria@example.com'
      },
      notes: 'Cliente prefiere ventana'
    })
  }
);

const { data } = await response.json();
console.log('Booking ID:', data.id);
```

---

### 3. admin-businesses

**Propósito:** CRUD operaciones en tabla `businesses` con autenticación JWT.

**Endpoint:** `POST /functions/v1/admin-businesses`

**Autenticación:** ✅ Requiere JWT (Bearer token)

**Request:**
```typescript
{
  action: 'create' | 'update' | 'upsert';
  data: {
    id: string;                     // UUID del negocio (obligatorio)
    name: string;                   // Obligatorio
    description?: string;
    phone?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    profile_image_url?: string;
    cover_image_url?: string;
    branding?: {
      font: string;
      textColor: string;
      primaryColor: string;
      secondaryColor: string;
    };
    hours?: object;
    share_token?: string;
    share_token_status?: 'active' | 'paused' | 'revoked';
    share_token_expires_at?: string;
  }
}
```

**Headers:**
```typescript
{
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

**Response Success (200):**
```typescript
{
  success: true;
  operation: 'created' | 'updated';
  id: string;
}
```

**Response Errors:**
```typescript
// 400 Bad Request
{ error: "Missing authorization header" }
{ error: "Unauthorized" }
{ error: "Missing data payload" }
{ error: "Missing name" }
{ error: "Missing business id for operation" }
{ error: "Invalid action" }
{ error: "Select failed: ..." }
{ error: "Insert/Update error message" }
```

**Flow:**

**1. JWT Validation:**
```typescript
const authHeader = req.headers.get('authorization');
if (!authHeader) throw new Error('Missing authorization header');

const token = authHeader.replace('Bearer ', '');
const { data: userData, error } = await supabaseAdmin.auth.getUser(token);

if (error || !userData?.user) throw new Error('Unauthorized');
```

**2. RLS Client Creation:**
```typescript
// Cliente con context del usuario autenticado
const supabaseRls = createClient(
  supabaseUrl,
  anonKey,
  {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  }
);

// Todas las queries usan RLS automáticamente
```

**3. Verificar existencia:**
```typescript
const { data: existingRows } = await supabaseRls
  .from('businesses')
  .select('id')
  .eq('id', targetId);

const exists = existingRows && existingRows.length > 0;
```

**4. Create o Update:**
```typescript
// CREATE
if (action === 'create' || !exists) {
  await supabaseRls.from('businesses').insert({
    id: targetId,
    name: data.name,
    // ... otros campos
    owner_id: userData.user.id,  // Link a usuario autenticado
    status: 'active'
  });
}

// UPDATE
if (action === 'update' || action === 'upsert') {
  await supabaseRls.from('businesses').update({
    name: data.name,
    // ... otros campos
  }).eq('id', targetId);
}
```

**RLS Policy aplicada:**
```sql
-- Solo owner puede modificar su business
CREATE POLICY "Owners can update their business"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);
```

**Ejemplo uso:**
```typescript
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const response = await fetch(
  'https://<project>.supabase.co/functions/v1/admin-businesses',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'update',
      data: {
        id: 'business-uuid',
        name: 'Arena Sport Club',
        description: 'Complejo deportivo',
        phone: '+54 3764 123456',
        whatsapp: '+54 9 3764 123456',
        branding: {
          font: 'Poppins, sans-serif',
          textColor: '#2d3748',
          primaryColor: '#1a202c',
          secondaryColor: '#edf2f7'
        }
      }
    })
  }
);

const result = await response.json();
```

---

### 4-7. Admin CRUD Functions

**Patrón común:** `admin-employees`, `admin-services`, `admin-service-employees`, `admin-bookings`

**Características compartidas:**
- ✅ Requieren JWT authentication
- ✅ Usan RLS client con context usuario
- ✅ Validaciones server-side
- ✅ CORS headers habilitados
- ✅ Error handling estandarizado

**Endpoints:**
- `POST /functions/v1/admin-employees`
- `POST /functions/v1/admin-services`
- `POST /functions/v1/admin-service-employees`
- `POST /functions/v1/admin-bookings`

**Request pattern:**
```typescript
{
  action: 'create' | 'update' | 'delete';
  data: {
    // Campos específicos por entidad
  }
}
```

**Headers:**
```typescript
{
  'Authorization': 'Bearer <jwt>',
  'Content-Type': 'application/json'
}
```

**Response pattern:**
```typescript
// Success
{ success: true, operation: string, id?: string }

// Error
{ error: string }
```

---

## STORED PROCEDURES

### 1. create_booking_safe

**Propósito:** Crear una nueva reserva de forma segura, previniendo condiciones de carrera (race conditions) y reservas superpuestas para un mismo empleado. Es el núcleo transaccional del sistema de creación de reservas.

**Definición:**
```sql
CREATE OR REPLACE FUNCTION create_booking_safe(
    p_business_id UUID,
    p_employee_id UUID,
    p_date DATE,
    p_start TIME,
    p_end TIME,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_client_email TEXT,
    p_service_ids UUID[],
    p_notes TEXT,
    p_client_id UUID DEFAULT NULL
) RETURNS bookings AS $$
DECLARE
    v_booking bookings;
BEGIN
    -- 1. Lock pesimista a nivel de fila para el empleado en la fecha dada.
    -- Esto previene que dos transacciones simultáneas creen una reserva superpuesta para el mismo empleado.
    PERFORM * FROM bookings
    WHERE employee_id = p_employee_id AND booking_date = p_date FOR UPDATE;
    
    -- 2. Validar que el nuevo slot no se superponga con reservas existentes para ese empleado.
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE employee_id = p_employee_id
          AND booking_date = p_date
          AND archived = false
          AND (p_start, p_end) OVERLAPS (start_time, end_time)
    ) THEN
        RAISE EXCEPTION 'Slot no longer available for this employee';
    END IF;
    
    -- 3. Insertar la nueva reserva.
    INSERT INTO bookings (
        business_id, employee_id, booking_date,
        start_time, end_time,
        client_name, client_email, client_phone,
        client_id, status, notes, archived
    ) VALUES (
        p_business_id, p_employee_id, p_date,
        p_start, p_end,
        p_client_name, p_client_email, p_client_phone,
        p_client_id, 'confirmed', p_notes, false
    ) RETURNING * INTO v_booking;
    
    -- 4. Insertar los servicios asociados a la reserva.
    -- Esta operación es manejada por el trigger `fn_populate_booking_services`
    -- que se activa después de la inserción en `bookings`.
    
    RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Características críticas:**

**1. Lock Pessimista por Empleado:**
```sql
-- Lock SOLO filas del empleado específico
-- NO bloquea otros empleados
PERFORM * FROM bookings 
WHERE employee_id = p_employee_id 
  AND booking_date = p_date
FOR UPDATE;
```

**2. Overlap Detection:**
```sql
-- PostgreSQL OVERLAPS operator
(p_start, p_end) OVERLAPS (start_time, end_time)

-- Equivalente a:
p_start < end_time AND p_end > start_time
```

**3. Transactional Safety:**
- Función corre dentro de transacción
- Lock se mantiene hasta COMMIT
- Rollback automático si RAISE EXCEPTION

**Uso desde Edge Function:**
```typescript
const { data, error } = await supabaseAdmin.rpc('create_booking_safe', {
  p_business_id: 'uuid-business',
  p_employee_id: 'uuid-empleado',
  p_date: '2025-11-25',
  p_start: '14:00:00',
  p_end: '16:00:00',
  p_client_name: 'María González',
  p_client_phone: '+54 9 3764 123456',
  p_client_email: 'maria@example.com',
  p_service_ids: ['uuid-service-1', 'uuid-service-2'],
  p_notes: 'Cliente prefiere ventana',
  p_client_id: 'uuid-cliente' // opcional
});

if (error) throw new Error(error.message);
return data; // Retorna el objeto booking completo
```

**Testing concurrency:**
```typescript
// Simular race condition
const promises = [
  supabase.rpc('create_booking_safe', {
    p_employee_id: 'mismo-empleado',
    p_start: '14:00',
    p_end: '16:00',
    // ...
  }),
  supabase.rpc('create_booking_safe', {
    p_employee_id: 'mismo-empleado',
    p_start: '14:00',
    p_end: '16:00',
    // ...
  })
];

// Resultado: Una succeeds, otra raises exception
await Promise.allSettled(promises);
```

**Performance:**
- Lock duration: ~10-50ms típico
- No deadlocks posibles (lock único por empleado)
- Permite concurrency entre empleados diferentes

---

## CLIENT QUERY PATTERNS

### Patterns RLS-Aware

**Principio:** Todas las queries frontend usan RLS automático basado en `auth.uid()`.

**Setup:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Auth state
const { data: { user } } = await supabase.auth.getUser();
```

### Pattern 1: Load Business by Owner

```typescript
// RLS filtra automáticamente por owner_id = auth.uid()
const { data: business, error } = await supabase
  .from('businesses')
  .select('*')
  .single();

// Si user tiene business → retorna
// Si user NO tiene business → null
// Si user tiene múltiples → error (usar .maybeSingle())
```

### Pattern 2: Load Related Entities

```typescript
// RLS filtra por business_id del usuario autenticado
const { data: employees } = await supabase
  .from('employees')
  .select('*')
  .eq('archived', false)
  .order('name');

const { data: services } = await supabase
  .from('services')
  .select(`
    *,
    service_employees (
      employee_id
    ),
    service_categories (
      category_id
    )
  `)
  .eq('archived', false);
```

**Equivalente SQL con RLS:**
```sql
-- Lo que ejecuta realmente
SELECT * FROM employees 
WHERE business_id IN (
  SELECT id FROM businesses WHERE owner_id = auth.uid()
)
  AND archived = false
ORDER BY name;
```

### Pattern 3: Bookings con Joins

```typescript
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    booking_services (
      service_id,
      service_name,
      service_price
    ),
    clients (
      id,
      name,
      phone,
      email
    )
  `)
  .eq('booking_date', '2025-11-25')
  .eq('archived', false)
  .order('start_time');

// Retorna bookings con servicios y cliente anidados
```

### Pattern 4: Availability Calculation

```typescript
// 1. Obtener reservas del día
const { data: existingBookings } = await supabase
  .from('bookings')
  .select('start_time, end_time')
  .eq('employee_id', employeeId)
  .eq('booking_date', date)
  .eq('archived', false);

// 2. Calcular gaps disponibles (frontend)
const gaps = calculateGapsBetweenBookings(existingBookings, businessHours);

// 3. Generar slots en gaps
const availableSlots = gaps.flatMap(gap => 
  generateSlotsInGap(gap, serviceDuration)
);
```

### Pattern 5: Client Autocomplete

```typescript
// Búsqueda por teléfono (unique por business)
const { data: client } = await supabase
  .from('clients')
  .select('*')
  .eq('phone', phoneNumber)
  .maybeSingle();

// Si existe → autocomplete
// Si no existe → crear nuevo
```

### Pattern 6: Categories con Services

```typescript
const { data: categories } = await supabase
  .from('categories')
  .select(`
    *,
    service_categories (
      service:services (
        *,
        service_employees (
          employee_id
        )
      )
    )
  `)
  .order('name');

// Retorna categories con services anidados
```

### Pattern 7: Upsert con Conflict

```typescript
// Insertar o actualizar si existe
const { error } = await supabase
  .from('clients')
  .upsert({
    business_id: businessId,
    phone: '+54 9 3764 123456',
    name: 'María González',
    email: 'maria@example.com'
  }, {
    onConflict: 'business_id,phone'  // Unique constraint
  });
```

### Pattern 8: Soft Delete

```typescript
// NO usar DELETE, usar UPDATE archived
const { error } = await supabase
  .from('employees')
  .update({ archived: true })
  .eq('id', employeeId);

// Queries filtran archived = false por default
```

---

## AUTENTICACIÓN Y SEGURIDAD

### JWT Validation Flow

**1. User login:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const jwt = data.session.access_token;
```

**2. Store JWT:**
```typescript
// Supabase Client maneja automáticamente
localStorage.setItem('supabase.auth.token', jwt);
```

**3. Requests automáticos:**
```typescript
// Supabase Client incluye JWT en todas las requests
const { data } = await supabase.from('businesses').select('*');

// Header automático:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**4. Edge Function validation:**
```typescript
const authHeader = req.headers.get('authorization');
const token = authHeader.replace('Bearer ', '');

const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}

// user.id disponible para queries
```

### Row Level Security Policies

**Businesses:**
```sql
-- SELECT: Solo owner ve su negocio
CREATE POLICY "Owners view own business"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

-- UPDATE: Solo owner modifica
CREATE POLICY "Owners update own business"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

-- INSERT: User crea su negocio
CREATE POLICY "Users create business"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

**Employees:**
```sql
-- ALL operations: Filtrado por business del owner
CREATE POLICY "Isolated by business"
  ON employees FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));
```

**Services:**
```sql
-- Mismo pattern que employees
CREATE POLICY "Isolated by business"
  ON services FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));
```

**Bookings:**
```sql
-- Aislamiento estricto multi-tenant
CREATE POLICY "Isolated by business"
  ON bookings FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));
```

**Clients:**
```sql
-- Solo ver clientes del propio negocio
CREATE POLICY "Isolated by business"
  ON clients FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));
```

### Share Token Security

**Generación:**
```typescript
import { randomUUID } from 'crypto';

const shareToken = randomUUID();
// Ejemplo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
```

**Características:**
- UUID v4 = 2^122 combinaciones posibles
- Imposible brute force
- No enumerable
- No guessable

**Validación:**
```typescript
// 1. Token existe
const business = await supabase
  .from('businesses')
  .select('*')
  .eq('share_token', token)
  .single();

if (!business) return 'Invalid token';

// 2. Status activo
if (business.share_token_status !== 'active') {
  return 'Token disabled';
}

// 3. No expirado
if (business.share_token_expires_at) {
  const expired = new Date(business.share_token_expires_at) < new Date();
  if (expired) return 'Token expired';
}

// ✅ Token válido
```

**Admin controls:**
```typescript
// Pausar token
await supabase
  .from('businesses')
  .update({ share_token_status: 'paused' })
  .eq('id', businessId);

// Regenerar token (revoca anterior)
const newToken = randomUUID();
await supabase
  .from('businesses')
  .update({ 
    share_token: newToken,
    share_token_status: 'active'
  })
  .eq('id', businessId);

// Expirar token
await supabase
  .from('businesses')
  .update({ 
    share_token_expires_at: new Date('2025-12-31')
  })
  .eq('id', businessId);
```

---

## RATE LIMITING Y PROTECCIONES

### Estado Actual

**Edge Functions:**
- ❌ Rate limiting NO implementado actualmente
- ⚠️ Potencial abuso en endpoints públicos

**Database:**
- ✅ RLS protege aislamiento multi-tenant
- ✅ Stored procedures previenen race conditions
- ✅ Constraints previenen datos inválidos

### Protecciones Implementadas

**1. Concurrency Protection:**
```sql
-- Lock pessimista en create_booking_safe
FOR UPDATE
```

**2. Validation Server-side:**
```typescript
// Edge Functions validan TODOS los inputs
if (!isValidDate(date)) throw new Error('Invalid date');
if (!isValidTime(time)) throw new Error('Invalid time');
```

**3. RLS Enforcement:**
```sql
-- PostgreSQL garantiza aislamiento
-- No bypaseable desde client
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

### Protecciones Planificadas

**1. Rate Limiting (Prioritario):**
```typescript
// Redis-based rate limit
const key = `ratelimit:${ip}:${endpoint}`;
const requests = await redis.incr(key);

if (requests === 1) {
  await redis.expire(key, 60); // 1 minuto window
}

if (requests > 100) {
  return new Response('Too many requests', { status: 429 });
}
```

**2. Honeypot for Token Enumeration:**
```typescript
// Slow down token brute force
if (invalidAttempts > 3) {
  await sleep(2000 * invalidAttempts);
}
```

**3. CAPTCHA para Public Bookings:**
```typescript
// Prevenir booking spam
if (!verifyCaptcha(token)) {
  return new Response('CAPTCHA required', { status: 403 });
}
```

---

## MANEJO DE ERRORES

### Estructura Error Response

**Formato estándar:**
```typescript
{
  error: string;           // Mensaje descriptivo
  code?: string;           // Código error (opcional)
  details?: object;        // Detalles adicionales (opcional)
}
```

### Códigos HTTP Usados

| Código | Uso | Ejemplo |
|--------|-----|---------|
| 200 | Success | Booking creado |
| 400 | Bad Request | Invalid date format |
| 401 | Unauthorized | Invalid JWT |
| 403 | Forbidden | Token disabled |
| 404 | Not Found | Business not found |
| 409 | Conflict | Slot already booked |
| 429 | Too Many Requests | Rate limit exceeded (planned) |
| 500 | Internal Error | Database error |

### Edge Function Error Handling

**Pattern:**
```typescript
serve(async (req) => {
  try {
    // Validaciones
    if (!body.token) throw new Error('Missing token');
    
    // Lógica
    const result = await doSomething();
    
    // Success
    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Client Error Handling

**Pattern:**
```typescript
try {
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }
  
  const { data } = await response.json();
  return data;
  
} catch (error) {
  // UI feedback
  toast.error(error.message);
  
  // Logging
  console.error('API call failed:', error);
  
  // Rethrow si necesario
  throw error;
}
```

### Database Errors

**PostgreSQL errors comunes:**
```typescript
// Unique constraint violation
// Error code: 23505
if (error.code === '23505') {
  return 'Ya existe un registro con esos datos';
}

// Foreign key violation
// Error code: 23503
if (error.code === '23503') {
  return 'Referencia inválida';
}

// Check constraint violation
// Error code: 23514
if (error.code === '23514') {
  return 'Valor fuera de rango permitido';
}
```

---

## CORS CONFIGURATION

**Headers obligatorios:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Todas las responses incluyen CORS
return new Response(JSON.stringify(data), {
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }
});
```

---

## PERFORMANCE CONSIDERATIONS

### Query Optimization

**1. Índices críticos:**
```sql
-- Bookings lookup by employee + date
CREATE INDEX idx_bookings_employee_date 
  ON bookings(employee_id, booking_date);

-- Businesses lookup by token
CREATE UNIQUE INDEX idx_businesses_token 
  ON businesses(share_token);

-- Clients lookup by phone
CREATE INDEX idx_clients_phone 
  ON clients(business_id, phone);
```

**2. Parallel queries:**
```typescript
// ✅ Usar Promise.all para queries independientes
const [employees, services, bookings] = await Promise.all([
  supabase.from('employees').select('*'),
  supabase.from('services').select('*'),
  supabase.from('bookings').select('*')
]);

// ❌ NO hacer secuencialmente
const employees = await supabase.from('employees').select('*');
const services = await supabase.from('services').select('*');
const bookings = await supabase.from('bookings').select('*');
```

**3. Select solo campos necesarios:**
```typescript
// ✅ Específico
.select('id, name, price')

// ❌ Evitar si no se necesita todo
.select('*')
```

### Caching Strategies

**1. Business data (larga duración):**
```typescript
// Cache 1 hora - data raramente cambia
const cachedBusiness = localStorage.getItem(`business:${businessId}`);
if (cachedBusiness) {
  const { data, timestamp } = JSON.parse(cachedBusiness);
  if (Date.now() - timestamp < 3600000) {
    return data;
  }
}
```

**2. Availability (corta duración):**
```typescript
// Cache 1 minuto - data cambia frecuentemente
const cacheKey = `availability:${employeeId}:${date}`;
const cached = sessionStorage.getItem(cacheKey);
```

**3. No cachear:**
- Share token validation (siempre validar estado actual)
- Booking creation (siempre server-side)
- Auth state (delegar a Supabase Client)

---

**Documento creado:** 21 Noviembre 2025  
**Autor:** Claude 4.5 (Strategic Architect)  
**Proyecto:** ASTRA Multi-tenant SaaS  
**Status:** ✅ Referencia API completa
