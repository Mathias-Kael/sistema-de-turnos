# ASTRA - Payment Fields v2: Plan de Implementación Completo

**Fecha:** 3 Diciembre 2025  
**Feature:** Sistema de pagos manuales para servicios con seña requerida  
**Status:** Diseño completo, listo para implementación  
**Approach:** Backend-first con staging environment  

---

## 📋 RESUMEN EJECUTIVO

Implementación de sistema de pagos manuales para servicios que requieren seña previa. El sistema diferencia automáticamente entre servicios con/sin seña, mostrando modal de opciones de pago (efectivo/transferencia) solo cuando es necesario. Incluye información bancaria copiable, botones de billeteras virtuales dinámicos y mensajes WhatsApp contextualizados.

**Componentes principales:**
- Modal de selección de método de pago
- Editor de información bancaria para admin
- Validaciones y guards para UX consistente
- Flujo híbrido móvil/desktop para wallet buttons

---

## 🎯 OBJETIVOS Y ALCANCE

### Objetivos Primarios
1. **Diferenciar flujos automáticamente:** Servicios sin seña → flujo actual intacto, servicios con seña → modal intermedio
2. **Información bancaria centralizada:** Un solo lugar para configurar alias/CBU/instrucciones por business
3. **UX optimizada:** Copy-to-clipboard, wallet buttons dinámicos, mensajes WhatsApp contextualizados
4. **Zero regresiones:** Flujo actual sin seña debe funcionar idénticamente

### Fuera de Alcance (v1)
- Integración real con APIs de billeteras
- Confirmación automática de pagos
- Estados de reserva pendiente de pago
- Tracking de transacciones

---

## 🏗️ ARQUITECTURA DE LA SOLUCIÓN

### Componentes Nuevos
1. **PaymentInfoModal:** Modal principal de selección método pago
2. **PaymentInfoEditor:** Panel admin para configurar datos bancarios
3. **WalletButtons:** Componente reutilizable para botones billeteras
4. **PaymentMethodSelector:** Subcomponente efectivo/transferencia

### Componentes Modificados
1. **ConfirmationModal:** Lógica condicional para detectar servicios con seña
2. **ServicesEditor:** Toggle requiresDeposit con validaciones
3. **BusinessSettings:** Integrar PaymentInfoEditor como nueva sección

### Flujo de Estados
```
Cliente selecciona servicio/horario
  ↓
ConfirmationModal (modalState: 'form')
  ↓
[Si algún servicio requiresDeposit] → modalState: 'payment'
[Si ningún servicio requiresDeposit] → modalState: 'success' (flujo actual)
  ↓
PaymentInfoModal
  ↓
[Efectivo] → WhatsApp directo con mensaje genérico
[Transferencia] → Mostrar datos bancarios
  ↓
Copy alias/CBU → Trigger wallet buttons
  ↓
modalState: 'success' → WhatsApp con mensaje específico
```

---

## 🗄️ ESTRUCTURA DE DATOS

### Base de Datos
**Nuevos campos en tabla `businesses`:**
- `payment_alias TEXT` - Alias Mercado Pago/CVU
- `payment_cbu TEXT` - CBU bancario  
- `deposit_info TEXT` - Instrucciones adicionales

**Nuevo campo en tabla `services`:**
- `deposit_amount NUMERIC` - Monto específico de seña (opcional)

### Interfaces TypeScript
**Business interface (actualizar):**
```typescript
interface Business {
  // ... campos existentes
  paymentAlias?: string;
  paymentCbu?: string;
  depositInfo?: string;
}
```

**Service interface (actualizar):**
```typescript  
interface Service {
  // ... campos existentes
  requiresDeposit: boolean;
  depositAmount?: number;
}
```

---

## 📱 ESPECIFICACIONES UX/UI

### PaymentInfoModal
**Layout principal:**
- Header: "¿Cómo vas a pagar la seña?"
- Dos opciones grandes: "💵 Efectivo" y "💳 Transferencia"
- Footer con botón "Volver"

**Flujo Efectivo:**
- Click → Modal éxito directo
- Mensaje WhatsApp: "Hola! Voy a pagar la seña en efectivo para mi reserva del [fecha] a las [hora]. ¿Confirman?"

