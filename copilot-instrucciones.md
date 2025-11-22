# Copilot Instructions for ASTRA Turnos

## 🎯 Visión General del Proyecto

**ASTRA Turnos** es una plataforma SaaS multi-tenant en **producción** (astraturnos.com) para gestión de reservas con branding personalizado. Stack: React + TypeScript + Supabase (PostgreSQL) + Vercel.

### Principios Fundamentales
- **Granularidad de 10 minutos**: TODOS los cálculos de slots usan intervalos de 10 minutos
- **Multi-tenancy real**: RLS (Row Level Security) en PostgreSQL para aislamiento total entre negocios
- **Estado unificado**: `BusinessContext` con React Context + useReducer
- **Persistencia Supabase**: Backend real en producción, `mockBackend.e2e.ts` solo para tests

### ⚠️ RESTRICCIONES CRÍTICAS
- **❌ NUNCA modificar schema DB** - Solo Claude (arquitecto) tiene acceso
- **❌ NUNCA crear migrations** - Coordinación con el rol de Arquitecto (Claude Desktop) obligatoria
- **❌ NUNCA tocar RLS policies** - Seguridad multi-tenant crítica
- **❌ NUNCA usar Supabase client directamente** - Usar `services/supabaseBackend.ts`

---

## 📁 Arquitectura y Estructura

### Flujo de Datos Principal
```
App.tsx (routing)
  ↓
BusinessContext (estado global)
  ↓
services/supabaseBackend.ts (capa abstracción)
  ↓
Supabase Client → PostgreSQL + Edge Functions
```

### Componentes Principales
- **`src/contexts/BusinessContext.tsx`**: Estado global con `asyncDispatch` para operaciones async
- **`src/services/supabaseBackend.ts`**: **CAPA CRÍTICA** - Abstracción sobre Supabase, maneja CRUD
- **`src/services/api.ts`**: Lógica de disponibilidad y asignación de empleados
- **`src/utils/availability.ts`**: **CRÍTICO** - Algoritmo de cálculo de slots (scheduling dinámico)
- **`src/components/views/`**: AdminView y ClientView
- **`src/components/admin/`**: CRUD de servicios, empleados, horarios, reservas
- **`src/components/common/`**: Componentes reutilizables (calendario, selectores, modales)
- **`src/components/ui/`**: Componentes base (Button, Input, ErrorMessage, LoadingSpinner)
- **`src/components/auth/`**: Login, Register, ResetPassword

### Estructura Real de Directorios
```
src/
├── components/
│   ├── admin/          # Panel administración
│   │   ├── flyer/      # Sistema generación flyers
│   │   ├── ClientList.tsx
│   │   ├── HoursEditor.tsx
│   │   └── [otros editores]
│   ├── auth/           # Autenticación
│   ├── common/         # Componentes compartidos
│   ├── ui/             # Componentes base UI
│   └── views/          # Vistas principales
├── contexts/
│   └── BusinessContext.tsx
├── services/
│   ├── supabaseBackend.ts  # ⭐ Capa abstracción Supabase
│   ├── api.ts              # Lógica negocio
│   └── mockBackend.e2e.ts  # Solo para tests E2E
├── utils/
│   ├── availability.ts     # ⭐ Scheduling dinámico
│   ├── validation.ts
│   └── [otras utilidades]
└── types.ts

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── admin-employees/
│   ├── admin-services/
│   ├── admin-businesses/
│   ├── public-bookings/
│   └── validate-public-token/
└── migrations/         # Schema evolution (solo Claude)
```

### Routing
```typescript
// App.tsx - Basado en URL params
const token = searchParams.get('token');

if (token) {
  return <PublicClientLoader token={token} />; // Vista Cliente
}
return <AdminView />; // Vista Admin
```

---

## ⏱️ Sistema de Tiempo y Slots (CRÍTICO)

### Granularidad de 10 Minutos
**REGLA DE ORO**: Toda la lógica de slots usa intervalos de 10 minutos.

```typescript
// utils/availability.ts
const GRANULARIDAD = 10; // Constante fija

// ALGORITMO: Scheduling Dinámico por Gaps
// 1. Calcular huecos libres entre reservas (calcularHuecosLibres)
// 2. Generar slots SOLO en huecos disponibles
// 3. Filtrar por hora actual solo al final
```

**Ejemplo Práctico**:
- Servicio 30 min → slots: 09:00, 09:30, 10:00, 10:30...
- Servicio 60 min → slots: 09:00, 10:00, 11:00...
- Reserva 14:00-14:30 → siguiente slot: 14:30 (NO 16:00)

