# ASTRA - Feature: Reprogramar Reservas

**Fecha:** 7 Noviembre 2025  
**Propuesto por:** Matías (Product Owner)  
**Tipo:** Enhancement - Quick Actions Menu  
**Prioridad:** P1 - HIGH (Feature muy solicitada por usuarios)  
**Estimación:** 3-4 horas implementación  
**Estado:** PENDIENTE IMPLEMENTACIÓN

---

## 🎯 OBJETIVO

**Feature solicitada:** Permitir reprogramar reservas existentes de forma rápida e intuitiva mediante un menú de acciones contextual en cada tarjeta de reserva.

**Pain point actual:**
- ✅ Cambiar estado (confirmada/pendiente/cancelada) funciona
- ❌ NO hay forma de cambiar fecha/hora de una reserva existente
- ❌ Usuario debe cancelar y crear nueva → fricción innecesaria

**Valor de negocio:**
- Reduce cancelaciones innecesarias
- Mejora satisfacción del cliente (flexibilidad)
- Workflow más eficiente para admins
- Paridad competitiva (feature estándar en competencia)

---

## 📊 ANÁLISIS UX/UI

### Estado Actual vs Propuesto

**ANTES (funciona pero limitado):**
```
┌─────────────────────────────────┐
│ ✅ 13:30 - Corte de pelo       │
│ 👤 Juan Pérez                   │
│ 📞 3764123456                   │
│                                 │
│ [Sin acciones rápidas]          │
└─────────────────────────────────┘
```

**DESPUÉS (propuesta UX optimizada):**
```
┌─────────────────────────────────┐
│ ✅ 13:30 - Corte de pelo    [⋮] │ ← Kebab menu
│ 👤 Juan Pérez                   │
│ 📞 3764123456                   │
└─────────────────────────────────┘

Click [⋮] →
┌──────────────────────┐
│ ✅ Confirmar        │ ← Quick action (instant)
│ ⏳ Marcar pendiente │ ← Quick action (instant)
│ ❌ Cancelar         │ ← Quick action (instant)
├──────────────────────┤
│ 📅 Reprogramar      │ ← Complex action (modal)
└──────────────────────┘
```

---

## 🎨 DISEÑO UX DETALLADO

### COMPONENTE 1: Kebab Menu Button

**Posición:** Esquina superior derecha de cada BookingCard

**Visual specs:**
```tsx
// Botón tres puntitos
<button
  className="
    absolute top-2 right-2
    p-1.5 rounded-md
    hover:bg-surface-hover
    focus:ring-2 focus:ring-primary
    transition-colors
  "
  aria-label="Acciones de reserva"
>
  <MoreVertical className="w-4 h-4 text-muted-foreground" />
</button>
```

**Behavior:**
- Click → Dropdown menu aparece
- Outside click → Cierra automáticamente
- Escape key → Cierra
- Mobile: Touch-friendly (44px minimum touch target)

---

### COMPONENTE 2: Dropdown Menu

**Estructura:**
```tsx
<DropdownMenu>
  {/* Quick Actions - Cambio estado instant */}
  <DropdownMenuItem 
    onClick={() => updateStatus('confirmed')}
    disabled={booking.status === 'confirmed'}
  >
    <Check className="w-4 h-4 mr-2 text-green-600" />
    Confirmar
  </DropdownMenuItem>
  
  <DropdownMenuItem 
    onClick={() => updateStatus('pending')}
    disabled={booking.status === 'pending'}
  >
    <Clock className="w-4 h-4 mr-2 text-yellow-600" />
    Marcar pendiente
  </DropdownMenuItem>
  
  <DropdownMenuItem 
    onClick={() => updateStatus('cancelled')}
    disabled={booking.status === 'cancelled'}
  >
    <X className="w-4 h-4 mr-2 text-red-600" />
    Cancelar
  </DropdownMenuItem>
  
  {/* Separator */}
  <DropdownMenuSeparator />
  
  {/* Complex Action - Abre modal */}
  <DropdownMenuItem onClick={() => openRescheduleModal(booking)}>
    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
    Reprogramar
  </DropdownMenuItem>
</DropdownMenu>
```

