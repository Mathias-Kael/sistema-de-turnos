# ASTRA - Decisión Arquitectónica: Header Navigation + Date Picker Interno

**Fecha:** 4 Noviembre 2025  
**Context:** Implementación Footer Navigation + Header con acciones frecuentes  
**Decisión:** Date picker interno en modales vs contexto global  
**Status:** APROBADO - Ready for implementation

---

## 🎯 PROBLEMA RESUELTO

### **Challenge Original**
- SelectedDate estado local en ReservationsManager se pierde al cambiar pestañas
- Botón +Reserva en header necesita contexto de fecha
- UX fragmentada entre diferentes entry points

### **Soluciones Evaluadas**
1. **Contexto global:** Complejo, riesgo arquitectónico alto
2. **Header date picker:** State management complejo
3. **Date picker interno:** ✅ SELECCIONADO

---

## ✅ SOLUCIÓN ARQUITECTÓNICA

### **Principio: Date Picker Obligatorio en Modales**

**Todos los modales de reserva incluyen selector de fecha:**
- `ManualBookingModal` (header + pestaña Reservas)
- `SpecialBookingModal` (reservas especiales)
- Cualquier modal futuro de reservas

### **UI Unificada**
```
┌─ Nueva Reserva ────────────────┐
│ 📅 Fecha: [Date Picker] ←OBLIG │
│ ⏰ Hora: [Time Picker]         │  
│ 👤 Cliente: [Auto-complete]    │
│ 🛠️ Servicio: [Dropdown]       │
│ [Confirmar Reserva]            │
└────────────────────────────────┘
```

**Beneficios:**
- ✅ Previene errores (fecha explícita)
- ✅ UX clara y consistente
- ✅ Zero breaking changes
- ✅ Familiar para usuarios

---

## 🏗️ IMPLEMENTACIÓN TÉCNICA

### **Cambios en ManualBookingModal**

**ANTES:**
```typescript
interface ManualBookingModalProps {
  selectedDate: Date; // recibida del padre
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

// Usage
openCreateModal(selectedDateFromCalendar)
```

**DESPUÉS:**
```typescript
interface ManualBookingModalProps {
  defaultDate?: Date; // opcional, default = today
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

// Usage - Header
openCreateModal() // usa fecha actual por defecto

// Usage - Pestaña Reservas  
openCreateModal(calendarSelectedDate) // pre-selecciona fecha del calendario
```

### **Header Implementation**

**Header Actions:**
```typescript
const HeaderActions = () => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  return (
    <header>
      <button onClick={() => setShowBookingModal(true)}>
        + Reserva
      </button>
      <button onClick={openSharePanel}>
        🔗 Compartir
      </button>
      <button onClick={openPreview}>
        👁️ Vista
      </button>
      <UserMenu />
      
      {showBookingModal && (
        <ManualBookingModal 
          defaultDate={new Date()} // hoy por defecto
          onClose={() => setShowBookingModal(false)}
          onSave={handleSave}
        />
      )}
    </header>
  );
};
```

### **Consistencia Entre Entry Points**

**Todos abren el mismo modal:**
- Header "+" → `ManualBookingModal` (defaultDate: hoy)
- Reservas "+" → `ManualBookingModal` (defaultDate: fecha del calendario)
- Reserva Especial → `SpecialBookingModal` (defaultDate: según contexto)

---

## 📱 NAVEGACIÓN FINAL

### **Header (4 acciones clave):**
```
[+ Reserva] [👁️ Vista] [🔗 Compartir] [Avatar]
```

### **Footer (3 tabs principales):**
```
📊 Dashboard | 🏗️ GESTIÓN | 📅 RESERVAS
            |   (amplio)   |  (centro)
```

### **Stack Navigation - Tab GESTIÓN**

