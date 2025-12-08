# ASTRA - Sistema de Gestión de Turnos Multi-tenant

**Plataforma SaaS completa para gestión de reservas con branding personalizado**  
**Estado:** ✅ Producción - [astraturnos.com](https://astraturnos.com)  
**Última actualización:** 8 Diciembre 2025

---

## 📚 DOCUMENTACIÓN COMPLETA

### Documentos Core
1. **[ARQUITECTURA_CORE.md](ARQUITECTURA_CORE.md)** - Stack técnico, schema DB, seguridad
2. **[CATALOGO_FEATURES.md](CATALOGO_FEATURES.md)** - Features implementadas y roadmap
3. **[REFERENCIA_API.md](REFERENCIA_API.md)** - Edge Functions y endpoints
4. **[DESPLIEGUE_OPS.md](DESPLIEGUE_OPS.md)** - Deploy, CI/CD, monitoring
5. **[SOLUCION_PROBLEMAS.md](SOLUCION_PROBLEMAS.md)** - Troubleshooting y fixes
6. **[REGISTRO_DECISIONES.md](REGISTRO_DECISIONES.md)** - ADRs y lecciones aprendidas

---

## 🎯 VISIÓN GENERAL

ASTRA es una plataforma SaaS white-label que permite a negocios (salones de belleza, gimnasios, profesionales independientes) gestionar reservas online con branding 100% personalizado. Cada negocio obtiene su propia landing page branded para que sus clientes reserven turnos.

### Diferenciadores Clave
- **Flexibilidad Extrema:** Scheduling dinámico, horarios irregulares, reservas especiales
- **Multi-tenant Seguro:** RLS + JWT, aislamiento total entre negocios
- **White-label Completo:** Branding dinámico por negocio (colores, fuentes, logos)
- **AI-First Development:** De zero a producción en 1 mes usando AI agents
- **Production-Ready:** Usuarios reales, 114+ bookings procesados

---

## ✨ CARACTERÍSTICAS PRINCIPALES

### Para Administradores
- Dashboard con calendario interactivo
- **📊 Analytics Dashboard con métricas de engagement**
  - Ingresos totales (semanal/mensual) con trends
  - Servicios más solicitados (Top 5)
  - Clientes frecuentes (Top 10)
  - Días/horarios pico con gráficos
  - Vista histórica con tendencias temporales
- **🏷️ Terminología Adaptable (Personas vs Espacios)**
  - Selector binario para cambiar entre "Profesionales" o "Espacios"
  - Textos dinámicos en toda la app ("con Laura" vs "en Cancha 1")
  - Configuración persistente en branding del negocio
- Gestión servicios con categorías visuales
- Equipo con horarios individuales
- Clientes recurrentes con autocomplete
- Reservas manuales y especiales
- Breaks para empleados
- Sistema de seña manual con billeteras argentinas
- Branding personalizado live-preview
- Enlace público compartible con QR
- ✅ Validación de overlaps al reactivar reservas canceladas

### Para Clientes Finales
- Flujo de reserva optimizado
- Disponibilidad en tiempo real
- Confirmación por WhatsApp/Email
- Export a calendario (.ics)
- Responsive mobile-first
- Branding del negocio aplicado

---

## 🏗️ ARQUITECTURA

### Stack Tecnológico
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
Backend:   Supabase (PostgreSQL + Row Level Security)
Hosting:   Vercel (Frontend + Edge Functions)
Domain:    astraturnos.com (Namecheap → Vercel DNS)
```

### Seguridad Multi-tenant
- **RLS Policies:** Cada negocio solo ve SUS datos
- **JWT Validation:** Tokens verificados server-side
- **Edge Functions:** Operaciones críticas con service_role
- **Share Tokens:** Acceso público controlado con expiración

### Componentes Clave
```
src/
├── components/
│   ├── admin/          # Componentes del panel de administración
│   ├── auth/           # Componentes para autenticación
│   ├── common/         # Componentes reutilizables
│   ├── ui/             # Componentes de UI puros (Button, Input)
│   └── views/          # Vistas principales que componen las páginas
├── services/
│   ├── supabaseBackend.ts  # Abstracción sobre Supabase (lógica de negocio)
│   └── api.ts              # Lógica de cliente (cálculo de slots)
├── contexts/
│   ├── AuthContext.tsx     # Manejo del estado de autenticación
│   └── BusinessContext.tsx # Manejo del estado del negocio (multi-tenant)
└── utils/
    └── availability.ts   # Algoritmo de cálculo de disponibilidad

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── admin-*         # Operaciones CRUD para el panel de admin
│   └── public-*        # Endpoints para la vista pública de reservas
└── migrations/         # Evolución del schema de la base de datos
```

---

## 🚀 QUICK START

### Prerrequisitos
- Node.js 18+
- Cuenta Supabase
- Supabase CLI (opcional, para Edge Functions)

### Setup Local
```bash
# 1. Clonar e instalar
git clone [repo]
cd astra-turnos
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar .env con tus credenciales Supabase

# 3. Desarrollo
npm run dev  # http://localhost:5173
```

### Environment Variables
```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_LOG_LEVEL=info  # debug | info | warn | error
```

### Database Setup
```bash
# Aplicar migrations
supabase db push

# Verificar schema
supabase db status
```

### Deploy Edge Functions
```bash
supabase functions deploy admin-employees
supabase functions deploy admin-services
supabase functions deploy admin-businesses
supabase functions deploy public-bookings
```

---

## 🧪 TESTING

### Tests Unitarios
```bash
npm test              # Suite completa
npm test -- -t "scheduling"  # Tests específicos
```

**Coverage:** 89 tests, funcionalidad core 100%

### Tests E2E
```bash
npm run e2e           # Playwright
npm run e2e:ui        # Modo interactivo
```

**Escenarios:**
- Happy path reserva cliente
- Error handling (token expirado, slots no disponibles)
- Edge cases (múltiples servicios, horarios medianoche)

---

## 📦 BUILD Y DEPLOY

### Build Producción
```bash
npm run build         # Output: dist/
npm run preview       # Preview build local
```

**Bundle:** ~572 KB (169 KB gzip)

### Deploy Vercel
```bash
# Auto-deploy desde main branch
git push origin main

# Deploy manual
vercel --prod
```

**Environments:**
- Production: astraturnos.com
- Preview: astra-citas.vercel.app (rama feature/*)

---

## 🎯 ROADMAP

### ✅ Fase 1: Core MVP (Completado)
- Scheduling dinámico
- Clientes recurrentes
- Categorización servicios
- Header/Footer navigation
- Branding personalizado

### 📋 Fase 2: UX Polish (En Progreso)
- Reprogramar reservas
- Terminología dinámica (personas/espacios)
- PWA + SEO metadata
- Onboarding interactivo

### 🔮 Fase 3: Monetización (Planeado)
- Notificaciones WhatsApp/Email (n8n)
- Mercado Pago integration
- Seña con auto-expire
- Métricas de venta

Ver [CATALOGO_FEATURES.md](CATALOGO_FEATURES.md) para detalles completos.

---

## 🏆 HIGHLIGHTS TÉCNICOS

### Scheduling Dinámico
**Problema resuelto:** Sistema rechazaba slots disponibles después de reservas cortas.

**Solución:** Algoritmo que calcula gaps reales entre reservas.

**Impacto:** +15-30% slots disponibles, mejor aprovechamiento agenda.

```typescript
// Antes: Solo slots alineados con apertura
[14:00, 16:00, 18:00]

// Después: Cualquier gap >= duración servicio
[14:00, 14:30, 16:00, 16:30, 18:00]
```

### Multi-tenant Security
**Row Level Security** en todas las tablas:
```sql
-- Solo owner puede ver sus datos
CREATE POLICY "business_select" ON businesses
FOR SELECT USING (auth.uid() = owner_id);
```

**Resultado:** Zero data leakage confirmado por security audit.

### AI-First Development
**Timeline:** Zero código → producción completa en 1 mes.

**Team:**
- Matías: Visión estratégica (ZERO líneas código)
- Claude: Arquitectura + DB
- ChatGPT 5: Implementación frontend/backend
- Gemini 2.5: Integrations + debugging

---

## 📊 MÉTRICAS ACTUALES

**Producción (Nov 2025):**
- ✅ Usuarios reales activos
- ✅ 114+ bookings procesados
- ✅ 6 negocios registrados
- ✅ Zero downtime desde Oct 2025
- ✅ <120ms latency p95 (Argentina)

**Technical:**
- 16 tablas con RLS enabled
- 4 Edge Functions deployed
- 572 KB bundle (169 KB gzip)
- 100% tests passing

---

## ⚠️ LIMITACIONES CONOCIDAS

### Production Readiness
✅ **Listo para:**
- Pilotos individuales
- Beta testers controlados
- Negocios independientes

⚠️ **Requiere para escala:**
- Autenticación user-level (actualmente share_token)
- Performance optimization (>50 negocios)
- Monitoring avanzado
- Customer support system

Ver [SOLUCION_PROBLEMAS.md](SOLUCION_PROBLEMAS.md) para issues conocidos y fixes.

---

## 🤝 DESARROLLO

### Principios
- **Flexibility first:** Diferenciador vs competencia
- **Security by default:** RLS en todo
- **User feedback driven:** Cada feature validada
- **Documentation obsessed:** Continuidad sesiones AI
- **Production stability:** Staging mandatory

### Workflow
```
Feature Request
  ↓
Branch + Staging DB
  ↓
Implementation (AI agents)
  ↓
Testing (Unit + E2E)
  ↓
Code Review (Multi-agent)
  ↓
Preview Deploy
  ↓
Validation
  ↓
Merge to Main → Production
```

### Convenciones
- **Commits:** [Conventional Commits](https://conventionalcommits.org)
- **Branches:** `feature/*`, `fix/*`, `docs/*`
- **Tests:** Obligatorios para nuevas features
- **TypeScript:** Strict mode enabled

---

## 📞 SOPORTE

### Troubleshooting
Ver [SOLUCION_PROBLEMAS.md](SOLUCION_PROBLEMAS.md) para:
- Guías diagnóstico
- Fixes históricos
- Procedimientos emergencia
- Logs y debugging

### Documentación
- [Arquitectura](ARQUITECTURA_CORE.md) - Stack y schema
- [Features](CATALOGO_FEATURES.md) - Funcionalidades
- [API](REFERENCIA_API.md) - Endpoints y Edge Functions
- [Deploy](DESPLIEGUE_OPS.md) - CI/CD y operations
- [Decisiones](REGISTRO_DECISIONES.md) - ADRs y lecciones

### Recursos Externos
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

## 📄 LICENCIA

MIT License - Ver [LICENSE](LICENSE)

---

## 🎉 CRÉDITOS

**Desarrollo:**
- Arquitectura: Claude 4.5 Sonnet (Anthropic)
- Implementación: ChatGPT 5, Gemini 2.5 Pro, Zai GML 4.6
- Visión y Dirección: Matías (Product Owner)

**Features Recientes:**
- Analytics Dashboard (4 Dic 2025): Claude 4.5 Sonnet
- Payment Fields System (3 Dic 2025): Claude 4.5 Sonnet
- Clients Management (31 Oct 2025): Zai GML 4.6
- Scheduling Dinámico (26 Oct 2025): ChatGPT 5

**Stack:**
- React Team (Frontend framework)
- Supabase (Backend platform)
- Vercel (Hosting + Edge)
- Tailwind Labs (Styling)
- Recharts (Data visualization)

---

*"El negocio que se mide, crece. El negocio que se visualiza, se disfruta."* 📊✨

---

**Proyecto:** ASTRA Multi-tenant SaaS  
**Dominio:** [astraturnos.com](https://astraturnos.com)  
**Status:** ✅ Production-Ready  
**Último deploy:** Nov 2025  
**Version:** 0.5.0