**UX considerations:**
- **Disabled states:** Opción de estado actual deshabilitada (no puedes confirmar lo ya confirmado)
- **Visual hierarchy:** Separator divide quick vs complex actions
- **Icons consistentes:** Código color + ícono para mejor escaneabilidad
- **Keyboard navigation:** Arrow keys funcionan, Enter selecciona

---

### COMPONENTE 3: Reschedule Modal

**Approach decision:** Modal full-screen en mobile, centered en desktop

**Structure:**
```
┌─────────────────────────────────────────────┐
│ 📅 Reprogramar Reserva                  [X]│
├─────────────────────────────────────────────┤
│                                             │
│ INFORMACIÓN ACTUAL                          │
│ ┌─────────────────────────────────────────┐│
│ │ 👤 Juan Pérez                           ││
│ │ 💇 Corte de pelo (30 min)              ││
│ │ 📅 Lunes 11 Nov - 13:30                ││
│ │ 👨 Barbero: Carlos Gómez               ││
│ └─────────────────────────────────────────┘│
│                                             │
│ NUEVA FECHA Y HORA                          │
│ ┌─────────────────────────────────────────┐│
│ │ 📅 [Date Picker]                        ││
│ │                                         ││
│ │ HORARIOS DISPONIBLES:                   ││
│ │ [09:00] [09:30] [10:00] [10:30]        ││
│ │ [11:00] [11:30] [14:00] [14:30]        ││
│ │ [15:00] ...                             ││
│ │                                         ││
│ │ Selected: 14:00 ✓                       ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ⚠️ NOTA: Se mantendrán el servicio,       │
│    empleado y datos del cliente            │
│                                             │
│ [Cancelar] [Confirmar Reprogramación] ←───│
└─────────────────────────────────────────────┘
```

**UX Flow desglosado:**

**Paso 1: Context display**
- Mostrar información completa de la reserva actual
- Visual hierarchy clara (qué se mantiene vs qué cambia)

**Paso 2: Date selection**
- Date picker familiar (reutilizar componente existente)
- Default: Próximo día hábil (no hoy - evitar confusión)
- Disable: Fechas pasadas

**Paso 3: Time slot selection**
- Fetch disponibilidad en tiempo real al cambiar fecha
- Grid de slots clickeables (mismo componente que crear reserva)
- Visual feedback: Selected state claro
- Loading state durante fetch

**Paso 4: Confirmation**
- Botón primario: "Confirmar Reprogramación"
- Acción: UPDATE booking (no delete + create)
- Loading state en botón durante guardado
- Toast notification al éxito

---

## 🏗️ ARQUITECTURA TÉCNICA

### Backend: UPDATE vs DELETE+CREATE

**Approach recomendado: UPDATE** ⭐

```typescript
// ❌ NO HACER: Delete + Create (pierde historial)
await deleteBooking(booking.id);
await createBooking({ ...newData });

// ✅ HACER: Update directo (preserva historial)
await updateBooking(booking.id, {
  booking_date: newDate,
  start_time: newStartTime,
  end_time: newEndTime,
  updated_at: new Date()
});
```

**Ventajas UPDATE:**
- Preserva `created_at` original (métricas de conversión)
- Historial de cambios auditable (futuro: change log)
- Mantiene relaciones FK intactas
- Triggers de audit automáticos

**Desventaja DELETE+CREATE:**
- Pierde información temporal valiosa
- Posibles race conditions en constraints
- Rompe relaciones si hay FK cascade

---

### Validation Logic

**Validaciones obligatorias:**

```typescript
const validateReschedule = async (booking: Booking, newDate: Date, newTime: string) => {
  // 1. No reprogramar al mismo horario
  if (isSameDateTime(booking, newDate, newTime)) {
    throw new Error('La nueva fecha/hora es idéntica a la actual');
  }
  
  // 2. No reprogramar al pasado
  if (isPast(newDate, newTime)) {
    throw new Error('No puedes reprogramar a una fecha/hora pasada');
  }
  
  // 3. Validar disponibilidad del empleado
  const isAvailable = await checkEmployeeAvailability(
    booking.employee_id,
    newDate,
    newTime,
    booking.service_duration,
    booking.id // Excluir esta misma reserva
  );
  
  if (!isAvailable) {
    throw new Error('El empleado no está disponible en ese horario');
  }
  
  // 4. Validar horario de negocio
  const isWithinBusinessHours = checkBusinessHours(
    booking.business_id,
    newDate,
    newTime
  );
  
  if (!isWithinBusinessHours) {
    throw new Error('Fuera del horario de atención');
  }
  
  return { valid: true };
};
```