### Funciones Helper Clave

```typescript
// Conversión tiempo ↔ minutos
timeToMinutes("09:30") // → 570
minutesToTime(570)     // → "09:30"

// Validación de solapamientos
validarIntervalos([
  { open: "09:00", close: "13:00" },
  { open: "14:00", close: "18:00" }
]) // → true (sin solapamiento)
```

### Algoritmo de Disponibilidad

**Archivo**: `utils/availability.ts`

**Función principal**: `calcularTurnosDisponibles()`

**Flujo de validación**:
1. ✅ Validación inicial: ¿Horario habilitado? ¿Duración > 0?
2. ✅ Filtro hora actual: Si es hoy, omitir slots pasados
3. ✅ Conversión reservas: Convertir a minutos
4. ✅ Calcular huecos libres: `calcularHuecosLibres()`
5. ✅ Generar candidatos: Crear slots en cada gap
6. ✅ Alineación turnos: Múltiplos de `duracionTotal`
7. ✅ Verificar capacidad: ¿Turno completo cabe?
8. ✅ Verificar solapamiento: `(InicioTurno < FinReserva) && (FinTurno > InicioReserva)`

**Lógica de Horarios Efectivos:**
```typescript
// Prioridad: Horario empleado > Horario negocio
getEffectiveDayHours(employee, businessHoursForDay, dayOfWeek)
```

---

## 🎨 Sistema de Branding y Estilos

### Variables CSS Dinámicas
**Archivo**: `components/common/StyleInjector.tsx`

```css
:root {
  /* Colores de marca (personalizables) */
  --color-brand-primary: ${branding.primaryColor};
  --color-brand-secondary: ${branding.secondaryColor};
  --color-brand-text: ${branding.textColor};
  --font-family-brand: ${branding.font};
  
  /* Colores semánticos sistema */
  --color-background: #ffffff;
  --color-surface: #f7fafc;
  --color-text-primary: #2d3748;
  --color-border: #e2e8f0;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #121212;
    --color-brand-primary: ${adjustColorForDarkMode(primaryColor)};
  }
}
```

### Clases de Utilidad

**✅ SIEMPRE usar:**
```typescript
.bg-primary         // Fondo color primario
.text-brand-text    // Texto color marca
.bg-surface         // Fondo superficie (respeta tema)
.text-primary       // Texto primario semántico
.border-default     // Borde por defecto
```

**❌ NUNCA usar:**
```typescript
// MAL - hardcoded
className="bg-blue-500 text-white"

// BIEN - semántico
className="bg-primary text-brand-text"
```

---

## 🗄️ Integración Supabase

### Capa de Abstracción: supabaseBackend.ts

**Archivo**: `services/supabaseBackend.ts`

**REGLA**: Componentes NO deben usar `supabase` client directamente.

```typescript
// ❌ MAL - Uso directo
import { supabase } from '../lib/supabase';
const { data } = await supabase.from('services').select('*');

// ✅ BIEN - Usar abstracción
import { getBusinessData } from '../services/supabaseBackend';
const business = await getBusinessData();
```

**Funciones principales:**
- `getBusinessData()`: Obtener datos completos del negocio
- `updateBusinessData(data)`: Actualizar info general
- `createService(service)`, `updateService(service)`, `deleteService(id)`
- `createEmployee(employee)`, `updateEmployee(employee)`, `deleteEmployee(id)`
- `createClient(client)`, `searchClients(query)`, `updateClient(client)`
- `createBookingSafe(booking)`: **Llama al RPC `create_booking_safe` en Supabase**

### BusinessContext Pattern

**Archivo**: `contexts/BusinessContext.tsx`

```typescript
// Dispatch asíncrono delega al backend
const asyncDispatch = async (action: Action) => {
  switch (action.type) {
    case 'ADD_SERVICE':
      const updated = await supabaseBackend.createService(action.payload);
      dispatch({ type: 'UPDATE_BUSINESS', payload: updated });
      break;
    // ... más casos
  }
};
```

### Edge Functions (Implementación de API Backend)

**Ubicación**: `supabase/functions/`

- `admin-employees/`: CRUD empleados (requiere service_role)
- `admin-services/`: CRUD servicios (requiere service_role)
- `admin-businesses/`: CRUD negocios (requiere service_role)
- `public-bookings/`: Crear reservas (usa create_booking_safe)
- `validate-public-token/`: Validar share token cliente

