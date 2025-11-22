# Informe de Revisión: `copilot-instrucciones.md`

**Fecha:** 22 de Noviembre de 2025
**Auditor:** Kilo Code

## 1. Resumen Ejecutivo

El archivo `copilot-instrucciones.md` es una guía de alta calidad y densidad informativa para los agentes de IA que trabajan en el proyecto ASTRA. Contiene reglas críticas, patrones de arquitectura y mejores prácticas que son fundamentales para mantener la integridad del código.

La revisión ha identificado áreas de mejora principalmente relacionadas con la **claridad de la terminología**, la **precisión de algunas rutas y comandos**, y la **consistencia con la documentación maestra** recientemente actualizada. Las correcciones propuestas buscan eliminar cualquier ambigüedad y asegurar que las instrucciones sean lo más precisas y accionables posible.

## 2. Hallazgos y Sugerencias de Mejora

A continuación se detallan las propuestas de cambio, siguiendo el formato: **Original**, **Revisión Propuesta** y **Justificación**.

---

### 2.1. Ambigüedad del Término "Claude"

**Problema:** El término "Claude" se usa de forma genérica, lo que podría llevar a confusión entre el rol de arquitecto y la herramienta específica de escritorio.

**Sugerencia 1:**
*   **Original (Línea 15):** `❌ NUNCA modificar schema DB - Solo Claude (arquitecto) tiene acceso`
*   **Revisión Propuesta:** `❌ NUNCA modificar schema DB - Solo el rol de Arquitecto (actualmente asignado a Claude Desktop) tiene acceso a la base de datos.`
*   **Justificación:** Clarifica que la restricción está ligada al **rol** de arquitecto y a la **herramienta específica** (`Claude Desktop`) que tiene las credenciales, no a una entidad genérica "Claude".

**Sugerencia 2:**
*   **Original (Línea 700):** `Coordinación con Claude (Arquitecto)`
*   **Revisión Propuesta:** `Coordinación con el rol de Arquitecto (Claude Desktop)`
*   **Justificación:** Mantiene la consistencia en la terminología, reforzando la distinción entre el rol y la herramienta.

---

### 2.2. Inconsistencia en Rutas de Archivos

**Problema:** Algunas rutas de archivos en las instrucciones no coinciden exactamente con la estructura real del proyecto.

**Sugerencia 3:**
*   **Original (Línea 35):** `src/context/BusinessContext.tsx`
*   **Revisión Propuesta:** `src/contexts/BusinessContext.tsx` (plural)
*   **Justificación:** Alinea la ruta con la estructura de directorios real del proyecto (`contexts/` en plural).

**Sugerencia 4:**
*   **Original (Línea 580):** `¿Leer documentación en /mnt/project/?`
*   **Revisión Propuesta:** `¿Leer documentación en docs/documentacion-maestra-ASTRA/?`
*   **Justificación:** Reemplaza la ruta genérica `/mnt/project/` con la ruta específica y correcta de la documentación maestra, haciendo la instrucción directamente accionable.

---

### 2.3. Precisión Técnica y Comandos

**Problema:** Algunos comandos o descripciones técnicas pueden ser más precisos.

**Sugerencia 5:**
*   **Original (Línea 83):** `return <TokenValidationView token={token} />; // Vista Cliente`
*   **Revisión Propuesta:** `return <PublicClientLoader token={token} />; // Vista Cliente`
*   **Justificación:** El componente real que se encarga de la carga de la vista pública es `PublicClientLoader.tsx`, no `TokenValidationView`. Esto corrige la referencia técnica.

**Sugerencia 6:**
*   **Original (Línea 225):** `createBooking(booking)`: **Llama a `create_booking_safe` en PostgreSQL**
*   **Revisión Propuesta:** `createBookingSafe(booking)`: **Llama al RPC `create_booking_safe` en Supabase**
*   **Justificación:** El nombre de la función en `supabaseBackend.ts` es `createBookingSafe` (no `createBooking`). Aclara que se invoca como un RPC (Remote Procedure Call) a través de Supabase, lo que es más preciso que decir "en PostgreSQL" directamente.

---

### 2.4. Claridad y Estructura

**Problema:** Algunas secciones pueden beneficiarse de una redacción más directa o un mejor formato para mejorar la legibilidad.

**Sugerencia 7:**
*   **Original (Línea 244):** `Edge Functions (Solo lectura - No modificar sin specs)`
*   **Revisión Propuesta:** `Edge Functions (Implementación de API Backend)`
*   **Justificación:** El subtítulo "Solo lectura" es confuso, ya que estas funciones realizan operaciones de escritura (CRUD). "Implementación de API Backend" describe mejor su propósito. La restricción de no modificar sin especificaciones ya está implícita en el protocolo de desarrollo.

**Sugerencia 8:**
*   **Original (Línea 255):** `Función PostgreSQL Crítica:`
*   **Revisión Propuesta:** `Stored Procedure Crítica (PostgreSQL):`
*   **Justificación:** "Stored Procedure" es el término técnico más preciso para `create_booking_safe`, lo que mejora la claridad para un desarrollador.

**Sugerencia 9:**
*   **Original (Línea 648):**
    ```bash
    # Leer documentación relevante
    cat docs/documentacion-maestra-ASTRA/CATALOGO_FEATURES.md
    ```
*   **Revisión Propuesta:**
    ```bash
    # 1. Leer la documentación relevante para entender el contexto
    # Ejemplo:
    # cat docs/documentacion-maestra-ASTRA/CATALOGO_FEATURES.md
    # cat docs/documentacion-maestra-ASTRA/ARQUITECTURA_CORE.md
    ```
*   **Justificación:** Hace que el paso sea más explícito sobre su propósito ("entender el contexto") y ofrece un ejemplo más completo, sugiriendo que se debe leer más de un archivo si es necesario.

## 3. Conclusión

Las correcciones propuestas son mayormente ajustes finos que refuerzan la calidad y precisión de un documento ya sólido. Al implementar estos cambios, las `copilot-instrucciones.md` quedarán perfectamente sincronizadas con la documentación maestra y el estado actual del código, minimizando el riesgo de errores por ambigüedad o información desactualizada.