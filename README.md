# Sistema de Turnos SaaS

Plataforma web multi-tenant que permite a negocios gestionar reservas online con personalización completa de branding. Construida con React + TypeScript + Supabase.

---

## ✨ Características

### Panel de Administración
- **Gestión de Negocio:** Nombre, logo, descripción, horarios de apertura
- **Branding Personalizado:** Colores primario/secundario, tipografía (live preview)
- **Servicios:** CRUD completo con duración, precio, buffer y asignación de empleados
- **Empleados:** Gestión de personal con horarios individuales y avatares
- **Reservas:** Calendario interactivo con cambio de estados y creación manual
- **Compartir:** Enlace público con QR, control de estado (activo/pausado) y expiración

### Vista de Cliente Público
- **Flujo de Reserva:** Servicio → Empleado → Fecha → Hora → Confirmación
- **Cálculo Inteligente:** Disponibilidad basada en horarios, servicios y reservas existentes
- **Confirmación:** Formulario con export a calendario (ICS) o WhatsApp

---

## 🏗️ Arquitectura

### Stack Tecnológico
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Backend:** Supabase (PostgreSQL + Row Level Security)
- **Serverless:** Edge Functions (Deno runtime)
- **Testing:** Jest (89 tests unitarios) + Playwright (3 E2E)

### Seguridad Multi-Tenant
- **RLS Policies:** Aislamiento por `business_id`
- **Admin CRUD:** Edge Functions con `service_role` key
- **Cliente Público:** Validación de `share_token` activo
- **Ownership Checks:** Validación de pertenencia en updates/deletes

### Componentes Clave
```
components/
├── admin/              # Panel de administración
│   ├── AdminView.tsx
│   ├── ReservationsManager.tsx
│   └── [editores especializados]
├── views/
│   ├── ClientView.tsx
│   └── PublicClientLoader.tsx
└── common/
    ├── ConfirmationModal.tsx
    └── StyleInjector.tsx

supabase/
├── functions/          # Edge Functions
│   ├── admin-employees/
│   ├── admin-services/
│   ├── admin-businesses/
│   └── public-bookings/
└── migrations/         # SQL migrations

services/
├── supabaseBackend.ts  # Cliente Supabase
├── mockBackend.e2e.ts  # Mock para tests
└── supabaseWrapper.ts  # Retry automático

utils/
├── logger.ts           # Logging configurable
├── validation.ts       # Validación centralizada
└── availability.ts     # Lógica de disponibilidad
```

---

## 🚀 Setup

### Prerrequisitos
- Node.js 18+ 
- npm/pnpm
- Cuenta Supabase
- Supabase CLI (para Edge Functions)

### Variables de Entorno
Crear `.env` basado en `.env.example`:
```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_LOG_LEVEL=debug  # debug | info | warn | error | none
```

### Instalación
```bash
npm install
npm run dev  # Development server en localhost:5173
```

### Database Setup
```bash
# Aplicar migraciones
supabase db push

# Deploy Edge Functions
supabase functions deploy admin-employees
supabase functions deploy admin-services
supabase functions deploy admin-businesses
supabase functions deploy public-bookings
```

### Build Producción
```bash
npm run build  # Output en dist/
```

---

## 🧪 Testing

### Tests Unitarios
```bash
npm test           # Suite completa (89 tests)
npm test -- -t "nombre del test"  # Test específico
```

### Tests E2E (Playwright)
```bash
npm run e2e        # Todos los escenarios
npm run e2e:ui     # Modo interactivo
```

**Escenarios cubiertos:**
- Happy path: Reserva completa cliente público
- Error scenarios: Token expirado
- Edge cases: Servicios sin empleados disponibles

---

## 📊 Performance

- **Bundle size:** 432KB (128KB gzip)
- **Fonts:** Poppins + Roboto (optimizado)
- **Retry automático:** 3 intentos con backoff exponencial
- **Browser support:** Chrome, Firefox, Safari (fallback `color-mix()`)

---

## ⚠️ Limitaciones Conocidas

### 🚨 Autenticación (BLOQUEANTE PARA PRODUCCIÓN)

**Problema arquitectónico crítico:** Admin y clientes comparten el mismo mecanismo de acceso (`share_token`).

**Consecuencias:**
- ❌ Solo soporta UN negocio por instancia
- ❌ Admin pierde acceso si revoca token público
- ❌ No hay separación real entre usuarios

**Uso actual válido:**
- ✅ Prueba de concepto cerrada
- ✅ Piloto con un solo negocio
- ❌ **NO** lanzamiento multi-tenant

**Para producción real se requiere:**
- Implementar Supabase Auth + OAuth
- Reescribir RLS policies con `owner_id`
- Separar flujos admin vs cliente público
- **Estimado:** 2-3 semanas de desarrollo

---

## 📝 Historial de Versiones

### v0.5 - Production Readiness (Oct 2025)
- ✅ Migración completa a Supabase
- ✅ RLS + Edge Functions implementadas
- ✅ Logger configurable con niveles
- ✅ Retry automático para errores de red
- ✅ Bundle analysis + optimización de fonts
- ✅ E2E testing con Playwright
- ✅ Validación centralizada de inputs
- ✅ Browser compatibility (color-mix fallback)
- ✅ Trigger automático para `booking_services`
- ⚠️ Autenticación real pendiente

### v0.4 - Asignación Inteligente
- Corrección sobre-reserva con "Cualquiera disponible"
- Función `findAvailableEmployeeForSlot` centralizada
- Tests de integración robustos

### v0.3 - Validación de Agenda
- Corrección bugs de disponibilidad
- Validación de solapamiento de horarios
- Integridad de intervalos en UI

### v0.2 - Horarios Individuales
- Horarios por empleado (fallback a negocio)
- Asignación de servicios por empleado
- Editores especializados

### v0.1 - MVP
- Panel admin completo
- Vista cliente básica
- Persistencia localStorage

---

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: descripción'`)
4. Push a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

**Convenciones:**
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
- Tests obligatorios para nuevas features
- TypeScript strict mode

---

## 📄 Licencia

MIT License - Ver archivo `LICENSE`

---

## 🔗 Links Útiles

- [Documentación Supabase](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Playwright Docs](https://playwright.dev)

---

**Estado del Proyecto:** 🟡 Beta - Funcional para pilotos individuales, requiere auth para SaaS multi-tenant
