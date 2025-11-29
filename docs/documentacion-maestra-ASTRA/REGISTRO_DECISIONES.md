# REGISTRO DE DECISIONES - ASTRA

**Sistema de Gestión de Turnos Multi-tenant SaaS**  
**Última actualización:** 21 Noviembre 2025

---

## 📋 ÍNDICE

1. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
2. [Decisiones de Producto](#decisiones-de-producto)
3. [Decisiones de UX/UI](#decisiones-de-uxui)
4. [Decisiones de Infraestructura](#decisiones-de-infraestructura)
5. [Lecciones Aprendidas](#lecciones-aprendidas)

---

## DECISIONES ARQUITECTÓNICAS

### ADR-001: Base de Datos Separada (25 Oct 2025)

**Contexto:**  
Necesidad de ambiente de desarrollo seguro antes de llegada de clientes reales.

**Decisión:**  
Base de datos separada manual con control total (desarrollo vs producción).

**Alternativas consideradas:**
- ❌ Supabase Branching Pro: $25/mes + setup complejo + dependencias externas
- ❌ Desarrollo directo en producción: Riesgo inaceptable
- ❌ Feature flags: Trabajo sobre main = riesgo

**Razones:**
- Personalidad controladora de Matías requiere máximo entendimiento
- Aprendizaje arquitectónico sin riesgo usuarios reales
- Control total sobre proceso de migration
- Ventana de oportunidad (0-2 usuarios prueba)

**Arquitectura:**
```
DESARROLLO → Base Supabase Dev → Preview Deploy
PRODUCCIÓN → Base Supabase Prod → astraturnos.com
```

**Consecuencias:**
- ✅ Zero riesgo para datos producción
- ✅ Aprendizaje profundo arquitectura
- ✅ Proceso repetible documentado
- ⚠️ Requires manual coordination entre ambientes

**Status:** ✅ Implementado, funcionando correctamente

---

### ADR-002: Backend Híbrido Supabase + n8n (25 Oct 2025)

**Contexto:**  
Hallazgo estratégico post-decisión de bases separadas.

**Decisión:**  
Arquitectura híbrida con Supabase como core + n8n como capa de inteligencia.

**Componentes:**
- **Supabase:** Core data (intacto, sin modificaciones)
- **n8n:** Read-only + automatizaciones externas

**Flujo:**
```
1. Cliente hace reserva → Supabase (como siempre)
2. n8n detecta cambio → Solo lectura
3. n8n ejecuta automación → WhatsApp/Email/Reportes
4. Base datos = COMPLETAMENTE INTACTA
```

**Razones:**
- Zero riesgo para datos existentes
- Funcionalidad actual intacta
- Additive approach (agregar sin romper)
- Read-only access = máxima seguridad
- Perfecto para personalidad controladora

**Filosofía:** "Observar y Actuar"  
n8n como observador inteligente que detecta eventos y reacciona externamente.

**Status:** 📋 Planeado para Fase 2

---

### ADR-003: Tabla `clients` Separada (31 Oct 2025)

**Contexto:**  
Feedback usuario: "Complicado andar copiando datos todas las veces"

**Decisión:**  
Tabla `clients` independiente vs reutilizar datos de `bookings`.

**Alternativa descartada:**
Extraer clientes recurrentes de `bookings` existentes.

**Razones:**
- **Performance:** Query optimizada vs table scan
- **Normalización:** Single source of truth por cliente
- **Escalabilidad:** Base para CRM futuro, analytics, segmentación
- **Consistencia:** Actualizar cliente → refleja en todas reservas

**Schema:**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE(business_id, phone),
  email TEXT,
  notes TEXT,
  tags TEXT[]
);
```

**Backward Compatibility:**
- `bookings.client_id` nullable
- Campos legacy (`client_name`, `client_phone`, `client_email`) mantenidos
- 81 bookings existentes sin migración forzada

**Status:** ✅ Implementado en producción

---

### ADR-004: Algoritmo Scheduling Dinámico (26 Oct 2025)

**Contexto:**  
Bug reportado por primera usuaria: pérdida de ingresos por inflexibilidad.

**Problema:**
- Horario: 14:00-20:00
- Reserva: 14:00-14:30 (30 min)
- Sistema mostraba: "Próximo disponible 16:00"
- Debería mostrar: 14:30

**Decisión:**  
Algoritmo de "gaps dinámicos" en 2 pasos.

**Alternativas descartadas:**
- ❌ Modificar lógica de alineación: Parche temporal
- ❌ Reserva manual sin validación: Inseguro

**Approach:**
1. Calcular huecos libres entre reservas
2. Generar slots SOLO en huecos disponibles
3. Filtrar por hora actual solo al final

**Root cause original:**
```typescript
// Bug en availability.ts
if ((minutoActual - inicioIntervalo) % duracionTotal !== 0) {
    continue; // ❌ Rechazaba slots no alineados
}
```

**Protección concurrencia:**  
Stored procedure `create_booking_safe()` con lock pesimista por empleado.

**Paradoja del "Tiempo Presente":**  
3 variables en conflicto (apertura, última reserva, hora actual) resuelta con separación generación/filtrado.

**Status:** ✅ Implementado, validado con usuaria

---

### ADR-005: Categorías Many-to-Many (2 Nov 2025)

**Contexto:**  
Necesidad de organizar servicios visualmente para clientes.

**Decisión:**  
Relación many-to-many vs one-to-many.

**Razón:**  
Un servicio puede estar en múltiples categorías.

**Ejemplo:**  
"Manicura + Esmaltado" → "Manicura" Y "Promociones"

**Schema:**
```sql
CREATE TABLE categories (...);
CREATE TABLE service_categories (
  service_id UUID,
  category_id UUID,
  PRIMARY KEY (service_id, category_id)
);
```

**Sistema íconos:**  
Campo `icon` opcional, default 'none', fallback graceful.

**Performance optimization:**  
O(n²) → O(1) con batch operations.

**Status:** ✅ Implementado con WCAG 2.1 AA compliance

---

### ADR-006: Rollback Horarios Medianoche (10 Nov 2025)

**Contexto:**  
Feature "modo medianoche" implementada para negocios nocturnos (22:00-02:00).

**Decisión:**  
ROLLBACK completo de feature.

**Razones:**
- Complejidad explosion: 5 HOT FIXES requeridos
- Testing surface multiplicado exponencialmente
- Code complexity en 6+ archivos diferentes
- Maintenance cost no sostenible para tamaño de equipo

**Feature scope creep:**
```
Original: Simple midnight hours support
→ Actual: UI toggles + validation + edge cases + 5 HOT FIXES
→ Complexity Multiplier: ~5x
→ Assessment: Not sustainable
```

**Alternativa recomendada:**  
Múltiples intervalos (00:00-02:00 + 22:00-24:00).

**Lecciones:**
- Complexity gates: Stop after 2nd HOT FIX
- Staging mandatory para DB schema changes
- Educación admin vs engineering complexity

**Status:** ✅ Rollback ejecutado. La columna `midnight_mode_enabled` fue eliminada y la lógica simplificada.

---

## DECISIONES DE PRODUCTO

### PROD-001: Flexibilidad como Diferenciador (28 Oct 2025)

**Decisión:**  
Máxima flexibilidad como core value proposition.

**Features habilitadas:**
- Scheduling dinámico (gaps reales)
- Reservas especiales con extensión horario
- Breaks para empleados
- Horarios irregulares
- Múltiples servicios por reserva

**Validación:**  
Feedback usuarios: flexibilidad impacta directamente revenue y satisfacción.

**Vs Competencia:**  
Competidores ofrecen sistemas rígidos de bloques fijos.

**Marketing angle:**
> "Flexibilidad real para emprendedores independientes.  
> Tu agenda, tus reglas."

**Status:** ✅ Core diferenciador validado

---

### PROD-002: Clientes Recurrentes Prioridad #1 (30 Oct 2025)

**Contexto:**  
Feedback directo usuaria (Mica): "complicado andar copiando datos"

**Decisión:**  
Feature clientes recurrentes = prioridad máxima.

**Pain point medido:**  
30-60 segundos perdidos por reserva manual.

**ROI esperado:**  
- 50% reducción tiempo creación reserva
- Adoption rate > 80%
- User satisfaction increase

**Status:** ✅ Implementado, en uso

---

### PROD-003: Footer Navigation sobre Rediseño (30 Oct 2025)

**Contexto:**  
Propuesta inicial: Rediseño UX completo.

**Decisión:**  
Footer navigation móvil = quick win vs big bang redesign.

**Validación externa:**  
Benchmark YaTurnos (competidor).

**ROI:**  
- 2-3 hrs effort
- 50% reducción clicks
- UX crítica
- Reversible si falla

**Valor approach:**  
Mejora incremental > big bang redesign.

**Status:** ✅ Implementado

---

## DECISIONES DE UX/UI

### UX-001: Terminología Dinámica Personas/Espacios (7 Nov 2025)

**Problema:**  
"Empleado" no aplica para canchas deportivas o espacios.

**Decisión:**  
Terminología adaptable según tipo negocio.

**Opciones:**
- Servicios personales → "Profesionales"
- Espacios/recursos → "Espacios" o "Canchas"

**Configuración:**  
Toggle en settings: "¿Tu negocio maneja personas o espacios?"

**Impacto:**  
- UI labels dinámicos
- Mensajes adaptados
- Experiencia personalizada

**Status:** 📋 Especificado, pendiente implementación

---

### UX-002: Header Navigation DatePicker Interno (4 Nov 2025)

**Decisión:**  
DatePicker dentro del header vs externo.

**Razones:**
- Acceso inmediato desde cualquier vista
- Reduce clicks para cambio de fecha
- Consistente con apps productividad (Notion, Linear)

**Componentes:**
- Logo/Brand (izquierda)
- DatePicker (centro)
- Actions: +Reserva, Vista, Compartir (derecha)

**Responsive:**  
Mobile → hamburger menu para actions.

**Status:** ✅ Implementado

---

### UX-003: Footer Reorganización Jerárquica (6 Nov 2025)

**Problema:**  
Botón "Reservas" en posición derecha (menos accesible).

**Decisión:**  
Reorganizar según uso: `[🏠 Inicio] [📅 Reservas] [🔧 Gestión]`

**Justificación:**  
80% del uso = checking/managing reservations → merece center position.

**Mobile ergonomics:**  
Thumb-accessible positioning optimizado.

**Status:** ✅ Implementado

---

### UX-004: Iteración Visual Balanceada (6 Nov 2025)

**Problema:**  
Encontrar balance perfecto header branding.

**Iteraciones:**
1. **Over-information:** Foto + perfil + nombre + descripción + teléfono → ❌ Chaos visual
2. **Over-simplification:** Solo imagen gigante → ❌ Desproporcional
3. **Sweet spot:** Imagen balanceada + nombre título → ✅ Professional

**Lección:**  
Balance > Complejidad o Simplismo.

**Status:** ✅ Implementado iteración 3

---

### UX-005: Mejora UX de Confirmación de Reserva (Success Bridge) (27 Nov 2025)

**Contexto:**
Actualmente, al confirmar una reserva, existe un "tiempo muerto" entre la respuesta exitosa del backend y la apertura de WhatsApp. Esto causa que los usuarios cierren la aplicación prematuramente o duden si la reserva fue exitosa.

**Decisión:**
Implementar una pantalla o modal intermedio de éxito ("Success Bridge") que aparezca INMEDIATAMENTE después de que `createBooking` retorne éxito, pero ANTES de redirigir a WhatsApp. Esta pantalla reemplazará el formulario de confirmación actual en el mismo contenedor.

**Alternativas consideradas:**
- ❌ Modal/overlay independiente: Podría generar "modal fatigue" o problemas de z-index si el formulario ya está en un overlay.
- ❌ Redirección inmediata sin feedback: El problema UX original.

**Razones:**
- **Claridad UX**: Proporciona feedback visual inmediato al usuario de que la reserva fue exitosa.
- **Reducción de Ansiedad**: El usuario sabe que el proceso continúa y que la redirección a WhatsApp es inminente.
- **Fluidez de Interfaz**: Reemplazar el formulario en el mismo contenedor evita saltos de layout y mantiene una experiencia cohesiva.
- **Fallback Seguro**: Incluye un botón manual para abrir WhatsApp si la redirección automática falla o es bloqueada.

**Detalles de Implementación:**
- **Componente afectado**: `components/common/ConfirmationModal.tsx`
- **Nuevo estado de UI**: `modalState: 'form' | 'success'`
- **Contenido de éxito**: Icono de check verde animado, título "¡Reserva Confirmada!", mensaje "Te estamos redirigiendo a WhatsApp para finalizar...", y botón "Abrir WhatsApp".
- **Lógica de redirección**: `setTimeout` de 1800ms antes de `window.open()` para dar tiempo al usuario a leer el mensaje.
- **Transiciones**: Clases de Tailwind (`transition-all duration-300 ease-in-out`) para un fade-out/fade-in suave.

**Consecuencias:**
- ✅ Mejora significativa en la percepción de la confirmación de reserva.
- ✅ Reducción de la tasa de abandono post-confirmación.
- ⚠️ **Deuda Técnica**: Los tests unitarios existentes para `ConfirmationModal.test.tsx` quedaron desactualizados debido al nuevo flujo asíncrono y el cambio de estado. Han sido deshabilitados temporalmente y se ha creado un documento de deuda técnica (`docs/deuda-tecnica-confirmation-modal-tests.md`) detallando el problema y el plan para su reescritura.

**Status:** ✅ Implementado

---

### ADR-007: Fix: Cancelled Bookings & Prioritizar Test Mocks (28 Nov 2025)

**Contexto:**
Las reservas con status `cancelled` bloqueaban slots en la DB y el Frontend. Además, se detectó que los tests de `utils/availability.ts` tienen mocks incorrectos, lo que impide una validación confiable.

**Decisión:**
Se implementó una exclusión explícita (`status != 'cancelled'`) en la función DB `create_booking_safe` y en la lógica Frontend (`services/api.ts`).

**Alternativas consideradas:**
- ❌ Borrar registros cancelados: Rechazado por pérdida de historial de negocio.
- ❌ Dejar la lógica solo en Frontend: Rechazado por riesgo de colisión en la DB (problema de concurrencia/seguridad).

**Razones:**
- **Doble capa de protección:** Backend previene colisiones, Frontend optimiza UX
- **Preservación de historial:** Mantiene datos de negocio para reportes y auditorías
- **Consistencia de estado:** Ambas capas sinronizadas con misma lógica de filtrado
- **Revenue recovery:** Libera slots valiosos para nuevas reservas

**Implementación:**
- **Backend (Claude Desktop):** Migración para actualizar `create_booking_safe` con `AND status != 'cancelled'`
- **Frontend (VSCode Agent):** Filtros `&& booking.status !== 'cancelled'` en `getAvailableSlots` y `findAvailableEmployeeForSlot`

**Deuda Técnica (P1):**
La principal deuda técnica es **Refactorizar los Mocks de Test** en `utils/availability.test.ts` para que representen escenarios reales (incluyendo horarios, duraciones y reservas que intersectan), ya que los tests actuales son frágiles.

**Consecuencias:**
- ✅ Slots con reservas canceladas liberados automáticamente
- ✅ Protección contra race conditions en ambas capas
- ✅ Historial de negocio preservado
- ⚠️ **Deuda técnica:** Tests de availability requieren refactor para mocks realistas

**Status:** ✅ Implementado

---

## ADR-008: Validación UI para Reactivación de Reservas Canceladas

**Fecha:** 2025-11-29
**Estado:** Aceptado
**Contexto:** Complemento a ADR-007

### Problema

ADR-007 modificó la lógica para que reservas canceladas no bloqueen
slots en `create_booking_safe`. Esto permitió que usuarios públicos
reserven sobre horarios previamente cancelados.

Sin embargo, esto creó un edge case: si un administrador cambia
manualmente el estado de una reserva de `cancelled` a `confirmed`
(o `pending`), podría crear un overlap si el slot fue ocupado
legítimamente por otra reserva activa.

### Decisión

Implementar validación preventiva en el panel de administración que:

1. Detecta cambios de estado `cancelled` → `confirmed/pending`
2. Valida overlaps contra reservas activas antes de permitir el cambio
3. Bloquea el cambio y notifica al usuario si hay conflicto
4. Solo aplica a este caso específico (no afecta otros flujos)

### Implementación

**Frontend (BookingDetailModal.tsx):**
- Handler `handleStatusChange` intercepta cambios de estado
- Llama a `checkBookingOverlap()` antes de persistir
- Gestiona loading state y feedback con toast

**Backend (supabaseBackend.ts):**
```typescript
   checkBookingOverlap(booking): Promise<boolean>
   - Query: same employee_id + booking_date
   - Filter: status IN ('confirmed', 'pending')
   - Filter: archived = false
   - Exclude: current booking
   - Logic: detect time overlap
```
   
**UX:**
- Loading spinner durante validación
- Toast error si hay conflicto
- Reversión visual del select si bloqueado

### Consecuencias

**Positivas:**
- Previene overlaps por cambios manuales de admin
- UX clara con feedback inmediato
- Consistente con lógica de `create_booking_safe`
- Solución UI-first (no requiere cambios en DB/Edge Functions)

**Negativas:**
- Agrega latencia mínima en cambio de estado (~200-500ms)
- Requiere dependencia adicional: react-hot-toast

### Alternativas Consideradas

1. **Fix en Edge Function:** Agregar filtro `.neq('status', 'cancelled')`
   - Descartado: No afecta el caso de cambio manual de estado

2. **Validación en RPC:** Crear trigger en DB
   - Descartado: Más complejo, solución UI es más elegante

3. **Deshabilitar cambio cancelled → confirmed:**
   - Descartado: Reduce flexibilidad operativa del admin

### Notas

- Esta feature complementa ADR-007
- Tests manuales confirmados: 29 Nov 2025
- Dependencia agregada: react-hot-toast@2.x

---

## DECISIONES DE INFRAESTRUCTURA

### INFRA-001: Vercel + Supabase Stack (Oct 2025)

**Decisión:**  
Vercel (frontend/Edge Functions) + Supabase Cloud (backend/DB).

**Razones:**
- SSL automático
- Deployments atómicos
- Rollbacks instantáneos
- PostgreSQL 15+ managed
- Global CDN
- Free tiers generosos

**Alternativas descartadas:**
- ❌ AWS: Complejidad setup
- ❌ Heroku: Deprecated free tier
- ❌ Digital Ocean: Requires más DevOps

**Arquitectura:**
```
Usuario
  ↓
DNS (Vercel) → astraturnos.com
  ↓
Vercel Edge Network (CDN Global)
  ↓
React App (Build estático)
  ↓
Supabase API (South America)
  ↓
PostgreSQL + Storage
```

**Status:** ✅ Producción estable

---

### INFRA-002: Dominio astraturnos.com (21 Oct 2025)

**Decisión:**  
Registrar astraturnos.com vía Namecheap, DNS en Vercel.

**Timeline:**
- 21 Oct: Dominio registrado
- 21 Oct: DNS migrados a Vercel nameservers
- 21 Oct: SSL certificates generados automáticamente

**Razones:**
- Branding profesional
- SEO mejor que subdomain Vercel
- Credibilidad para clientes empresariales

**Status:** ✅ Operativo

---

### INFRA-003: Row Level Security Multi-tenant (Oct 2025)

**Decisión:**  
RLS como backbone seguridad multi-tenant.

**Principio:**  
Cada negocio SOLO ve sus datos, aislamiento total.

**Policies pattern:**
```sql
-- SELECT: Solo owner puede ver
(auth.uid() = owner_id)

-- INSERT: Owner_id must match user
(auth.uid() = owner_id)

-- UPDATE/DELETE: Solo owner puede modificar
(auth.uid() = owner_id)
```

**Validación:**  
Security audit confirmó zero data leakage entre tenants.

**Status:** ✅ Implementado en todas las tablas

---

## LECCIONES APRENDIDAS

### LECCIÓN 1: AI-First Development Velocity

**Observación:**  
Features implementadas en MINUTOS vs días tradicionales.

**Timeline real:**
- Zero código → producción completa: 1 mes
- Matías: ZERO líneas código escritas
- Velocity extrema documentada

**Implicaciones:**
- Timelines tradicionales NO aplican
- AI coordination es skill crítico
- Speed awareness sin comprometer quality

**Aplicación:**
Siempre considerar velocity AI en estimaciones.

---

### LECCIÓN 2: Complexity Gates Críticos

**Caso:**  
Feature horarios medianoche requirió 5 HOT FIXES.

**Regla establecida:**  
Stop feature development after 2nd HOT FIX.

**Razón:**  
Complejidad exponencial = no sostenible.

**Aplicación futura:**
- ROI checkpoints cada 4 horas
- Rollback criteria upfront
- Staging mandatory para DB changes

---

### LECCIÓN 3: User Feedback > Assumptions

**Caso:**  
Scheduling dinámico implementado por feedback usuaria.

**Resultado:**  
Feature #1 diferenciador vs competencia.

**Pattern:**
- Listen → Validate → Implement → Iterate

**Aplicación:**
Cada feature validada con usuarios reales antes de escalar.

---

### LECCIÓN 4: INNER vs LEFT JOIN Impact

**Problema:**  
`!inner` excluyó registros sin relaciones, bloqueó feature completa.

**Solución:**  
Usar `!left` cuando relación es opcional.

**Lección:**  
Edge cases en queries críticos para features.

**Aplicación:**
Test exhaustivo relaciones opcionales en schema.

---

### LECCIÓN 5: Testing con Datos Reales

**Approach:**  
Validar features con negocios reales (Arena Sport Club).

**Ventaja:**  
Detecta edge cases que mocks no capturan.

**Resultado:**  
Implementaciones robustas desde día 1.

**Aplicación:**
Siempre test con data real antes de merge a main.

---

### LECCIÓN 6: Mock Backend Criticidad

**Problema:**  
Mock backend regression bloqueó tests E2E.

**Solución:**  
Mantener paridad mock/producción.

**Lección:**  
Mock backend NO es "nice to have" - es crítico para CI/CD.

**Aplicación:**
Test suite debe incluir ambos backends siempre.

---

### LECCIÓN 7: Code Review Multi-Agente

**Approach:**  
Consultar 2+ agentes independientes.

**Resultado:**
- Confirmación cruzada issues críticos
- Perspectivas complementarias
- Mayor confianza decisiones

**Ejemplo:**  
Codex (pragmático) + Claude (exhaustivo) = coverage completo.

**Aplicación:**
Features críticas siempre multi-agent review.

---

### LECCIÓN 8: Documentation = Velocity

**Observación:**  
Documentación exhaustiva = onboarding instantáneo nuevos agents.

**Valor:**
- Zero knowledge loss entre sesiones
- Continuity entre AI agents
- Reduce re-explaining

**Aplicación:**
Documentar decisiones en tiempo real, no post-mortem.

---

### LECCIÓN 9: Incremental > Big Bang

**Caso:**  
Footer navigation vs rediseño UX completo.

**Decisión:**  
Quick win incremental = mejor ROI.

**Lección:**
- Mejora incremental > big bang redesign
- Validación externa (competencia)
- ROI claro
- Reversible

**Aplicación:**
Preferir cambios incrementales validables.

---

### LECCIÓN 10: Production Stability Paramount

**Reglas establecidas:**
- NUNCA tocar producción sin autorización
- Backup antes de CUALQUIER schema change
- Staging testing mandatory
- Rollback plan always defined

**Razón:**  
Usuarios reales dependen del sistema.

**Aplicación:**
Production stability > feature velocity siempre.

---

## FORMATO ADR ESTÁNDAR

Para futuras decisiones, usar este formato:

### ADR-XXX: [Título] (Fecha)

**Contexto:**  
[Situación que requiere decisión]

**Decisión:**  
[Qué se decidió]

**Alternativas consideradas:**
- ❌ Opción A: [Razón descarte]
- ❌ Opción B: [Razón descarte]

**Razones:**
- [Justificación 1]
- [Justificación 2]
- [Justificación 3]

**Consecuencias:**
- ✅ Beneficios
- ⚠️ Trade-offs
- ❌ Desventajas conocidas

**Status:** [✅ Implementado | 📋 Planeado | ❌ Rechazado]

---

**Última actualización:** 27 Noviembre 2025
**Mantenido por:** Claude (Arquitecto ASTRA)
**Total decisiones registradas:** 20
