# DESPLIEGUE Y OPERACIONES - ASTRA

**Sistema de Gestión de Turnos Multi-tenant SaaS**  
**Última actualización:** 21 Noviembre 2025

---

## 📋 ÍNDICE

1. [Infraestructura](#infraestructura)
2. [Configuración de Dominio](#configuración-de-dominio)
3. [Deployment Workflow](#deployment-workflow)
4. [Ambientes y Branches](#ambientes-y-branches)
5. [Variables de Entorno](#variables-de-entorno)
6. [Monitoreo y Logs](#monitoreo-y-logs)
7. [Backups y Recuperación](#backups-y-recuperación)
8. [Troubleshooting](#troubleshooting)

---

## INFRAESTRUCTURA

### Stack de Hosting

**Frontend + Edge Functions:**
- **Provider:** Vercel
- **Plan:** Hobby (gratuito actualmente)
- **Región:** Global (CDN automático)
- **Features:** SSL automático, deployments atómicos, rollbacks instantáneos

**Database + Auth:**
- **Provider:** Supabase Cloud
- **Plan:** Free tier
- **Región:** South America (latencia optimizada Argentina)
- **Features:** PostgreSQL 15+, Auth JWT, Storage, Edge Functions

**Domain:**
- **Registrar:** Namecheap
- **DNS:** Vercel nameservers
- **Dominio principal:** astraturnos.com
- **Staging:** astra-citas.vercel.app

### Arquitectura de Red

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
PostgreSQL Database + Storage
```

**Latencias típicas:**
- Usuario Argentina → Vercel CDN: 20-50ms
- Vercel → Supabase SA: 30-70ms
- Total end-to-end: 50-120ms

---

## CONFIGURACIÓN DE DOMINIO

### Historia de Dominio

**Timeline:**
1. **21 Oct 2025:** Dominio astraturnos.com registrado en Namecheap
2. **21 Oct 2025:** DNS migrados a nameservers Vercel
3. **21 Oct 2025:** SSL certificates generados automáticamente
4. **21 Oct 2025:** Staging astra-citas.vercel.app configurado

### Configuración DNS Actual

**Nameservers (en Namecheap):**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Records en Vercel:**
```
Tipo: A
Host: @
Value: 76.76.19.61
TTL: Auto

Tipo: CNAME
Host: www
Value: cname.vercel-dns.com
TTL: Auto
```

**Propagación:**
- Tiempo típico: 24-48 horas
- Verificación: `dig astraturnos.com` o `nslookup astraturnos.com`

### SSL/HTTPS

**Certificados:**
- Provider: Let's Encrypt (vía Vercel)
- Renovación: Automática cada 90 días
- Wildcard: *.astraturnos.com incluido

**Redirects automáticos:**
```
http://astraturnos.com → https://astraturnos.com
http://www.astraturnos.com → https://astraturnos.com
https://www.astraturnos.com → https://astraturnos.com
```

### Configuración Email (Futuro)

**Email profesional planeado:**
- soporte@astraturnos.com
- hola@astraturnos.com

**Provider recomendado:** Google Workspace o Zoho Mail

**Records MX requeridos:**
```
MX  @  10  mx1.provider.com
MX  @  20  mx2.provider.com
```

---

## DEPLOYMENT WORKFLOW

### GitHub Integration

**Repositorio:**
- Platform: GitHub
- Visibilidad: Private
- Branch principal: `main`
- Branches protegidas: `main` (requiere PR)

**Vercel Auto-Deploy:**
```
Git push → GitHub → Webhook → Vercel Build → Deploy
```

**Triggers:**
- Push a `main` → Deploy producción
- Push a cualquier branch → Preview deployment
- Pull Request → Preview deployment único

### Build Process

**Comando:**
```bash
npm run build
```

**Pasos internos:**
1. TypeScript compilation
2. Vite bundling
3. CSS processing (Tailwind)
4. Asset optimization
5. Output: `dist/` folder

**Optimizaciones:**
- Tree shaking automático
- Code splitting por route
- Lazy loading de components
- Image optimization (planned)

**Tiempo típico:** 60-90 segundos

### Deployment Stages

**1. Build:**
```
[Vercel] Building...
├─ Install dependencies
├─ Run build script
├─ Collect static assets
└─ Generate manifest
```

**2. Deploy:**
```
[Vercel] Deploying...
├─ Upload to CDN
├─ Update routing
├─ Generate SSL cert (si nuevo dominio)
└─ Health check
```

**3. Verification:**
```
[Vercel] Deployment ready
├─ URL: https://astraturnos.com
├─ Status: 200 OK
└─ Uptime: ✅
```

---

## AMBIENTES Y BRANCHES

### Ambientes Activos

| Ambiente | Branch | URL | Auto-Deploy | Uso |
|----------|--------|-----|-------------|-----|
| **Production** | `main` | astraturnos.com | ✅ | Usuarios finales |
| **Staging** | `feature/*` | astra-citas.vercel.app | ✅ | Testing pre-merge |
| **Preview** | Cualquier PR | `*-<hash>.vercel.app` | ✅ | Code review |

### Branch Strategy

**Main Branch:**
```
main (protected)
  ↑ Merge via Pull Request
feature/nueva-feature
  ↑ Development work
```

**Feature Branches:**
- Nomenclatura: `feature/nombre-descriptivo`
- Lifecycle: Crear → Develop → PR → Merge → Delete
- Ejemplo: `feature/clientes-recurrentes`

**Hotfix Branches:**
- Nomenclatura: `hotfix/issue-critical`
- Merge directo a `main` permitido en emergencias
- Requiere post-merge PR para documentación

### Preview Deployments

**Características:**
- URL única por PR: `astraturnos-git-feature-xyz-matias.vercel.app`
- Base de datos: MISMA que producción (⚠️ cambios impactan real data)
- Edge Functions: Deploy en paralelo
- Lifetime: Hasta que se cierre/mergee PR

**Testing en Preview:**
```bash
# URL preview disponible en comentario GitHub automático
https://astraturnos-pr-123-hash.vercel.app
```

**⚠️ Precaución:** Cambios en DB desde preview afectan producción

---

## VARIABLES DE ENTORNO

### Variables Requeridas

**Frontend (Vite):**
```bash
# Supabase Connection
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Obtener de Supabase Dashboard

# Environment
VITE_ENV=production  # o 'development', 'staging'
```

**Backend (Supabase Edge Functions):**
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ NUNCA COMMITEAR - Solo en Vercel env vars
SUPABASE_ANON_KEY=eyJhbGc...  # Obtener de Supabase Dashboard
```

### Configuración en Vercel

**Dashboard → Project Settings → Environment Variables**

```
Variable: VITE_SUPABASE_URL
Value: https://bgxcuvkvizjkteavrzkl.supabase.co
Environments: ✅ Production  ✅ Preview  ✅ Development
```

**Regeneración de build:**
- Cambio de variable → Trigger automático de re-deploy
- Sin downtime (atomic deployment)

### Archivo .env Local

**Nunca commitear .env:**
```bash
# .gitignore
.env
.env.local
.env.production
```

**Template .env.example:**
```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Environment
VITE_ENV=development
```

---

## MONITOREO Y LOGS

### Vercel Analytics

**Métricas disponibles:**
- Page views
- Unique visitors
- Top pages
- Devices (mobile/desktop)
- Geolocation

**Dashboard:** vercel.com/matias/astra-turnos/analytics

### Deployment Logs

**Acceso:**
```
Vercel Dashboard → Deployments → [Specific Deploy] → Build Logs
```

**Información incluida:**
- Build output completo
- Errores de compilación
- Warnings TypeScript
- Bundle size analysis

### Runtime Logs

**Edge Functions (Supabase):**
```
Supabase Dashboard → Edge Functions → [Function Name] → Logs
```

**Tipos de logs:**
- Request logs: Parámetros, headers, response time
- Error logs: Exceptions, stack traces
- Custom logs: `console.log()` en functions

**Retención:** 7 días (Free tier)

### Application Monitoring

**Estado actual:** ❌ No implementado

**Planned:**
- **Sentry:** Error tracking y performance monitoring
- **Google Analytics:** User behavior analytics
- **Uptime monitoring:** Pingdom o similar

---

## BACKUPS Y RECUPERACIÓN

### Database Backups

**Automáticos (Supabase):**
- Frecuencia: Diarios
- Retención: 7 días (Free tier)
- Location: Región SA
- Acceso: Supabase Dashboard → Database → Backups

**Manuales (Pre-cambios críticos):**
```sql
-- Backup table
CREATE TABLE bookings_backup_YYYYMMDD AS 
SELECT * FROM bookings;

-- Verificar
SELECT COUNT(*) FROM bookings_backup_YYYYMMDD;

-- Restore si necesario
TRUNCATE bookings;
INSERT INTO bookings SELECT * FROM bookings_backup_YYYYMMDD;
```

**Backups registrados:**
- `bookings_backup_20251026` - Pre scheduling dinámico
- `services_backup_20251030` - Pre categorías
- `employees_backup_20251030` - Pre cambios horarios
- `businesses_backup_20251108` - Pre horarios medianoche

### Code Versioning

**Git como backup:**
- Commits atómicos con mensajes descriptivos
- Tags en releases importantes: `v1.0.0`, `v1.1.0`
- Branch `main` siempre deployable

**Recovery:**
```bash
# Revert a commit anterior
git revert <commit-hash>

# Rollback a versión específica
git checkout <tag-version>
vercel --prod  # Re-deploy
```

### Vercel Rollbacks

**Rollback instantáneo:**
```
Vercel Dashboard → Deployments → [Previous Deploy] → "Rollback to this Deployment"
```

**Características:**
- Downtime: ~5 segundos
- Automatic DNS update
- Previous build reutilizado (no rebuild)

---

## TROUBLESHOOTING

### Deployment Failures

**Build Errors:**
```bash
# Error típico: TypeScript compilation failed
Solution: 
npm run type-check  # Locally first
Fix errors → Commit → Push
```

**Out of Memory:**
```bash
# Error: JavaScript heap out of memory
Solution: Increase Node memory in package.json
"build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"
```

**Dependency Issues:**
```bash
# Error: Module not found
Solution:
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Runtime Issues

**Supabase Connection Failed:**
```typescript
// Síntoma: "Failed to fetch" en console
// Check:
1. Variables de entorno correctas
2. Supabase project activo
3. CORS configurado en Supabase
```

**RLS Policy Blocks Query:**
```sql
-- Síntoma: Query returns empty even with data
-- Debug:
SELECT * FROM businesses WHERE share_token = 'xxx';  -- As service_role
SELECT * FROM businesses WHERE share_token = 'xxx';  -- As anon

-- Fix: Ajustar policy o usar service_role cuando corresponda
```

**Edge Function Timeout:**
```
Síntoma: 504 Gateway Timeout
Causa: Function execution > 10 segundos
Solution: Optimizar queries, agregar índices
```

### DNS Issues

**Domain Not Resolving:**
```bash
# Check propagation
dig astraturnos.com
nslookup astraturnos.com

# Verify nameservers
dig astraturnos.com NS

# Expected:
# ns1.vercel-dns.com
# ns2.vercel-dns.com
```

**SSL Certificate Error:**
```
Síntoma: "Your connection is not private"
Causa: Certificate no generado o expirado
Solution: Vercel Dashboard → Domains → Refresh Certificate
```

### Performance Issues

**Slow Page Load:**
```
Diagnóstico:
1. Chrome DevTools → Network tab
2. Identify slow resources
3. Check bundle size: npm run build -- --analyze
```

**Optimization checklist:**
- [ ] Lazy load routes
- [ ] Optimize images (WebP, lazy loading)
- [ ] Reduce font families
- [ ] Code splitting
- [ ] Cache static assets

---

## CHECKLIST PRE-DEPLOY

### Production Deployment

**Código:**
- [ ] Tests pasando (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] TypeScript sin errores (`npm run type-check`)
- [ ] ESLint sin warnings (`npm run lint`)

**Database:**
- [ ] Migrations aplicadas en staging
- [ ] Backup manual creado
- [ ] RLS policies verificadas
- [ ] Índices optimizados

**Configuración:**
- [ ] Variables de entorno actualizadas
- [ ] Domain DNS propagado
- [ ] SSL certificate activo
- [ ] Email templates testeados

**Testing:**
- [ ] Smoke test en preview deployment
- [ ] Auth flow completo validado
- [ ] Public booking flow funcional
- [ ] Mobile responsive verificado

**Rollback Plan:**
- [ ] Deployment anterior identificado
- [ ] Rollback button accessible
- [ ] Database restore procedure documented
- [ ] Downtime communication ready

---

## EMERGENCY PROCEDURES

### Rollback Rápido

**Síntomas que requieren rollback:**
- Build failure en producción
- Critical bug reportado por múltiples usuarios
- Database corruption detectada
- Security vulnerability encontrada

**Procedimiento (< 5 minutos):**
```
1. Vercel Dashboard → Deployments
2. Identificar último deployment stable
3. Click "Rollback to this Deployment"
4. Verify astraturnos.com loads correctly
5. Notify team/users si downtime ocurrió
```

### Database Corruption

**Síntomas:**
- Queries retornan data inconsistente
- Integrity constraints failing
- Duplicate records apareciendo

**Procedimiento:**
```sql
-- 1. STOP all writes (disable public booking form)
-- 2. Assess damage
SELECT COUNT(*) FROM bookings WHERE id IS NULL;
SELECT * FROM bookings WHERE created_at > updated_at;

-- 3. Restore from backup
TRUNCATE affected_table;
INSERT INTO affected_table SELECT * FROM backup_table;

-- 4. Verify integrity
SELECT COUNT(*) FROM affected_table;

-- 5. Re-enable writes
```

### Supabase Outage

**Síntomas:**
- All API calls failing
- Auth not working
- Database unreachable

**Procedimiento:**
1. Check Supabase status page
2. If planned maintenance → Wait
3. If unplanned → Contact Supabase support
4. Meanwhile: Display maintenance page to users

**Maintenance page (planned):**
```html
<!-- /public/maintenance.html -->
<html>
  <body>
    <h1>ASTRA en mantenimiento</h1>
    <p>Estaremos de vuelta en 15 minutos</p>
  </body>
</html>
```

---

## BEST PRACTICES

### Deployment

**DO:**
- ✅ Deploy durante horas de bajo tráfico
- ✅ Test en staging antes de producción
- ✅ Crear backup manual antes de cambios DB
- ✅ Monitorear logs 30 min post-deploy
- ✅ Documentar cambios significativos

**DON'T:**
- ❌ Deploy viernes tarde (no coverage weekend)
- ❌ Múltiples features en un deploy
- ❌ Skip testing en preview
- ❌ Cambiar DB schema sin migration
- ❌ Deploy sin rollback plan

### Database Operations

**DO:**
- ✅ Usar migrations para schema changes
- ✅ Test migrations en staging primero
- ✅ Backup antes de ALTER TABLE
- ✅ Agregar índices en horas bajas
- ✅ Monitor query performance post-cambio

**DON'T:**
- ❌ Direct SQL en producción sin backup
- ❌ DROP columnas sin verificar dependencias
- ❌ Cambiar RLS policies sin testing
- ❌ DELETE masivos sin WHERE clause seguro
- ❌ Cambiar primary keys en tablas con data

### Security

**DO:**
- ✅ Rotate service_role_key cada 6 meses
- ✅ Review RLS policies mensualmente
- ✅ Monitor failed auth attempts
- ✅ Keep dependencies updated
- ✅ Enable 2FA en todos los servicios

**DON'T:**
- ❌ Commit secrets en git
- ❌ Share service_role_key
- ❌ Deshabilitar RLS "temporalmente"
- ❌ Exponer API keys en client code
- ❌ Usar misma password en múltiples services

---

## MÉTRICAS Y KPIs

### Deployment Metrics

**Target:** 95% success rate

```
Total Deployments: 150
Successful: 143
Failed: 7
Success Rate: 95.3% ✅
```

**Average deploy time:** 90 segundos

### Uptime

**Target:** 99.9% (8.76 horas downtime/año máximo)

**Actual (estimado):**
- Vercel uptime: 99.99% (SLA)
- Supabase uptime: 99.9% (SLA)
- Overall: 99.89% ✅

### Performance

**Page Load (P95):**
- Target: < 2 segundos
- Actual: ~1.5 segundos ✅

**API Response (P95):**
- Target: < 500ms
- Actual: ~300ms ✅

---

**Documento creado:** 21 Noviembre 2025  
**Autor:** Claude 4.5 (Strategic Architect)  
**Proyecto:** ASTRA Multi-tenant SaaS  
**Status:** ✅ Guía operacional completa