**Stored Procedure Crítica (PostgreSQL):**
```sql
CREATE FUNCTION create_booking_safe(...)
-- Lock FOR UPDATE previene race conditions
-- Valida overlap solo mismo empleado
-- INSERT en bookings + booking_services
```

---

## 🏢 Multi-Tenancy y Seguridad

### Row Level Security (RLS)

**TODAS las tablas tienen RLS enabled:**
```sql
-- Pattern: Solo owner puede ver/modificar
CREATE POLICY "business_select" ON businesses
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "services_select" ON services
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);
```

### businessId Obligatorio

**TODAS las entidades incluyen `businessId`:**
```typescript
// ✅ CORRECTO
interface Service {
  id: string;
  businessId: string; // 🔴 OBLIGATORIO
  name: string;
  duration: number;
}
```

---

## 🎯 Reglas de Negocio Críticas

### 1. Disponibilidad de Horarios

**Flujo en `services/api.ts → getAvailableSlots()`:**
1. ¿Duración total > 0?
2. ¿Negocio abre ese día?
3. ¿Empleado calificado? → `service.employeeIds.includes(employeeId)`
4. ¿Horario efectivo? → `getEffectiveDayHours()`
5. ¿Slot no reservado?
6. ¿Se respeta buffer? → `service.buffer` incluido en `totalDuration`

### 2. Estados de Reserva

**Tipos**: `'pending' | 'confirmed' | 'cancelled' | 'completed'`

```typescript
// ✅ CORRECTO - Usar clases Tailwind
const statusColors: Record<BookingStatus, string> = {
  pending: 'border-yellow-400 bg-yellow-50',
  confirmed: 'border-green-500 bg-green-50',
  cancelled: 'border-red-500 bg-red-50',
  completed: 'border-gray-400 bg-gray-50'
};
```

### 3. Asignación "Cualquiera"

**Función**: `services/api.ts → findAvailableEmployeeForSlot()`

**Algoritmo:**
1. Filtrar empleados calificados para TODOS los servicios
2. Para cada empleado:
   - ¿Horario efectivo para ese día?
   - ¿Slot dentro de su horario?
   - ¿Sin reservas solapadas?
3. Retornar **primer empleado disponible**

---

## 🔧 Gestión de Estado y Validaciones

### BusinessContext: asyncDispatch

**Pattern establecido:**
```typescript
// UI Component
const dispatch = useBusinessDispatch();

const handleSave = async () => {
  try {
    await dispatch({ 
      type: 'ADD_SERVICE', 
      payload: serviceData 
    });
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

### Validaciones Obligatorias

**Antes de actualizar horarios:**
```typescript
// ✅ Validar intervalos
if (!validarIntervalos(dayHours.intervals)) {
  throw new Error('Los intervalos se solapan');
}

// ✅ Validar reservas futuras afectadas
const hasFutureBookings = bookings.some(
  b => b.date >= today && /* slot dentro de horario modificado */
);
if (hasFutureBookings) {
  throw new Error('Hay reservas futuras que quedarían inválidas');
}
```

**Antes de eliminar empleados/servicios:**
```typescript
const hasFutureBookings = bookings.some(
  b => b.employeeId === employeeId && b.date >= today
);
if (hasFutureBookings) {
  throw new Error('No se puede eliminar, tiene reservas futuras');
}
```

---

## 🧪 Testing Obligatorio

### Configuración
- **Preset**: `ts-jest` para TypeScript
- **Entorno**: `jsdom` para simular navegador
- **Setup**: `@testing-library/jest-dom` + `setupTests.ts`

### Pattern de Tests

```typescript
import { render, screen, act } from '@testing-library/react';
import { BusinessProvider } from './context/BusinessContext';

describe('Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    render(
      <BusinessProvider>
        <MyComponent />
      </BusinessProvider>
    );
    
    await act(async () => {
      // interacciones
    });
    
    expect(screen.getByText(/algo/i)).toBeInTheDocument();
  });
});
```

### Tests Críticos Obligatorios

**Archivo**: `services/api.integration.test.ts`

- ✅ No retornar slots si empleado no calificado
- ✅ No retornar slots si negocio cerrado
- ✅ No retornar slots con overlap
- ✅ Horarios empleado tienen prioridad
- ✅ Error al eliminar empleado con reservas futuras
- ✅ Validación intervalos solapados

### Mock Backend para Tests E2E

**Archivo**: `services/mockBackend.e2e.ts`

**Uso:** Solo para tests E2E con Playwright (`?devMock=1`)

**Mantenimiento:** Si modificas `supabaseBackend.ts`:
- Replicar cambios en mock
- Ejecutar `npm run e2e` para validar paridad

---

## 🔔 Confirmación WhatsApp

**Archivo**: `utils/whatsapp.ts`

**Lógica de priorización:**
1. Si empleado tiene `whatsapp` válido (≥8 dígitos) → usar su número
2. Si no → usar `business.phone`

**Helpers:**
- `sanitizeWhatsappNumber(value)`: Limpiar formato
- `buildWhatsappUrl(number, message)`: Generar enlace wa.me
- `canUseEmployeeWhatsapp(raw)`: Validar número empleado

**Mensaje personalizado:**
```typescript
// Con empleado
`Hola ${employee.name}, quiero confirmar mi turno...`

