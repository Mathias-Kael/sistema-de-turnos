# Copilot Instructions for sistema-de-turnos

## 🎯 Visión General del Proyecto

**Sistema de Turnos Escalable** es una aplicación React + TypeScript para gestión de reservas/turnos que funciona 100% client-side con persistencia en `localStorage`. Está diseñada para ser multi-tenant y escalable a un backend real (n8n + Firestore/Sheets).

### Principios Fundamentales
- **Granularidad de 10 minutos**: TODOS los cálculos de slots usan intervalos de 10 minutos
- **Multi-tenancy desde el inicio**: Cada entidad incluye `businessId` (preparado para escalar)
- **Estado unificado**: Un solo objeto `Business` contiene todo (servicios, empleados, horarios, reservas)
- **Persistencia local**: `mockBackend.ts` simula un backend y guarda en `localStorage`

---

## 📁 Arquitectura y Estructura

### Flujo de Datos Principal
```
App.tsx (routing) 
  ↓
BusinessContext (estado global)
  ↓
mockBackend.ts (persistencia)
  ↓
localStorage (storage)
```

### Componentes Principales
- **`src/context/BusinessContext.tsx`**: Estado global con React Context + useReducer
- **`src/services/mockBackend.ts`**: Simula backend, maneja CRUD y validaciones
- **`src/services/api.ts`**: Lógica de disponibilidad y asignación de empleados
- **`src/utils/availability.ts`**: **CRÍTICO** - Algoritmo de cálculo de slots disponibles
- **`src/components/views/`**: AdminView y ClientView
- **`src/components/admin/`**: CRUD de servicios, empleados, horarios, reservas
- **`src/components/common/`**: Componentes reutilizables (calendario, selectores, modales)

### Routing Simple
```typescript
// App.tsx - Decisión basada en URL params
const token = new URLSearchParams(window.location.search).get('token');

if (token) {
  return <TokenValidationView token={token} />; // Vista Cliente
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

// La iteración es cada 10 min, pero los slots válidos se alinean a la duracionTotal
for (let minutoActual = intervalStart; minutoActual < intervalEnd; minutoActual += GRANULARIDAD) {
  // Solo considerar slots que sean múltiplos de la duración del servicio
  if ((minutoActual - intervalStart) % duracionTotal !== 0) {
    continue;
  }
  // ... validaciones de disponibilidad
}
```

**Ejemplo Práctico**:
- Servicio de 30 min → slots válidos: 09:00, 09:30, 10:00, 10:30...
- Servicio de 60 min → slots válidos: 09:00, 10:00, 11:00...
- La iteración interna siempre es cada 10 min, pero el filtro asegura alineación lógica

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

validarIntervalos([
  { open: "09:00", close: "13:00" },
  { open: "12:30", close: "18:00" }
]) // → false (hay solapamiento)
```

### Algoritmo de Disponibilidad

**Archivo**: `utils/availability.ts`

**Función principal**: `calcularTurnosDisponibles()`

**Flujo de validación** (en orden):
1. ✅ **Validación inicial**: ¿Horario habilitado? ¿Duración > 0?
2. ✅ **Filtro de hora actual**: Si es hoy, omitir slots pasados
3. ✅ **Conversión de reservas**: Convertir a minutos para comparación
4. ✅ **Iteración por intervalos**: Recorrer cada intervalo de trabajo del día
5. ✅ **Generación de candidatos**: Crear slots cada 10 minutos
6. ✅ **Alineación de turnos**: Filtrar por múltiplos de `duracionTotal`
7. ✅ **Verificación de capacidad**: ¿El turno completo cabe en el intervalo?
8. ✅ **Verificación de solapamiento**: ¿No choca con reservas existentes?

**Lógica de solapamiento**:
```typescript
// Hay solapamiento si:
(InicioTurno < FinReserva) && (FinTurno > InicioReserva)
```

### Horarios Efectivos: Empleado vs Negocio

**Función**: `getEffectiveDayHours(employee, businessHoursForDay, dayOfWeek)`

**Prioridad**:
1. Si el empleado tiene horario personal para ese día → usar horario del empleado
2. Si no → usar horario general del negocio
3. Si el resultado está deshabilitado o sin intervalos → retornar `null`

**Ejemplo**:
```typescript
// Negocio abre 09:00-17:00
// Carlos trabaja 10:00-18:00 los lunes
// Lucía trabaja solo horario del negocio

