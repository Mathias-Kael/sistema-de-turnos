# ASTRA - Technical Debt & Refinamientos Pendientes

**Última actualización:** 31 Octubre 2025  
**Responsable tracking:** Claude 4.5 (Arquitecto Estratégico)  
**Estado:** ACTIVO - Requiere atención en próximo sprint de polish

---

## 🔴 TECHNICAL DEBT IDENTIFICADO

### **Origen: Code Review Post-Merge Clientes Recurrentes**
**Reviewer:** Claude VS Code  
**Fecha:** 31 Oct 2025  
**Grade feature:** A- (Approved, minor issues)

### **ASTRA-SEC-001: Uso de `service_role` en Función Pública**
**Severity:** Critical (Security Vulnerability)
**Reporter:** Claude (Arquitecto)
**Date:** 14 Nov 2025
**Effort:** 60-90 minutos

**Description:**
La Edge Function `public-bookings` utiliza la `SUPABASE_SERVICE_ROLE_KEY` para todas sus operaciones de base de datos. Esto bypassa todas las políticas de Row Level Security (RLS), creando una superficie de ataque innecesaria y eliminando una capa de seguridad fundamental. Si hubiera un error en la lógica de la función, podría permitir operaciones no deseadas en la base de datos.

**Root cause:**
La función fue creada con `service_role` para simplificar el desarrollo inicial, pero no fue refactorizada para usar permisos a nivel de usuario (`anon key`) una vez que las políticas RLS fueron implementadas.

**Solución recomendada:**
1.  **Restaurar Políticas RLS:** Crear una nueva migración para reintroducir las políticas de `INSERT` en las tablas `bookings` y `booking_services` para el rol `public` (o `anon`), asegurando que la inserción esté condicionada a un `share_token` de negocio válido.
2.  **Refactorizar Edge Function:** Modificar `public-bookings/index.ts` para que utilice el cliente de Supabase con la `ANON_KEY` en lugar de la `SERVICE_ROLE_KEY`. Esto forzará a la función a operar bajo las restricciones de las políticas RLS.

**Files affected:**
- `supabase/functions/public-bookings/index.ts`
- `supabase/migrations/` (requiere nuevo archivo de migración)

---
---

## 📋 REFINAMIENTOS PENDIENTES

### **1. UX/UI Improvements**
**Priority:** P2 (Medium)  
**Effort:** 30-45 minutos  

```typescript
// CURRENT: Native browser dialogs
alert('Cliente eliminado exitosamente');
if (confirm('¿Estás seguro...?')) { ... }

// TARGET: Custom components
showToast('Cliente eliminado exitosamente', 'success');
showConfirmModal({
  title: '¿Estás seguro?',
  message: 'Esta acción no se puede deshacer.',
  onConfirm: () => { ... }
});
```

**Files affected:**
- `components/admin/ClientList.tsx`
- `components/common/ClientFormModal.tsx`

### **2. Email Validation Enhancement**
**Priority:** P3 (Low)  
**Effort:** 15 minutos  

```typescript
// CURRENT: Basic validation
const isValidEmail = (email: string) => email.includes('@');

// TARGET: Robust regex
const isValidEmail = (email: string) => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

**Files affected:**
- `components/common/ClientFormModal.tsx`

### **3. Accessibility Pass**
**Priority:** P2 (Medium)  
**Effort:** 45-60 minutos  

```typescript
// ADD: Missing aria-labels
<input 
  type="text"
  placeholder="Buscar cliente..."
  aria-label="Buscar cliente por nombre o teléfono"
  aria-describedby="search-help"
/>

<div id="search-help" className="sr-only">
  Escribe para buscar clientes existentes
