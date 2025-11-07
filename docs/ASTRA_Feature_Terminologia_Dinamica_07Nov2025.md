# ASTRA - Feature: Terminología Dinámica (Personas vs Espacios)

**Fecha:** 7 Noviembre 2025  
**Identificado por:** Matías (Product Owner)  
**Tipo:** Enhancement - Market Expansion  
**Prioridad:** P2 - MEDIUM  
**Estimación:** 4-6 horas  
**Estado:** PENDIENTE IMPLEMENTACIÓN

---

## 🎯 PROBLEMA

**Dos tipos de mercado, una terminología:**

**Servicios con PERSONAS:**
- Estéticas, médicos, terapeutas, veterinarias
- Terminología actual ("empleados", "¿Con quién querés atenderte?") → ✅ Coherente

**Servicios en ESPACIOS:**
- Clubes, canchas, salones de eventos
- Terminología actual ("empleados", "¿Con quién querés atenderte?") → ❌ Confuso/incoherente

**Ejemplo problema real:**
- Admin crea "Cancha 1" como "empleado"
- Cliente ve: "¿Con quién querés atenderte? Cancha 1" → Incoherente

**Impacto:** Segmento completo de mercado (espacios físicos) tiene UX degradada

---

## ✅ SOLUCIÓN PROPUESTA

### Opción A: Terminología Dinámica (SELECCIONADA)

**Approach:** Admin define tipo de recurso en setup inicial

**Setup wizard:**
```
¿Tu negocio trabaja con...?
○ Personas (empleados, profesionales, staff)
○ Espacios (canchas, salones, consultorios)
○ Personalizado
```

**Resultado:**
- **Estética** → "¿Con quién querés atenderte? Laura / Ana"
- **Club** → "¿Qué espacio preferís? Cancha 1 / Cancha 2"

**Schema:**
```sql
ALTER TABLE businesses ADD COLUMN resource_type TEXT DEFAULT 'personal';
ALTER TABLE businesses ADD COLUMN resource_label_singular TEXT DEFAULT 'empleado';
ALTER TABLE businesses ADD COLUMN resource_label_plural TEXT DEFAULT 'empleados';
ALTER TABLE businesses ADD COLUMN resource_question TEXT DEFAULT '¿Con quién querés atenderte?';
```

**Implementación:**
- Refactor strings hardcoded → Variables dinámicas
- Preset templates (personal/spaces/custom)
- Settings para cambiar después

**Migración cuenta existente:**
- Default = "personal" (comportamiento actual)
- Modal one-time para personalizar (opcional)
- Zero breaking changes

---

## 📊 IMPACTO

**Técnico:**
- Esfuerzo: 4-6 hrs
- Scope: ~15-20 strings a refactorizar
- Risk: Bajo (feature aditiva)

**Negocio:**
- Desbloquea segmento espacios físicos
- Market expansion significativa
- UX coherente para ambos tipos

**Edge cases a considerar:**
- Negocios mixtos (gym con trainers + canchas) → Solución futura
- Traducciones i18n → Labels custom NO se traducen

---

## ✅ APROBACIÓN

**Propuesto por:** Matías - 7 Nov 2025  
**Analizado por:** Claude - 7 Nov 2025  
**Status:** ✅ APROBADO - Ready for roadmap

**Próximo paso:** Priorizar en roadmap vs otras features

---

*Documento creado: 7 Noviembre 2025*  
*Detalles implementación: A definir por agente ejecutor*