getEffectiveDayHours(carlos, businessHours, 'monday')
// → { enabled: true, intervals: [{ open: "10:00", close: "18:00" }] }

getEffectiveDayHours(lucia, businessHours, 'monday')
// → { enabled: true, intervals: [{ open: "09:00", close: "17:00" }] }
```

---

## 🎨 Sistema de Branding y Estilos

### Variables CSS Dinámicas
**Archivo**: `components/common/StyleInjector.tsx`

El branding se inyecta mediante variables CSS que respetan el tema claro/oscuro del sistema:

```css
:root {
  /* Colores de marca personalizables */
  --color-brand-primary: ${branding.primaryColor};
  --color-brand-secondary: ${branding.secondaryColor};
  --color-brand-text: ${branding.textColor};
  --font-family-brand: ${branding.font};
  
  /* Colores semánticos del sistema (light mode) */
  --color-background: #ffffff;
  --color-surface: #f7fafc;
  --color-text-primary: #2d3748;
  --color-text-secondary: #718096;
  --color-border: #e2e8f0;
  
  /* Estados (success, warning, danger) */
  --color-state-success-bg: #d4edda;
  --color-state-danger-bg: #f8d7da;
  /* ... etc */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #121212;
    --color-surface: #1e1e1e;
    /* Colores de marca adaptados */
    --color-brand-primary: ${adjustColorForDarkMode(primaryColor)};
  }
}
```

### Clases de Utilidad para Branding

**✅ SIEMPRE usar estas clases**:
```typescript
.bg-primary         // Fondo con color primario
.text-brand-text    // Texto con color de marca
.border-primary     // Borde con color primario
.bg-surface         // Fondo de superficie (respeta tema)
.text-primary       // Texto primario semántico
.text-secondary     // Texto secundario semántico
.border-default     // Borde por defecto
```

**❌ NO usar clases hardcodeadas**:
```typescript
// MAL
className="bg-blue-500 text-white"

// BIEN
className="bg-primary text-brand-text"
```

### Ajuste de Colores para Modo Oscuro

**Función**: `utils/colors.ts → adjustColorForDarkMode(hexColor)`

**Proceso**:
1. Convertir HEX → HSL
2. Ajustar luminosidad (65%-80%) para visibilidad en fondo oscuro
3. Asegurar saturación mínima (40%) para evitar colores desvaídos
4. Convertir HSL → RGB → HEX

---

## 🏢 Multi-Tenancy y Aislamiento de Datos

### businessId Obligatorio
**TODOS** los datos deben incluir `businessId` para preparar escalabilidad:

```typescript
// ✅ CORRECTO
interface Service {
  id: string;
  businessId: string; // 🔴 OBLIGATORIO
  name: string;
  duration: number;
  // ...
}

// ❌ INCORRECTO - Falta businessId
interface Service {
  id: string;
  name: string;
  // ...
}
```

### Validación de businessId
Al crear/modificar entidades, siempre verificar que el `businessId` coincida con el contexto actual.

---

## 🎯 Reglas de Negocio Críticas

### 1. Disponibilidad de Horarios (Orden de Verificación)

**Flujo en `services/api.ts → getAvailableSlots()`**:
1. ¿Hay duración total > 0? → Si no, retornar `[]`
2. ¿El negocio abre ese día? → `business.hours[dayOfWeek].enabled`
3. ¿El empleado está calificado? → `service.employeeIds.includes(employeeId)`
4. ¿El empleado tiene horario efectivo? → `getEffectiveDayHours()`
5. ¿El slot no está reservado? → Verificar `allBookingsForDay`
6. ¿Se respeta el buffer? → `service.buffer` incluido en `totalDuration`

### 2. Estados de Reserva

**Tipos**: `'pending' | 'confirmed' | 'cancelled'`

**Colores de estado** (SIEMPRE usar clases Tailwind estándar):
```typescript
// ✅ CORRECTO
const statusColors: Record<BookingStatus, string> = {
  pending: 'border-yellow-400 bg-yellow-50',
  confirmed: 'border-green-500 bg-green-50',
  cancelled: 'border-red-500 bg-red-50',
};

