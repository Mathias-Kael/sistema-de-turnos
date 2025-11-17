# ASTRA - Technical Debt & Refinamientos Pendientes

**Última actualización:** 17 Noviembre 2025
**Responsable tracking:** Claude 4.5 (Arquitecto Estratégico)
**Estado:** ACTIVO - 2 items completados, refinamientos pendientes para próximo sprint

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

### **2. Email Validation Enhancement** ✅ COMPLETED
**Priority:** P3 (Low)
**Effort:** 5 minutos (completado 17 Nov 2025)

```typescript
// BEFORE: Basic validation
const isValidEmail = (email: string) => email.includes('@');

// AFTER: Robust regex (IMPLEMENTED)
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

**Files affected:**
- ✅ `components/common/ClientFormModal.tsx`

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

### **ASTRA-CLIENT-001: Autocomplete Reset Behavior** ✅ FIXED
**Severity:** Medium (UX degradation)
**Reporter:** Matías (Product Owner)
**Date:** 31 Oct 2025
**Fixed:** 17 Nov 2025
**Effort:** 20 minutos (2 iteraciones para encontrar root cause correcto)

**Description:**
Al seleccionar cliente del autocomplete → dropdown se reabre mostrando solo ese cliente → requiere re-selección

**Root cause REAL (confirmado con capturas):**
El `useEffect` del debounced search y el `onFocus` reabrían automáticamente el dropdown después de seleccionar.

```typescript
// BEFORE: Abría siempre después de búsqueda
useEffect(() => {
  const results = await searchClients(businessId, query);
  setClients(results);
  setIsOpen(true);  // ← Problema: abría incluso después de seleccionar
}, [query, businessId]);

// AFTER: Solo abre si NO hay cliente seleccionado
useEffect(() => {
  const results = await searchClients(businessId, query);
  setClients(results);
  if (!selectedClient) {  // ← Fix: respetar selección
    setIsOpen(true);
  }
}, [query, businessId, selectedClient]);

// TAMBIÉN FIXED: onFocus
// BEFORE:
onFocus={() => setIsOpen(true)}

// AFTER:
onFocus={() => {
  if (!selectedClient) {
    setIsOpen(true);
  }
}}
```

**Files affected:**
- ✅ `components/common/ClientSearchInput.tsx:41-63` (useEffect search)
- ✅ `components/common/ClientSearchInput.tsx:161-166` (onFocus handler)

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

| Item | Status | Assigned | Completed |
|------|--------|----------|-----------|
| Bug ASTRA-CLIENT-001 | ✅ Done | Claude | 17 Nov 2025 |
| Email validation | ✅ Done | Claude | 17 Nov 2025 |
| Unit tests | ⏳ Pending | TBD | TBD |
| Accessibility | ⏳ Pending | TBD | TBD |
| UX improvements | ⏳ Pending | TBD | TBD |
| Code deduplication | ⏳ Pending | TBD | TBD |

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