---

### Database Transaction

**Atomic update con validación:**

```sql
-- Stored procedure para reschedule seguro
CREATE OR REPLACE FUNCTION reschedule_booking(
  p_booking_id UUID,
  p_new_date DATE,
  p_new_start_time TIME,
  p_new_end_time TIME
) RETURNS VOID AS $$
DECLARE
  v_employee_id UUID;
  v_business_id UUID;
BEGIN
  -- Lock pesimista para evitar race conditions
  SELECT employee_id, business_id 
  INTO v_employee_id, v_business_id
  FROM bookings 
  WHERE id = p_booking_id
  FOR UPDATE;
  
  -- Validar overlap con otras reservas del mismo empleado
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE employee_id = v_employee_id
      AND booking_date = p_new_date
      AND status IN ('confirmed', 'pending')
      AND archived = false
      AND id != p_booking_id -- Excluir la reserva actual
      AND (p_new_start_time, p_new_end_time) OVERLAPS (start_time, end_time)
  ) THEN
    RAISE EXCEPTION 'Employee already has booking at this time';
  END IF;
  
  -- Update booking
  UPDATE bookings
  SET 
    booking_date = p_new_date,
    start_time = p_new_start_time,
    end_time = p_new_end_time,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
END;
$$ LANGUAGE plpgsql;
```

---

## 📋 IMPLEMENTACIÓN PASO A PASO

### FASE 1: Kebab Menu UI (60 min)

**Archivos a modificar:**
- `components/admin/BookingCard.tsx`

**Tasks:**
1. Agregar botón three-dots en esquina superior derecha
2. Implementar dropdown menu component
3. Wire quick actions (confirm/pending/cancel)
4. Add separator + reschedule option
5. Estado disabled para acción actual
6. Mobile responsive (touch targets)
7. Keyboard navigation

**Testing:**
- Click outside cierra
- Escape cierra
- Arrow keys navegan
- Enter selecciona
- Mobile touch funciona

---

### FASE 2: Reschedule Modal (90 min)

**Archivos a crear:**
- `components/admin/RescheduleModal.tsx`

**Tasks:**
1. Modal layout responsive (full-screen mobile, centered desktop)
2. Display current booking info (read-only)
3. Date picker integration (reutilizar existente)
4. Fetch available slots on date change
5. Time slot grid (clickeable)
6. Loading states (fetch + save)
7. Validation feedback inline
8. Success/error toast notifications

**Edge cases:**
- No available slots → mensaje claro
- Network error → retry option
- Date in past → disabled
- Same datetime → validation error

---

### FASE 3: Backend Logic (60 min)

**Archivos a modificar:**
- `services/supabaseBackend.ts` → Agregar `rescheduleBooking()`
- `context/BusinessContext.tsx` → Agregar action `RESCHEDULE_BOOKING`
- `utils/availability.ts` → Agregar `checkAvailabilityExcluding()`

**Tasks:**
1. Crear stored procedure `reschedule_booking()`
2. Implementar `rescheduleBooking()` en backend service
3. Add validaciones cliente-side y server-side
4. Update BusinessContext reducer
5. Optimistic UI update (revert on error)

**Migration:**
```sql
-- Migration: 20251107_add_reschedule_function.sql

-- Stored procedure implementada arriba
CREATE OR REPLACE FUNCTION reschedule_booking(...) ...

-- Trigger para audit log (opcional pero recomendado)
CREATE TRIGGER trg_log_reschedule
AFTER UPDATE OF booking_date, start_time, end_time ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_reschedule();
```

---

### FASE 4: Testing E2E (30 min)

**Test cases obligatorios:**