// ❌ NO usar variables CSS custom para bordes de estado
// ❌ NO usar estilos inline hardcodeados
```

### 3. Asignación de Empleados "Cualquiera"

**Función**: `services/api.ts → findAvailableEmployeeForSlot()`

**Algoritmo**:
1. Filtrar empleados **calificados** para todos los servicios seleccionados
2. Para cada empleado calificado (en orden):
   - ¿Tiene horario efectivo para ese día?
   - ¿El slot está dentro de su horario de trabajo?
   - ¿No tiene reservas que solapen?
3. Retornar el **primer empleado disponible** encontrado
4. Si ninguno está disponible → retornar `null`

**Ejemplo práctico**:
```typescript
// Carlos (e1) trabaja 09:00-18:00
// Lucía (e2) trabaja 19:00-21:00
// Turno solicitado: 19:00

findAvailableEmployeeForSlot(date, '19:00', 30, services, business)
// → Debe retornar Lucía (e2), NO Carlos
```

---

## 🔧 Gestión de Estado y Persistencia

### BusinessContext Pattern

**Archivo**: `context/BusinessContext.tsx`

```typescript
// Estado se maneja con useReducer
const [state, dispatch] = useReducer(businessReducer, INITIAL_BUSINESS_DATA);

// Dispatch asíncrono delega al mockBackend
const asyncDispatch = async (action: Action) => {
  try {
    switch (action.type) {
      case 'ADD_SERVICE':
        const updated = await mockBackend.addService(action.payload);
        dispatch({ type: 'UPDATE_BUSINESS', payload: updated });
        break;
      // ... más casos
    }
  } catch (error) {
    console.error("Backend operation failed:", error);
    throw error; // Propagar para manejo en componentes
  }
};
```

### mockBackend: Validaciones Críticas

**Archivo**: `services/mockBackend.ts`

**Antes de actualizar horarios**:
```typescript
// ✅ Validar que open < close
if (interval.open >= interval.close) {
  throw new Error('El horario de inicio debe ser anterior al de fin');
}

// ✅ Validar que no haya solapamientos
if (!validarIntervalos(dayHours.intervals)) {
  throw new Error('Los intervalos se solapan');
}

// ✅ Validar que no se invaliden reservas futuras
// Si cambias el horario del lunes y hay reservas futuras para lunes,
// verificar que esas reservas sigan siendo válidas con el nuevo horario
```

**Antes de eliminar empleados/servicios**:
```typescript
const today = new Date().toISOString().split('T')[0];
const hasFutureBookings = state.bookings.some(
  b => b.employeeId === employeeId && b.date >= today
);
if (hasFutureBookings) {
  throw new Error('No se puede eliminar, tiene reservas futuras');
}
```

---

## ⚠️ Manejo de Errores y Edge Cases

### Casos Comunes y Sus Soluciones

| Problema | Causa Probable | Solución |
|----------|---------------|----------|
| "No hay turnos disponibles" | Horarios mal configurados | Verificar `business.hours[dayOfWeek]` y `employee.hours` |
| Reserva no aparece | Falta `businessId` en el objeto | Revisar `mockBackend.createBooking()` |
| Colores no cambian | CSS no actualizado | Verificar `StyleInjector.tsx` está renderizado |
| Error de solapamiento | Intervalos mal configurados | Usar `validarIntervalos()` antes de guardar |

### Validaciones Obligatorias en Reservas

```typescript
// ✅ Campos del cliente
if (!clientName.trim() || !clientPhone.trim()) {
  throw new Error('Nombre y teléfono son obligatorios');
}

// ✅ Servicios seleccionados existen
const validServices = selectedServices.every(s => 
  business.services.some(bs => bs.id === s.id)
);

// ✅ Horario dentro del rango laboral
const effectiveHours = getEffectiveDayHours(employee, businessHours, dayOfWeek);
if (!effectiveHours) {
  throw new Error('El empleado no trabaja este día');
}

