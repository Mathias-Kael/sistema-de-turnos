# ASTRA - Roadmap Priorizado 2025-2026

**Fecha:** 7 Noviembre 2025  
**Criterios:** Market blockers → Quick wins → Impact/Effort → Dependencies → Stability

---

## 🚀 FASE 1: QUICK WINS (1-2 semanas)

### P0 - Crítico Inmediato
**1. WhatsApp forzado** - 30 min
- Mitiga no-shows YA sin sistema notificaciones
- Zero risk, máximo impact conversión

**2. PWA + SEO metadata** - 2-3 hrs
- Branding profesional en Google/home screen
- Botón install práctica (UX friction reducida)

### P1 - Bloqueos Mercado
**3. Horarios medianoche** - 2-3 hrs
- Desbloquea: Canchas, bares, boliches, gimnasios 24h
- Market expansion ~25%

**4. Terminología dinámica** - 4-6 hrs
- Desbloquea: Espacios físicos (canchas, salones)
- UX coherente ambos mercados

---

## 📈 FASE 2: FEATURES CORE (2-3 semanas)

### P1 - Pain Points Validados
**5. Reprogramar reservas** - 3-4 hrs
- Solicitado por usuarios reales
- Quick win conversión (menos cancelaciones)

**6. Onboarding interactivo** - 3-4 hrs
- Primera impresión crítica
- Reduce abandono cuentas nuevas

### P2 - Value Add
**7. Métricas de venta** - 6-8 hrs
- Dashboard MVP con queries simples
- Dependencia: Tabla clients ya existe

**8. Notificaciones** - 2-4 hrs + n8n setup
- Reduce no-shows significativamente
- Approach: n8n (zero risk core)

---

## 💳 FASE 3: MONETIZACIÓN (4-6 semanas)

### P2 - Requiere Mercado Pago Primero
**9. Mercado Pago integración** - 6-8 hrs
- Checkout + webhooks
- Foundation para seña

**10. Seña con auto-expire** - 3-4 hrs
- Post-MP implementation
- High-value services protection

---

## 🔧 FASE 4: POLISH (Ongoing)

### P2-P3 - Maintenance
**11. Bugs menores**
- Autocomplete clientes reset
- Loading states
- Toasts custom vs alerts

**12. Performance**
- Code deduplication
- Bundle optimization
- Query optimization

---

## 📊 TIMELINE ESTIMADO

**Fase 1:** Semana 1-2 (10-14 hrs)  
**Fase 2:** Semana 3-5 (18-24 hrs)  
**Fase 3:** Semana 6-10 (9-12 hrs)  
**Fase 4:** Continuous

**Total Fase 1-3:** ~8-10 semanas para features completas

---

## 🎯 RATIONALE PRIORIZACIÓN

**Por qué este orden:**

1. **WhatsApp forzado primero:** Máximo ROI (30 min = fix no-shows crítico)
2. **PWA/SEO temprano:** Branding profesional desde día 1
3. **Market blockers antes que nice-to-haves:** Horarios + terminología desbloquean segmentos
4. **Reprogramar early:** Pain point validado, quick win
5. **Onboarding antes que features avanzadas:** Primera impresión importa
6. **Métricas/notificaciones mid-phase:** Value add sin bloquear core
7. **Mercado Pago late:** Complejo, requiere testing exhaustivo
8. **Polish continuous:** No bloquea adoption

---

## ⚠️ DEPENDENCIES MAP

```
Seña auto-expire
    ↑ requiere
Mercado Pago ←── (puede ir paralelo) ──→ Notificaciones
    
Métricas
    ↑ aprovecha
Tabla clients (ya existe desde Clientes Recurrentes)

Todo lo demás: INDEPENDIENTE (puede ir paralelo)
```

---

## 🚦 GATES DE DECISIÓN

**Post-Fase 1 (2 semanas):**
- Validar adoption horarios medianoche
- Medir impact WhatsApp forzado
- → Ajustar prioridades Fase 2 si necesario

**Post-Fase 2 (5 semanas):**
- Feedback onboarding
- Usage métricas dashboard
- → Decidir timing Mercado Pago

**Post-Fase 3 (10 semanas):**
- Revenue con seña
- Conversion MP
- → Roadmap monetización extendido

---

## ✅ APROBACIÓN

**Priorizado por:** Claude (criterios acordados con Matías)  
**Fecha:** 7 Nov 2025  

**Next step:** Matías aprueba priorización → Comenzar Fase 1 (WhatsApp forzado)

---

*Este roadmap es dinámico. Ajustar según feedback usuarios y métricas reales.*