// Fallback negocio
`Hola ${business.name}, quiero confirmar mi turno...`
```

---

## 🎓 Mejores Prácticas

### 1. Nomenclatura
- Componentes: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Tests: `*.test.tsx` o `*.test.ts`

### 2. Imports
```typescript
// ✅ Orden correcto
import React from 'react';
import { SomeType } from '../types';
import { useBusinessState } from '../context/BusinessContext';
import { MyComponent } from '../components/MyComponent';
```

### 3. Props de Componentes
```typescript
interface MyComponentProps {
  required: string;
  optional?: number;
  onAction: (id: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ 
  required, 
  optional = 10, 
  onAction 
}) => { /* ... */ };
```

### 4. Manejo de Estado
```typescript
// ✅ useState para UI, Context para datos negocio
const [isOpen, setIsOpen] = useState(false); // UI state
const business = useBusinessState(); // Business data
const dispatch = useBusinessDispatch(); // Business mutations
```

---

## 🚨 Banderas Rojas y Antipatrones

### ❌ NO HACER

1. **NO usar Supabase directamente**
   ```typescript
   // ❌ MAL
   import { supabase } from '../lib/supabase';
   const { data } = await supabase.from('services').select('*');
   
   // ✅ BIEN
   import { getBusinessData } from '../services/supabaseBackend';
   ```

2. **NO mutar estado directamente**
   ```typescript
   // ❌ MAL
   business.services.push(newService);
   
   // ✅ BIEN
   await dispatch({ type: 'ADD_SERVICE', payload: newService });
   ```

3. **NO hardcodear colores**
   ```typescript
   // ❌ MAL
   style={{ backgroundColor: '#007bff' }}
   
   // ✅ BIEN
   className="bg-primary"
   ```

4. **NO saltarse validaciones**
   ```typescript
   // ✅ SIEMPRE validar antes de guardar
   if (!validarIntervalos(intervals)) {
     setError('Intervalos solapados');
     return;
   }
   ```

5. **NO olvidar businessId**
   ```typescript
   // ❌ MAL
   const newService = { id, name, duration };
   
   // ✅ BIEN
   const newService = { 
     id, 
     businessId: business.id, 
     name, 
     duration 
   };
   ```

6. **NO tocar schema DB**
   ```typescript
   // ❌ NUNCA crear migrations
   // ❌ NUNCA modificar RLS policies
   // ❌ NUNCA alterar tablas
   // ✅ Coordinar con Claude (arquitecto DB)
   ```

---

## 🎯 Checklist de Nuevas Features

Antes de implementar:

- [ ] ¿Leer documentación en `docs/documentacion-maestra-ASTRA/`?
- [ ] ¿Necesita persistencia? → Agregar método a `supabaseBackend.ts`
- [ ] ¿Modifica horarios? → Validar reservas futuras
- [ ] ¿Usa colores? → Variables CSS y clases semánticas
- [ ] ¿Calcula disponibilidad? → Respetar granularidad 10 min
- [ ] ¿Crea entidades? → Incluir `businessId`
- [ ] ¿Tiene tests? → Mínimo test de integración
- [ ] ¿Estado? → Context para negocio, useState para UI
- [ ] ¿Mobile-first? → Probar pantallas pequeñas
- [ ] ¿Branch + Tests + Review?

---

## 📚 Recursos de Referencia Rápida

### Documentación Maestra
**Ubicación**: `docs/documentacion-maestra-ASTRA/`

1. **README.md** - Overview del proyecto
2. **ARQUITECTURA_CORE.md** - Stack técnico completo
3. **CATALOGO_FEATURES.md** - Features implementadas
4. **REFERENCIA_API.md** - Edge Functions y endpoints
5. **DESPLIEGUE_OPS.md** - CI/CD y operations
6. **SOLUCION_PROBLEMAS.md** - Troubleshooting
7. **REGISTRO_DECISIONES.md** - ADRs y lecciones

### Archivos Clave por Funcionalidad

| Funcionalidad | Archivo Principal | Relacionados |
|---------------|-------------------|--------------|
| Cálculo slots | `utils/availability.ts` | `services/api.ts` |
| Estado global | `contexts/BusinessContext.tsx` | `services/supabaseBackend.ts` |
| Persistencia | `services/supabaseBackend.ts` | Edge Functions |
| Branding | `components/common/StyleInjector.tsx` | `utils/colors.ts` |
| Vista Admin | `components/views/AdminView.tsx` | `components/admin/*` |
| Vista Cliente | `components/views/ClientView.tsx` | `components/common/*` |

### Funciones Utilidad Más Usadas

```typescript
// Tiempo
timeToMinutes(time: string): number
minutesToTime(minutes: number): string

// Validación
validarIntervalos(intervals: Interval[]): boolean

// Disponibilidad
calcularTurnosDisponibles(params): string[]
calcularHuecosLibres(reservas, intervalos): Gap[]
getEffectiveDayHours(employee, businessHours, day): DayHours | null
getAvailableSlots(date, services, business, employeeId): Promise<string[]>
findAvailableEmployeeForSlot(...): Employee | null

// Colores
adjustColorForDarkMode(hexColor: string): string

// WhatsApp
sanitizeWhatsappNumber(value: string): string
buildWhatsappUrl(number: string, message: string): string
```

---

## 📝 Workflow de Desarrollo

### 1. Antes de Empezar
```bash
# 1. Leer la documentación relevante para entender el contexto
# Ejemplo:
# cat docs/documentacion-maestra-ASTRA/CATALOGO_FEATURES.md
# cat docs/documentacion-maestra-ASTRA/ARQUITECTURA_CORE.md

# Crear branch
git checkout -b feature/nombre-descriptivo

# Instalar dependencias (si es necesario)
npm install
```

### 2. Durante Desarrollo
```bash
# Desarrollo local
npm run dev  # http://localhost:5173

# Tests en watch mode
npm test -- --watch

# Type checking
npm run type-check
```

### 3. Antes de Commit
```bash
# Tests completos
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### 4. Push y Deploy
```bash
# Commit descriptivo
git commit -m "feat: descripción clara"

# Push branch
git push origin feature/nombre-descriptivo

# Vercel auto-deploy preview
# Validar en URL preview antes de merge
```

---

## 🔗 Coordinación con el rol de Arquitecto (Claude Desktop)

**Rol del Arquitecto (Claude Desktop):**
- Arquitecto estratégico y DB owner
- Define specs, evalúa viabilidad
- Acceso exclusivo a Supabase DB
- NO ejecuta código

**Tu Rol:**
- Ejecutor de features según specs
- Implementación código
- NO modificas DB directamente

**Flujo de trabajo:**
```
1. Claude crea specs técnicas
2. Tú implementas en branch
3. Tú ejecutas tests
4. Tú creas preview deploy
5. Matías valida
6. Merge a main → producción
```

**Cuándo consultar al Arquitecto (Claude Desktop):**
- Cambios en schema DB
- Nuevas migraciones
- Decisiones arquitectónicas
- Modificaciones RLS policies
- Edge Functions nuevas

---

## 📄 Notas Finales

### Filosofía del Proyecto
- **Menos es más**: Simplicidad > complejidad
- **Especificidad > Ambigüedad**: Contratos claros
- **Probar > Suponer**: Tests para lógica crítica
- **Mobile-first**: Usuarios reservan desde móvil
- **Production-first**: Usuarios reales dependen del sistema

### Estado Actual
- ✅ **Producción**: astraturnos.com
- ✅ **Usuarios reales**: 6 negocios, 114+ bookings
- ✅ **Multi-tenant**: RLS activo, aislamiento total
- ✅ **Zero downtime**: Desde Oct 2025

### Contribuciones
Al agregar código:
1. Seguir convenciones de este documento
2. Agregar tests si modifica lógica crítica
3. Actualizar tipos si agrega entidades
4. Documentar funciones complejas (JSDoc)
5. Commits descriptivos y atómicos
6. NUNCA tocar DB sin coordinación con el Arquitecto (Claude Desktop)

---

**Versión**: 2.0 - Actualizado para Producción  
**Última actualización**: 22 Noviembre 2025  
**Mantenido por**: Claude Desktop(Arquitecto) + Matías (Product Owner)  
**Estado Proyecto**: 🟢 Producción - astraturnos.com
