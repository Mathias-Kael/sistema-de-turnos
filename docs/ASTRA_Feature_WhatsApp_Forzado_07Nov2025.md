# ASTRA - Documentación Técnica: WhatsApp Forzado

**Fecha:** 7 Noviembre 2025

---

## 1. Nombre de la Característica
WhatsApp forzado

## 2. Objetivo
Redirección automática del cliente a WhatsApp (al número del negocio o empleado) inmediatamente después de la confirmación de una reserva, eliminando la pantalla intermedia de confirmación.

## 3. Contexto y Razón de Ser
Esta implementación surge de la necesidad de mitigar los "no-shows" y maximizar la conversión de reservas, tal como se describe en la Fase 1 del [`ASTRA_Roadmap_Priorizado_Final_07Nov2025.md`](docs/ASTRA_Roadmap_Priorizado_Final_07Nov2025.md). Anteriormente, después de confirmar una reserva, el cliente era dirigido a una pantalla intermedia que le pedía hacer clic en un botón para confirmar vía WhatsApp. Esta dinámica resultaba en que muchos clientes abandonaban la aplicación sin completar la confirmación por WhatsApp.

La nueva implementación busca simplificar este flujo, forzando la interacción con WhatsApp en el momento de la confirmación, lo que se espera que aumente significativamente la tasa de confirmación y reduzca los no-shows. Esta es una solución temporal y de "quick win" hasta que se implementen sistemas de notificación más avanzados.

## 4. Archivos Modificados

### [`components/common/ConfirmationModal.tsx`](components/common/ConfirmationModal.tsx)
Este archivo es el componente principal que gestiona la lógica de confirmación de la reserva y la interacción post-confirmación. Las modificaciones clave realizadas son:

*   **Eliminación del estado `isConfirmed`:** Se eliminó el estado local `isConfirmed` que controlaba la visualización de la pantalla intermedia de "Turno Confirmado".
*   **Redirección directa a WhatsApp:** Una vez que la reserva es guardada exitosamente (ya sea a través del `dispatch` del contexto o la función `public-bookings` de Supabase), se construye la URL de WhatsApp utilizando la lógica existente (`whatsappConfig`). Inmediatamente después, se abre esta URL en una nueva pestaña (`window.open(whatsappConfig.url, '_blank');`).
*   **Cierre del modal:** Tras la redirección, el modal de confirmación se cierra automáticamente (`onClose();`), eliminando la necesidad de interacción adicional por parte del usuario en la aplicación.
*   **Reubicación de la lógica `whatsappConfig`:** La generación de `whatsappConfig` se movió dentro del bloque `try` del `handleConfirm` para asegurar que se ejecute solo después de una confirmación exitosa y para poder utilizar `normName` (nombre normalizado del cliente) en el mensaje de WhatsApp.

## 5. Archivos Analizados (y su Relevancia)

### [`components/views/PublicClientLoader.tsx`](components/views/PublicClientLoader.tsx)
Este componente es responsable de cargar la información del negocio y validar el token de acceso público antes de mostrar la experiencia de reserva al cliente. Fue analizado para entender el punto de entrada del flujo de reserva público y cómo se pasa la información del negocio a los componentes hijos. Aunque no se modificó directamente, su análisis confirmó que `ClientBookingExperience` es el componente principal que recibe la información del negocio y, por ende, el `ConfirmationModal` es el lugar adecuado para la lógica de confirmación.

### [`components/views/ClientBookingExperience.tsx`](components/views/ClientBookingExperience.tsx)
Este componente orquesta la experiencia completa de reserva para el cliente, incluyendo la selección de servicios, empleados, fecha y hora. Fue analizado para identificar cómo se invoca el `ConfirmationModal` y qué propiedades se le pasan. Se confirmó que el `ConfirmationModal` es el último paso en el flujo de reserva antes de la confirmación final, lo que lo convierte en el lugar ideal para implementar la redirección forzada a WhatsApp.

## 6. Detalles de Implementación

### Construcción de la URL de WhatsApp
La construcción de la URL de WhatsApp se realiza utilizando la función `buildWhatsappUrl` de [`utils/whatsapp.ts`](utils/whatsapp.ts). Esta función se encarga de:
*   Sanitizar el número de teléfono.
*   Determinar si se debe usar el número del empleado o el número general del negocio.
*   Codificar el mensaje de WhatsApp para asegurar que los caracteres especiales se manejen correctamente.

El mensaje de WhatsApp incluye detalles de la reserva como los servicios, la fecha, la hora y el nombre del cliente, lo que proporciona un contexto claro para el receptor.

### Consideraciones de Error
En caso de que la reserva falle, el modal mostrará un mensaje de error y no se intentará la redirección a WhatsApp. La lógica de manejo de errores existente se mantiene intacta.

### Dependencias
La implementación se basa en las utilidades de WhatsApp existentes en [`utils/whatsapp.ts`](utils/whatsapp.ts) y en el flujo de confirmación de reservas ya establecido, ya sea a través del contexto de negocio (para usuarios administradores) o de la función Edge `public-bookings` de Supabase (para clientes públicos). No se introdujeron nuevas dependencias externas.

### Escalabilidad y Deuda Técnica
La solución se diseñó para ser simple y reutilizar la lógica existente, minimizando la deuda técnica. La redirección directa es una medida provisional que puede ser reemplazada por un sistema de notificaciones más sofisticado en el futuro sin afectar la lógica central de reserva.