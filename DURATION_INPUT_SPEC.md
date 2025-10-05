# Especificación del Componente DurationInput

## Descripción
Componente para configurar duración de servicios en formato horas + minutos, consistente con la visualización usando `formatDuration()`.

## Validaciones Implementadas

### 1. **Máximo de Duración**
- **Límite por defecto:** 480 minutos (8 horas)
- **Configurable:** Prop `maxMinutes`
- **Comportamiento:** Si se excede, se limita automáticamente al máximo
- **Ejemplo:** Si intentas poner 9h 0min con límite de 8h, se ajusta a 8h 0min

### 2. **Mínimo de Duración**
- **Límite por defecto:** 0 minutos
- **Configurable:** Prop `minMinutes`
- **Comportamiento:** Valores negativos se convierten a 0

### 3. **Normalización Automática**
- **Disparo:** Al perder el foco (blur) de los inputs
- **Casos:**
  - `0h 90min` → `1h 30min`
  - `2h 150min` → `4h 30min`
  - `0h 0min` → Válido (0 minutos totales)

### 4. **Campos Vacíos**
- **Comportamiento:** Se tratan como 0
- **Ejemplo:** Campo vacío + 30min = 0h 30min

### 5. **Valores Negativos**
- **HTML:** Inputs tienen `min="0"`, el navegador previene negativos
- **JavaScript:** Si se ingresa por código, se convierte a 0

## Edge Cases Probados

| Input Usuario | Normalizado | Minutos Totales | Estado |
|---------------|-------------|-----------------|--------|
| 1h 30min | 1h 30min | 90 | ✅ Válido |
| 0h 90min | 1h 30min | 90 | ✅ Normalizado |
| 0h 0min | 0h 0min | 0 | ✅ Válido |
| 10h 0min (máx 8h) | 8h 0min | 480 | ✅ Limitado |
| (vacío) (vacío) | 0h 0min | 0 | ✅ Válido |
| 2h 150min | 4h 30min | 270 | ✅ Normalizado |

## Integración en ServicesEditor

### Campos Actualizados
1. **Duración del servicio**
   - Antes: `<input type="number" placeholder="Duración (min)">`
   - Ahora: `<DurationInput value={duration} onChange={...} />`

2. **Buffer del servicio**
   - Antes: `<input type="number" placeholder="Buffer (min)">`
   - Ahora: `<DurationInput value={buffer} onChange={...} />`

### Layout
- **Móvil:** 1 columna (Duración, Buffer, Precio apilados)
- **Desktop:** 2 columnas (Duración y Buffer en fila 1, Precio en fila 2)

## Otros Componentes Verificados

### ❌ **NO necesita cambios:**
- **ManualBookingModal:** No permite editar duración, solo seleccionar servicios existentes
- **EmployeeHoursEditor:** Usa `type="time"` para horarios (HH:MM), no duraciones

### ✅ **Únicos inputs de duración:**
- ServicesEditor (nuevo servicio)
- ServicesEditor (editar servicio)

## Comportamiento Técnico

### Flujo de Datos
```
Usuario ingresa → handleChange → Clamp (min/max) → onChange(minutos) →
Parent component guarda → useEffect actualiza display
```

### Normalización (onBlur)
```javascript
const normalizeTime = (h: number, m: number) => {
    const totalMinutes = h * 60 + m;
    const normalizedHours = Math.floor(totalMinutes / 60);
    const normalizedMinutes = totalMinutes % 60;
    return { hours: normalizedHours, minutes: normalizedMinutes, total: totalMinutes };
};
```

## Compatibilidad Interna
- **Persistencia:** Todo se guarda en minutos (sin cambios en backend/types)
- **API:** `Service.duration` sigue siendo `number` (minutos)
- **Conversión:** Automática dentro del componente

## Arquitectura Respetada
✅ Componente UI reutilizable en `components/ui/`
✅ Clases semánticas Tailwind (`bg-background`, `text-primary`)
✅ Documentación JSDoc completa
✅ Props tipadas con TypeScript
✅ Sin cambios en lógica de persistencia