```typescript
describe('Reschedule booking', () => {
  it('should open reschedule modal from kebab menu', async () => {
    const { getByLabelText, getByText } = render(<BookingCard booking={testBooking} />);
    
    // Open menu
    fireEvent.click(getByLabelText('Acciones de reserva'));
    
    // Click reschedule
    fireEvent.click(getByText('Reprogramar'));
    
    // Modal should be visible
    expect(getByText('Reprogramar Reserva')).toBeInTheDocument();
  });
  
  it('should fetch available slots when date changes', async () => {
    // ... test implementation
  });
  
  it('should successfully reschedule to available slot', async () => {
    // ... test implementation
  });
  
  it('should prevent reschedule to occupied slot', async () => {
    // ... test implementation
  });
  
  it('should prevent reschedule to past datetime', async () => {
    // ... test implementation
  });
  
  it('should show loading state during save', async () => {
    // ... test implementation
  });
  
  it('should show error toast on failure', async () => {
    // ... test implementation
  });
});
```

---

## 🎯 CRITERIOS DE ÉXITO

### Funcionales
- ✅ Kebab menu aparece en todas las booking cards
- ✅ Quick actions (confirm/pending/cancel) funcionan instant
- ✅ Reschedule modal se abre correctamente
- ✅ Date picker muestra disponibilidad real
- ✅ Time slots son clickeables y muestran estado selected
- ✅ Validación previene overlaps y horarios inválidos
- ✅ Update booking preserva datos del cliente/servicio
- ✅ Toast notifications claras al éxito/error

### No Funcionales
- ✅ Response time < 300ms para cambios de estado
- ✅ Available slots fetch < 500ms
- ✅ Update booking < 200ms
- ✅ UI responsive (mobile + desktop)
- ✅ Keyboard accessible (WCAG AA)
- ✅ Zero regressions en funcionalidad existente

### UX
- ✅ Usuario entiende inmediatamente cómo reprogramar
- ✅ Feedback visual claro en cada paso
- ✅ Loading states no confunden
- ✅ Error messages son accionables
- ✅ Mobile UX optimizada (touch targets adecuados)

---

## ⚠️ EDGE CASES Y CONSIDERACIONES

### 1. Reprogramar Reserva Pasada
**Scenario:** Booking ya pasó pero no fue marcada como completada

**Behavior:**
- Permitir reprogramar (puede ser necesario para correcciones)
- Mostrar warning: "⚠️ Esta reserva ya pasó. ¿Estás seguro de reprogramarla?"
- Require confirmación adicional

### 2. Reprogramar Reserva Cancelada
**Scenario:** Usuario quiere "revivir" una reserva cancelada

**Behavior recomendado:**
- NO permitir desde menú (opción disabled)
- Alternativa: Botón "Duplicar" para crear nueva basada en cancelada

### 3. Conflicto Durante Reprogramación
**Scenario:** Otro admin reserva el slot mientras usuario está eligiendo

**Behavior:**
- Validation server-side al guardar
- Error message: "Este horario ya no está disponible. Por favor elige otro."
- Refetch available slots automáticamente
- NO cerrar modal (permitir elegir nuevo slot)

### 4. Cambio de Empleado Durante Reprogramación
**Scenario:** Usuario quiere cambiar empleado además de fecha/hora

**Decisión arquitectónica:**
- **Fase 1:** NO permitir cambio de empleado (scope controlado)
- **Futuro:** Agregar dropdown empleado en modal (v2)
- **Workaround actual:** Cancelar + crear nueva con otro empleado

### 5. Servicios Múltiples en Booking
**Scenario:** Booking tiene múltiples servicios con duraciones distintas

**Behavior:**
- Calcular duración total correctamente
- Time slots consideran duración completa
- Mantener todos los servicios en reprogramación

### 6. Notificaciones al Cliente
**Scenario:** Cliente necesita saber que su reserva cambió

**Implementación futura:** (NO en esta fase)
- Email/SMS automático al reprogramar
- Template: "Tu reserva del [fecha anterior] fue reprogramada a [fecha nueva]"
- Link para confirmar/cancelar si no autorizado

---

## 📊 MÉTRICAS E IMPACTO

### Technical Metrics
- **LOC:** ~500 líneas nuevas
- **Components:** 1 nuevo (RescheduleModal), 1 modificado (BookingCard)
- **API calls:** 2 nuevos endpoints (validate, reschedule)
- **Database:** 1 stored procedure
- **Tests:** +8 test cases