// ✅ No hay solapamientos
const hasConflict = existingBookings.some(booking => {
  // ... lógica de solapamiento
});
```

---

## 🐛 Debugging y Troubleshooting

### Comandos de Consola del Navegador

```javascript
// Ver estado completo del negocio
const business = JSON.parse(localStorage.getItem('businessData'));
console.table(business.employees);
console.table(business.bookings);

// Limpiar datos y empezar de cero
localStorage.clear();
window.location.reload();

// Ver slots disponibles para debugging
import { calcularTurnosDisponibles } from './utils/availability';
// ... luego llamar la función con logs
```

### Activar Logs Detallados

En `utils/availability.ts`, descomentar logs para debugging:
```typescript
console.log('[DEBUG] Generando slots para:', { 
  fecha, duracionTotal, horarioDelDia, reservasOcupadas 
});
```

---

## 🧪 Testing

### Configuración (jest.config.cjs)
- **Preset**: `ts-jest` para TypeScript
- **Entorno**: `jsdom` para simular navegador
- **Setup**: `@testing-library/jest-dom` + `setupTests.ts`
- **Mocks CSS**: `identity-obj-proxy` para imports de estilos

### Patrón de Tests

```typescript
import { render, screen, act } from '@testing-library/react';
import { BusinessProvider } from './context/BusinessContext';