**Level 1: Hub Cards**
```
┌─ GESTIÓN ─────────────────────┐
│ ┌─────────┐ ┌─────────┐      │
│ │ 🛠️      │ │ 👥      │      │
│ │Servicios│ │ Equipo  │      │
│ │8 activos│ │3 activos│      │
│ └─────────┘ └─────────┘      │
│ ┌─────────┐ ┌─────────┐      │
│ │ 🕐      │ │ 🎨      │      │
│ │Horarios │ │Branding │      │
│ └─────────┘ └─────────┘      │
│ ┌─────────┐                  │
│ │ 📂      │                  │
│ │Categoría│                  │
│ └─────────┘                  │
└───────────────────────────────┘
```

**Level 2: Detalle Subsección**
```
┌─ ← SERVICIOS ─────────────────┐
│ • Manicura $8.500             │
│ • Pedicura $12.000            │
│ • [+ Agregar Servicio]        │
└───────────────────────────────┘
```

**Comportamiento:**
- Click card → Cards desaparecen, muestra contenido subsección
- Botón back móvil → Vuelve a hub cards
- Header breadcrumb: "Gestión > [Subsección]"
- Stack navigation estándar móvil

### **Tab RESERVAS - Lista Simple**

**Click en tab Reservas:**
```
┌─ RESERVAS ────────────────────┐
│ • Reserva Normal              │
│ • Reserva Especial            │
└───────────────────────────────┘
```

### **Reasignación: Redes Sociales**
- **MOVER:** Panel redes sociales de Branding → Compartir
- **Gestión > Branding:** Solo colores, logo, texto
- **Gestión > Compartir:** Links, QR, redes sociales

---

## 🎯 VENTAJAS DE LA SOLUCIÓN

### **vs Contexto Global**
- ❌ No rompe arquitectura existente
- ❌ No require state management complejo
- ❌ Zero riesgo técnico
- ❌ No afecta performance

### **vs Date Picker en Header**
- ✅ **Previene errores:** Usuario obligado a confirmar fecha
- ✅ **UX intuitiva:** Fecha donde se necesita
- ✅ **Escalable:** Funciona para cualquier tipo de reserva
- ✅ **Familiar:** Pattern estándar de formularios

### **User Experience**
- ✅ **Consistencia:** Mismo flujo desde cualquier entry point
- ✅ **Claridad:** No ambigüedad sobre fecha seleccionada
- ✅ **Prevención errores:** Imposible crear reserva sin fecha explícita
- ✅ **Flexibilidad:** Usuario puede cambiar fecha fácilmente

---

## 📋 PRÓXIMOS PASOS

### **Orden de Implementación**
1. **Header component** con 4 acciones (1 hr)
2. **Modificar ManualBookingModal** con date picker interno (1 hr)  
3. **Footer navigation** 3 tabs (1 hr)
4. **Testing + responsive** (30 min)

**Total estimado:** 3.5 hrs

### **Archivos a Modificar**
- `components/views/AdminView.tsx` (agregar Header)
- `components/admin/ManualBookingModal.tsx` (date picker interno)
- `components/admin/SpecialBookingModal.tsx` (consistencia)
- CSS/styling para header + footer

---

## 🔗 DOCUMENTOS RELACIONADOS

- `ASTRA_Sesion_04Nov_Navegacion_Dashboard_Estrategico.md` - Sesión estratégica completa
- `ASTRA_Footer_Navigation_Specs.md` - Especificaciones footer detalladas
- Auditoría de agente ejecutor - Análisis navegación actual

---

## ✅ VALIDACIÓN

**Decisión tomada por:** Matías (Product Owner)  
**Fundamentada en:** Simplicidad técnica + UX intuitiva  
**Riesgo:** Mínimo (cambios no-breaking)  
**ROI:** Alto (UX mejorada + acceso rápido a acciones clave)

**Status:** ✅ DOCUMENTATION COMPLETE - READY FOR IMPLEMENTATION

---

*Documentación completada: 4 Nov 2025*  
*Próximo paso: Generar prompt para agente ejecutor*  
*Enfoque: Implementación incremental y testing*