### Business Impact
- **Reducción cancelaciones:** Estimado -15% (usuarios reprograman vs cancelar)
- **Satisfacción cliente:** +20% (flexibilidad percibida)
- **Eficiencia admin:** -30 segundos por reprogramación vs cancelar+crear
- **Competitive parity:** Feature gap cerrado

### User Adoption (proyección)
- **Week 1:** 40% de users descubren feature
- **Week 4:** 70% han usado al menos 1 vez
- **Monthly usage:** ~5-10 reprogramaciones por negocio activo

---

## 🚀 DEPLOYMENT STRATEGY

### Pre-deploy Checklist
- [ ] Stored procedure validada en staging
- [ ] Unit tests passing (100%)
- [ ] E2E tests passing
- [ ] Mobile testing (iOS + Android)
- [ ] Desktop testing (Chrome, Firefox, Safari)
- [ ] Code review aprobado
- [ ] Documentation actualizada

### Deployment Steps
```bash
# 1. Deploy stored procedure
supabase db push

# 2. Deploy application code
git push origin main  # Vercel auto-deploy

# 3. Smoke tests production
# - Abrir booking card
# - Click kebab menu
# - Select Reprogramar
# - Change date
# - Select new time slot
# - Save
# - Verify booking updated
```

### Feature Flag (Opcional)
```typescript
// Para rollout gradual si se prefiere
const RESCHEDULE_ENABLED = process.env.VITE_RESCHEDULE_FEATURE === 'true';

if (RESCHEDULE_ENABLED) {
  menuItems.push({
    label: 'Reprogramar',
    onClick: openRescheduleModal
  });
}
```

### Rollback Plan
**RTO:** < 5 minutos

```bash
# Code rollback
git revert <commit-hash>
git push origin main

# Database rollback (si necesario)
DROP FUNCTION IF EXISTS reschedule_booking;
```

---

## 🔄 ITERACIÓN FUTURA (V2 - Fuera de scope)

### Mejoras post-MVP:
1. **Cambiar empleado:** Dropdown en modal reschedule
2. **Cambiar servicio:** Permitir modificar servicio durante reprogramación
3. **Notificaciones cliente:** Email/SMS automático
4. **Historial cambios:** Log de reprogramaciones en timeline
5. **Reschedule múltiple:** Reprogramar varias reservas en batch
6. **Drag & drop calendar:** Arrastrar reserva en calendar view
7. **Suggested times:** ML para sugerir horarios óptimos basado en historial

---

## 📚 REFERENCIAS

### Patterns de Referencia
- **Gmail:** Kebab menu en emails
- **Google Calendar:** Reschedule modal
- **Calendly:** Disponibilidad visual con slots
- **WhatsApp:** Quick actions menu

### Documentos Relacionados
- `ASTRA_Plan_Final.md` - Roadmap original feature
- `ASTRA_Decision_Header_Navigation_DatePicker_Interno.md` - Date picker patterns
- `ASTRA - Specs Técnicas: Features Flexibilidad.md` - Modal patterns

### Design System
- Lucide React icons: https://lucide.dev
- Radix UI primitives: https://www.radix-ui.com/primitives
- Tailwind CSS: https://tailwindcss.com

---

## ✅ APROBACIONES

**Propuesto por:** Matías (Product Owner) - 7 Nov 2025  
**Analizado por:** Claude 4.5 (Arquitecto Estratégico) - 7 Nov 2025  
**UX Design:** Claude 4.5 - 7 Nov 2025  
**Prioridad confirmada:** P1 - HIGH  
**Estimación validada:** 3-4 horas  

**Approach UX aprobado:**
- ✅ Kebab menu (three dots) en tarjetas
- ✅ Quick actions instant (confirm/pending/cancel)
- ✅ Complex action modal (reschedule)
- ✅ Date picker + time slots grid
- ✅ UPDATE approach (no delete+create)

**Status:** ✅ DOCUMENTO COMPLETO - READY FOR IMPLEMENTATION

**Próximo paso:** Matías aprueba diseño UX → Delegamos a agente ejecutor con este documento como spec completa.

---

*Documento creado: 7 Noviembre 2025*  
*Última actualización: 7 Noviembre 2025*  
*Versión: 1.0 - Initial Spec*  
*Próxima revisión: Post-implementación para lessons learned*