**Flujo Transferencia:**
1. Mostrar datos bancarios con botones "Copiar"
2. Warning: "⚠️ Después de efectuar el pago, envíe comprobante por WhatsApp"
3. Al copiar datos → Aparecen wallet buttons con animación
4. Click wallet → Deep link (móvil) o web (desktop)
5. Botón WhatsApp: "Envío comprobante de seña"

### Wallet Buttons Strategy
**Detección automática de dispositivo:**
- **Móvil:** Deep links (`mercadopago://`, `uala://`, etc.)
- **Desktop:** URLs web (`https://mercadopago.com.ar/`, etc.)
- **Billeteras soportadas:** MercadoPago, Ualá, Personal Pay, Naranja X

### Validation Guards
**ServicesEditor:**
- Disable toggle `requiresDeposit` si business no tiene `paymentAlias` NI `paymentCbu`
- Tooltip explicativo: "Configure información de pago en Configuración → Datos de Pago"

**PaymentInfoModal:**
- No mostrar si business sin datos de pago (safety guard adicional)

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### FASE 1: Backend + Staging (1-2 horas)
1. **Migration DB:** Agregar campos payment a `businesses` y `deposit_amount` a `services`
2. **Edge Functions:** Modificar `validate-public-token` para exponer payment fields (staging only)
3. **Supabase Backend:** Actualizar `buildBusinessObject` y `updateBusinessData`

### FASE 2: Admin Panel (2-3 horas)
1. **PaymentInfoEditor:** Formulario con validaciones CBU/alias
2. **BusinessSettings:** Integrar como nueva sección
3. **ServicesEditor:** Toggle con validation guard

### FASE 3: Public Modal System (3-4 horas)  
1. **PaymentInfoModal:** Implementar con ambos flujos
2. **WalletButtons:** Componente con detección dispositivo
3. **ConfirmationModal:** Lógica condicional modalState

### FASE 4: Testing + Production Deploy (1-2 horas)
1. **Unit Tests:** PaymentInfoModal, WalletButtons, validation guards
2. **Integration Testing:** Flujo completo ambos escenarios  
3. **Production Deploy:** Backend + Frontend simultáneo

**Timeline Total:** 7-11 horas de desarrollo + testing

---

## 🧪 CRITERIOS DE TESTING

### Tests Unitarios Requeridos
- `PaymentInfoModal.test.tsx` - Ambos flujos, copy functionality, wallet buttons
- `PaymentInfoEditor.test.tsx` - Validaciones, save/load
- `WalletButtons.test.tsx` - Device detection, deep links
- Actualizar `ConfirmationModal.test.tsx` - Scenarios con/sin seña

### Tests de Integración
- **Flujo sin seña:** Debe funcionar idénticamente al actual
- **Flujo con seña + datos completos:** Modal → método → WhatsApp
- **Flujo con seña + datos incompletos:** Validation guards activos
- **Mobile vs Desktop:** Wallet buttons comportamiento correcto

### Tests Manuales Críticos
1. Crear servicio sin seña → verificar flujo directo intacto
2. Crear servicio con seña → verificar modal aparece
3. Configurar datos pago → verificar copy/paste funciona
4. Probar wallet buttons en móvil y desktop
5. Verificar mensajes WhatsApp contextualizados

---

## 🛡️ PLAN DE ROLLBACK

### Rollback Rápido (< 5 minutos)
**Frontend:**
```bash
git revert [commit-hash]
vercel --prod
```

**Backend Edge Functions:**
```bash
supabase functions deploy validate-public-token --project-ref PROD_ID
# Usar versión anterior sin payment fields
```

### Rollback Completo (15-30 minutos)
**Database:**
```sql
-- Solo si es necesario remover columnas completamente
ALTER TABLE businesses DROP COLUMN payment_alias;
ALTER TABLE businesses DROP COLUMN payment_cbu;  
ALTER TABLE businesses DROP COLUMN deposit_info;
ALTER TABLE services DROP COLUMN deposit_amount;
```