</div>
```

**Files affected:**
- `components/common/ClientSearchInput.tsx`
- `components/admin/ClientList.tsx`
- `components/common/ClientFormModal.tsx`

### **4. Code Duplication Reduction**
**Priority:** P2 (Medium)  
**Effort:** 90-120 minutos  

**Create custom hook:**
```typescript
// NEW: hooks/useClientManagement.ts
export const useClientManagement = (businessId: string) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  
  const searchClients = useCallback(async (query: string) => {
    // Shared logic
  }, [businessId]);
  
  const createClient = useCallback(async (clientData) => {
    // Shared logic
  }, [businessId]);
  
  return {
    clients,
    selectedClient,
    showClientForm,
    searchClients,
    createClient,
    // ... other shared methods
  };
};
```

**Files affected:**
- `components/admin/ManualBookingModal.tsx`
- `components/admin/SpecialBookingModal.tsx`
- `components/admin/ClientList.tsx`

### **5. Unit Testing Coverage**
**Priority:** P1 (High - para CI/CD)  
**Effort:** 2-3 horas  

**Missing tests:**
```typescript
// ADD: Component tests
describe('ClientSearchInput', () => {
  it('should debounce search queries', () => { ... });
  it('should handle keyboard navigation', () => { ... });
  it('should show loading state', () => { ... });
});

describe('ClientFormModal', () => {
  it('should validate required fields', () => { ... });
  it('should handle duplicate phone validation', () => { ... });
});
```

**Files to test:**
- `ClientSearchInput.test.tsx`
- `ClientFormModal.test.tsx`
- `ClientList.test.tsx`

---

## 🐛 BUGS CONOCIDOS

### **ASTRA-CLIENT-001: Autocomplete Reset Behavior**
**Severity:** Medium (UX degradation)  
**Reporter:** Matías (Product Owner)  
**Date:** 31 Oct 2025  
**Effort:** 15-30 minutos  

**Description:**
Al seleccionar cliente del autocomplete → se resetea → requiere re-selección

**Root cause probable:**
```typescript
// State conflict entre query y selectedClient
const handleClientSelect = (client) => {
  setSelectedClient(client);
  setQuery(client.name); // ← ADD: Persist in input
  onClientSelect(client);
  setIsOpen(false); // ← ADD: Close dropdown
};
```

**Files affected:**
- `components/common/ClientSearchInput.tsx`

---

## 📅 SPRINT PLANNING SUGERIDO

### **Sprint "Polish & Performance" (Futuro)**
**Total effort:** 5-7 horas  
**Priority order:**
1. Unit tests (P1) - 2-3 hrs
2. Bug fix ASTRA-CLIENT-001 (P1) - 30 min
3. Accessibility pass (P2) - 60 min  
4. UX improvements (P2) - 45 min
5. Code deduplication (P2) - 2 hrs
6. Email validation (P3) - 15 min

### **ROI Analysis**
- **High ROI:** Unit tests (CI/CD safety) + Bug fix (UX)
- **Medium ROI:** Accessibility (inclusivity) + UX (polish)
- **Low ROI:** Email validation (edge case)

---

## 📊 TRACKING METRICS

| Item | Status | Assigned | ETA |
|------|--------|----------|-----|
| Unit tests | ⏳ Pending | TBD | TBD |
| Bug ASTRA-CLIENT-001 | ⏳ Pending | TBD | TBD |
| Accessibility | ⏳ Pending | TBD | TBD |
| UX improvements | ⏳ Pending | TBD | TBD |
| Code deduplication | ⏳ Pending | TBD | TBD |
| Email validation | ⏳ Pending | TBD | TBD |

---

## 🎯 PRÓXIMA REVISIÓN

**Trigger events para address technical debt:**
1. Después de implementar 2-3 features más del roadmap
2. Antes de escalado a más usuarios
3. Sprint dedicado cada 4-6 weeks
4. Si aparecen más bugs relacionados

---

**Responsable:** Claude (Arquitecto)  
**Aprobado por:** Matías (Product Owner)  
**Próxima revisión:** Post-implementación próximos 2 features

*"Technical debt is like financial debt - a little is healthy, too much kills the business."*