describe('Component', () => {
  beforeEach(() => {
    localStorage.clear();
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

### Tests de Integración Críticos

**Archivo**: `services/api.integration.test.ts`

Escenarios cubiertos:
- ✅ No retornar slots si empleado no ofrece el servicio
- ✅ No retornar slots si negocio cerrado
- ✅ No retornar slots que chocan con reservas existentes
- ✅ Validar que horarios de empleado tienen prioridad
- ✅ Error al eliminar empleado/servicio con reservas futuras
- ✅ Error al cambiar horarios que invalidan reservas futuras
- ✅ Validación de intervalos solapados

---

## 🚀 Preparación para Backend Real

### Puntos de Integración

Cuando se reemplace `mockBackend.ts`:

**1. Endpoints a implementar** (n8n + Sheets/Firestore):
```
GET  /api/slots?businessId=X&date=YYYY-MM-DD&services=svc1,svc2
POST /api/reserve
  Body: { businessId, date, start, services[], customer }
GET  /api/business/:id
PUT  /api/business/:id
```

**2. Archivos a modificar**:
- `services/api.ts`: Cambiar llamadas mock por `fetch()` real
- `services/mockBackend.ts`: Puede eliminarse
- `context/BusinessContext.tsx`: Mínimos cambios (mantener misma interfaz)

**3. Consideraciones**:
- Agregar **loading states** para llamadas async
- Implementar **retry logic** para errores de red
- **Caché de disponibilidad** para mejor UX
- **Optimistic updates** donde tenga sentido

---

## 📚 Utilidades y Helpers

### Formateo (`utils/format.ts`)

```typescript
formatDuration(75)  // → "1h 15m"
formatDuration(60)  // → "1h"
formatDuration(45)  // → "45 min"
formatDuration(0)   // → "0 min"
```

### Generación de Eventos de Calendario (`utils/ics.ts`)

```typescript
generateICS(date, "10:00", services, business);
// Descarga un archivo .ics compatible con Google Calendar, Outlook, etc.
```

**Formato ICS**:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20251020T100000Z
DTEND:20251020T103000Z
SUMMARY:Cita en [Nombre del Negocio]
DESCRIPTION:Servicios: [lista]
END:VEVENT
END:VCALENDAR
```

---

## 🎨 Componentes UI Base

### Button (`components/ui/Button.tsx`)

```typescript
<Button 
  variant="primary" | "secondary" | "ghost"
  size="sm" | "md" | "lg"
  disabled={boolean}
>
  Contenido
</Button>
```

### Input (`components/ui/Input.tsx`)

```typescript
<Input 
  label="Nombre"
  icon={<SomeIcon />}
  containerClassName="custom-wrapper"
  // ... rest of input props
/>
```

### ErrorMessage (`components/ui/ErrorMessage.tsx`)

```typescript
<ErrorMessage message={error} className="mt-4" />
// Solo se renderiza si message no es null/vacío
```

### LoadingSpinner (`components/ui/LoadingSpinner.tsx`)

```typescript
<LoadingSpinner size="lg" className="mx-auto" />
```

---

## 🔐 Sistema de Tokens de Compartir

### Estructura de ShareLink

```typescript
interface ShareLink {
  token: string;
  status: 'active' | 'paused' | 'revoked';
  createdAt: number;
  expiresAt: number | null;
}
```

### Validación en App.tsx

```typescript
// 1. Obtener token de URL
const token = searchParams.get('token');

// 2. Si existe, validar contra localStorage
const storedLink = JSON.parse(localStorage.getItem('shareToken'));

// 3. Verificar:
//    - Token coincide
//    - No está expirado (si expiresAt !== null)
//    - Status es 'active'

// 4. Renderizar según validación:
//    - 'valid' → ClientView
//    - 'paused' → Mensaje "Agenda pausada"
//    - 'invalid' → Mensaje "Enlace inválido"
```

---

## 🔔 Confirmación por WhatsApp (Actualizado Oct 2025)

Nueva lógica de priorización del destino del enlace de confirmación:
1. Si la reserva tiene un empleado asignado y ese empleado posee `whatsapp` válido (>= 8 dígitos tras sanitización) → el enlace apunta a su número.
2. Si no, se usa `business.phone` (comportamiento anterior).
3. Mensaje personalizado: incluye el nombre del empleado cuando aplica, de lo contrario el nombre del negocio.
4. Helpers centralizados en `utils/whatsapp.ts`:
  - `sanitizeWhatsappNumber(value)`
  - `buildWhatsappUrl(rawNumber, message)`
  - `canUseEmployeeWhatsapp(raw)`
5. UI en `ConfirmationModal.tsx` muestra etiqueta contextual: “Confirmar con el empleado” o “Confirmar por WhatsApp” + texto aclaratorio sobre destino.
6. Campo `whatsapp` del empleado se edita en `EmployeeEditModal.tsx` (opcional, no bloquea guardado).

Ejemplo (empleado):
`Hola Carlos, quiero confirmar mi turno para Corte el lunes 10 de octubre de 2025 a las 10:00. Soy Juan.`

Fallback (negocio):
`Hola Mi Barbería, quiero confirmar mi turno para Corte el lunes 10 de octubre de 2025 a las 10:00. Mi nombre es Juan. Gracias!`

Edge cases:
- Si el número no pasa sanitización mínima → fallback a `business.phone`.
- Números con espacios, guiones o paréntesis se limpian antes de generar `wa.me`.
- Si en el futuro se permite multi-empleado por turno, extender lógica para lista de contactos.

Testing:
- Ver `ConfirmationModal.test.tsx` para casos de uso: con y sin whatsapp de empleado.

---

## 🎓 Mejores Prácticas y Convenciones

### 1. Nomenclatura de Archivos
- Componentes: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Tests: `*.test.tsx` o `*.test.ts`

### 2. Imports
```typescript
// ✅ Orden correcto
import React from 'react';
import { SomeType } from '../types';
import { someUtil } from '../utils/someUtil';
import { useBusinessState } from '../context/BusinessContext';
import { MyComponent } from '../components/MyComponent';
```

### 3. Props de Componentes
```typescript
// ✅ Interface explícita
interface MyComponentProps {
  required: string;
  optional?: number;
  onAction: (id: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ 
  required, 
  optional = 10, 
  onAction 
}) => {
  // ...
};
```

### 4. Manejo de Estado Local
```typescript
// ✅ useState para UI, Context para datos de negocio
const [isOpen, setIsOpen] = useState(false); // UI state
const business = useBusinessState(); // Business data
const dispatch = useBusinessDispatch(); // Business mutations
```

### 5. Clases de Tailwind
```typescript
// ✅ Usar clases semánticas del proyecto
className="bg-surface text-primary border-default"

// ❌ Evitar clases hardcodeadas
className="bg-gray-100 text-gray-900 border-gray-300"
```

---

## 📖 Recursos de Referencia Rápida

### Archivos Clave por Funcionalidad

| Funcionalidad | Archivo Principal | Archivos Relacionados |
|---------------|-------------------|----------------------|
| Cálculo de slots | `utils/availability.ts` | `services/api.ts` |
| Estado global | `context/BusinessContext.tsx` | `services/mockBackend.ts` |
| Persistencia | `services/mockBackend.ts` | - |
| Branding | `components/common/StyleInjector.tsx` | `utils/colors.ts` |
| Vista Admin | `components/views/AdminView.tsx` | `components/admin/*` |
| Vista Cliente | `components/views/ClientView.tsx` | `components/common/*` |
| Routing | `App.tsx` | - |
| Tipos | `types.ts` | - |
| Constantes | `constants.ts` | - |

### Funciones de Utilidad Más Usadas

```typescript
// Tiempo
timeToMinutes(time: string): number
minutesToTime(minutes: number): string

// Validación
validarIntervalos(intervals: Interval[]): boolean

// Formateo
formatDuration(minutes: number): string

// Disponibilidad
calcularTurnosDisponibles(params): string[]
getEffectiveDayHours(employee, businessHours, dayOfWeek): DayHours | null
getAvailableSlots(date, services, business, employeeId): Promise<string[]>
findAvailableEmployeeForSlot(date, slot, duration, services, business): Employee | null

// Colores
adjustColorForDarkMode(hexColor: string): string

// Calendario
generateICS(date, startTime, services, business): void
```

---

## 🚨 Banderas Rojas y Antipatrones

### ❌ NO HACER

1. **NO usar localStorage directamente**
   - ✅ Usar siempre `mockBackend` para persistencia
   
2. **NO mutar el estado directamente**
   ```typescript
   // ❌ MAL
   business.services.push(newService);
   
   // ✅ BIEN
   dispatch({ type: 'ADD_SERVICE', payload: newService });
   ```

3. **NO hardcodear colores**
   ```typescript
   // ❌ MAL
   style={{ backgroundColor: '#007bff' }}
   
   // ✅ BIEN
   className="bg-primary"
   ```

4. **NO saltarse validaciones de horarios**
   ```typescript
   // ❌ MAL
   await mockBackend.updateBusinessData(newData);
   
   // ✅ BIEN - mockBackend ya valida internamente
   // Pero siempre usar validarIntervalos() en el UI antes de guardar
   if (!validarIntervalos(intervals)) {
     setError('Intervalos solapados');
     return;
   }
   ```

5. **NO olvidar el businessId**
   ```typescript
   // ❌ MAL
   const newService = { id, name, duration };
   
   // ✅ BIEN
   const newService = { id, businessId: business.id, name, duration };
   ```

---

## 🎯 Checklist de Nuevas Features

Antes de implementar una nueva feature, verificar:

- [ ] ¿Necesita persistencia? → Agregar acción al Context y método al mockBackend
- [ ] ¿Modifica horarios? → Incluir validación de reservas futuras
- [ ] ¿Usa colores? → Usar variables CSS y clases semánticas
- [ ] ¿Calcula disponibilidad? → Respetar granularidad de 10 minutos
- [ ] ¿Crea/modifica entidades? → Incluir `businessId`
- [ ] ¿Tiene tests? → Agregar al menos test de integración
- [ ] ¿Usa estado? → Context para datos de negocio, useState para UI
- [ ] ¿Mobile-first? → Probar diseño en pantallas pequeñas

---

## 📝 Notas Finales

### Filosofía del Proyecto
- **Menos es más**: Priorizar simplicidad sobre funcionalidades complejas
- **Especificidad > Ambigüedad**: Contratos claros entre componentes
- **Probar > Suponer**: Tests de integración para lógica crítica
- **Mobile-first**: La mayoría de los usuarios reservarán desde el móvil

### Escalabilidad Futura
Este proyecto está diseñado para **escalar sin refactor masivo**:
- Multi-tenancy desde el inicio (businessId en todo)
- Interfaz de backend bien definida (mockBackend → API real)
- Componentes agnósticos del origen de datos
- Validaciones de integridad en el backend simulado

### Contribuciones
Al agregar código nuevo:
1. Seguir las convenciones de este documento
2. Agregar tests si modifica lógica crítica
3. Actualizar tipos si agrega nuevas entidades
4. Documentar funciones complejas con JSDoc
5. Hacer commits descriptivos y atómicos

---

**Versión del documento**: 1.0  
**Última actualización**: Octubre 2025  
**Mantenido por**: Equipo del proyecto