**Verificación Post-Rollback:**
1. Flujo reserva normal funciona
2. Admin panel carga sin errores
3. No hay referencias a campos payment en consola

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgos Identificados
1. **Regresión flujo actual:** Modal aparece cuando no debe
   - **Mitigación:** Lógica condicional estricta + tests exhaustivos

2. **Datos de pago incompletos:** Modal vacío/roto
   - **Mitigación:** Validation guards + fallback UX

3. **Wallet deep links fallan:** Botones no funcionan
   - **Mitigación:** Strategy híbrida móvil/desktop + testing devices

4. **Performance:** Modal adicional aumenta load time
   - **Mitigación:** Lazy loading PaymentInfoModal + code splitting

### Contingencias
- **Si validation guards fallan:** Mostrar mensaje error amigable
- **Si wallet buttons fallan:** Fallback a copy manual + WhatsApp
- **Si business data corrupt:** Graceful degradation a flujo simple

---

## 📊 MÉTRICAS DE ÉXITO

### Métricas Técnicas
- **Zero regresiones:** Flujo sin seña idéntico tiempo respuesta
- **Error rate:** < 1% en modal payment flow
- **Test coverage:** > 90% en componentes nuevos

### Métricas de Negocio  
- **Adoption rate:** % businesses configuran datos pago
- **Conversion rate:** % clientes completan flujo con seña
- **Support tickets:** Relacionados con payment flow

### Criterios Go/No-Go
✅ **GO:** Tests pasan, flujo sin seña intacto, validaciones funcionan
❌ **NO-GO:** Cualquier regresión en flujo actual detectada

---

## 🔄 MANTENIMIENTO POST-IMPLEMENTACIÓN

### Monitoreo Crítico (primera semana)
- Error logs PaymentInfoModal
- Conversion rates ambos flujos
- Support tickets payment-related

### Mejoras Incrementales (siguiente iteración)
- Analytics wallet button clicks
- AB testing diferentes layouts
- Integration real payment processors

### Refactoring Futuro
- Extraer wallet logic a service separado
- State management centralizado payment
- Internationalization mensajes

---

## 📚 REFERENCIAS Y DEPENDENCIAS

### Componentes Base Requeridos
- `ConfirmationModal.tsx` - Modal principal existente
- `Button`, `Input` - UI components
- `useBusinessContext` - Context business data
- `buildWhatsappUrl` - Utility WhatsApp messages

### Edge Functions Afectadas
- `validate-public-token` - Exponer payment fields
- `admin-businesses` - CRUD payment data

### External Dependencies
- Clipboard API (nativo browser)
- Navigator.userAgent (device detection)
- No packages adicionales requeridos

---

## ⚙️ CONFIGURACIÓN ESPECÍFICA

### Environment Variables
```bash
# No nuevas env vars requeridas
# Payment fields usan business data existente
```

### Feature Flags (futuro)
```typescript
// Para rollout gradual si necesario
const ENABLE_PAYMENT_FLOW = true; // Config per business
```

### Database Indexes
```sql  
-- Opcional para performance si volume alto
CREATE INDEX idx_services_requires_deposit 
ON services(requires_deposit) 
WHERE requires_deposit = true;
```

---

## ✅ CHECKLIST PRE-IMPLEMENTACIÓN

### Backend Ready
- [ ] Migration script payment fields validado
- [ ] Edge Functions staging deployadas
- [ ] Business data mock examples creados

### Frontend Ready  
- [ ] Components base identificados
- [ ] Design system patterns definidos
- [ ] Device detection strategy confirmada

### Testing Ready
- [ ] Test scenarios documentados
- [ ] Test data prepared
- [ ] Rollback plan rehearsed

### Go-Live Ready
- [ ] Staging environment fully tested
- [ ] Production deployment plan confirmed
- [ ] Support documentation updated

---

**Documento preparado por:** Claude (Strategic Architect)  
**Fecha:** 3 Diciembre 2025  
**Status:** Listo para implementación 🚀
**Próximo paso:** Ejecutar Fase 1 (Backend + Staging)

---

*Este documento es la fuente única de verdad para la implementación de Payment Fields v2. Cualquier modificación debe actualizarse aquí antes de implementar.*
