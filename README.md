# Sistema de Turnos Escalable

Una aplicación web que permite a cualquier negocio que trabaje con reservas gestionar su agenda, tomar reservas online y personalizar su branding. Está construida para ser completamente autónoma, funcionando del lado del cliente y guardando toda la configuración en el `localStorage` del navegador.

---

## ✨ Características Principales

*   **Panel de Administración Completo (`AdminView`):**
    *   **Info y Estilo:** Edita el nombre del negocio, logo, descripción y personaliza en vivo los colores primario, secundario, de texto y la tipografía.
    *   **Servicios:** Crea, edita y elimina servicios, definiendo duración, precio, buffer (tiempo extra), y asignando qué empleados pueden realizarlos.
    *   **Empleados:** Gestiona al personal, incluyendo sus nombres y avatares.
    *   **Horarios:** Configura los horarios de trabajo para cada día de la semana, con soporte para turnos partidos (múltiples intervalos por día).
    *   **Reservas:** Visualiza un calendario con todas las reservas, mira sus detalles, cambia su estado e incluso crea reservas manualmente para clientes.
    *   **Compartir:** Genera un enlace único y un código QR para que los clientes accedan a la agenda. Incluye opciones para pausar, revocar o establecer una fecha de caducidad para el enlace.
    *   **Vista Previa:** Previsualiza la vista del cliente en tiempo real sin salir del panel.

*   **Vista de Cliente Intuitiva (`ClientView`):**
    *   **Flujo de Reserva Guiado:** Un proceso simple en pasos: Selección de servicio(s) -> Empleado -> Fecha -> Hora.
    *   **Cálculo de Disponibilidad:** El sistema calcula inteligentemente los horarios libres basándose en la duración de los servicios, los horarios de apertura y las reservas ya existentes.
    *   **Confirmación de Reserva:** Un formulario final para que el cliente ingrese sus datos y confirme el turno, con opciones para añadir al calendario (ICS) o confirmar por WhatsApp.

---

## 🆕 Nuevas Características y Mejoras

Este proyecto ha pasado por varias fases de refactorización y mejora para optimizar su arquitectura, añadir funcionalidades clave y mejorar la experiencia de usuario y la estabilidad.

### Historial de Fases y Registro de Cambios

#### **Fase 1: Refactorización Arquitectónica**
*   **Objetivo:** Centralizar la gestión de datos y abstraer la persistencia de `localStorage` para preparar el proyecto para una futura migración a un backend real.
*   **Logros Principales:**
    *   Creación de `services/mockBackend.ts` para simular un backend, gestionando el estado de `Business` y `Booking` en memoria con persistencia en `localStorage`.
    *   Modificación de `context/BusinessContext.tsx` para cargar y persistir datos a través de `mockBackend`, eliminando la dependencia directa de `localStorage`.
    *   Actualización de `services/api.ts` para obtener reservas de `mockBackend`, centralizando la gestión de reservas.

#### **Fase 2: Módulo de Agenda Individual por Empleado**
*   **Objetivo:** Implementar la capacidad de definir horarios de trabajo y asignación de servicios de forma individual para cada empleado.
*   **Logros Principales:**
    *   Extensión de la interfaz `Employee` en `types.ts` para incluir la propiedad `hours: Hours;`.
    *   Adaptación de `context/BusinessContext.tsx` con la acción `UPDATE_EMPLOYEE_HOURS` para gestionar los horarios individuales de los empleados.
    *   Refactorización de `services/api.ts` (`getAvailableSlots`) para considerar los horarios individuales de los empleados (con fallback al horario del negocio).
    *   Creación de `components/admin/EmployeeHoursEditor.tsx` para la edición de horarios por empleado.
    *   Creación de `components/admin/ServiceAssignmentEditor.tsx` para la asignación de servicios a empleados.
    *   Integración de los nuevos editores en `components/admin/EmployeesEditor.tsx` y `components/admin/ServicesEditor.tsx`.

#### **Fase 3: Corrección y Validación de Agenda**
*   **Objetivo:** Resolver bugs críticos en la lógica de disponibilidad y mejorar la integridad de los datos de horarios mediante validaciones en la UI.
*   **Logros Principales:**
    *   Corrección del bug en `services/api.ts` (`getAvailableSlots`) que causaba disponibilidad fuera del horario asignado a un empleado.
    *   Adición de la función `validarIntervalos` en `utils/availability.ts` para detectar solapamientos de horarios.
    *   Implementación de validaciones en `components/admin/EmployeeHoursEditor.tsx` para:
        *   Prevenir el guardado de intervalos de tiempo solapados.
        *   Asegurar que todos los campos de hora de inicio y fin estén completos.
        *   Verificar que la hora de cierre sea posterior a la hora de inicio en cada intervalo.

#### **Fase 4: Optimización y Estabilidad (Inicial)**
*   **Objetivo:** Abordar mejoras de rendimiento, corregir errores lógicos y asegurar la consistencia de estilos.
*   **Logros Principales:**
    *   Implementación de la acción `HYDRATE_STATE` en `context/BusinessContext.tsx` para una carga inicial más eficiente.
    *   Corrección de la lógica duplicada en `components/admin/EmployeesEditor.tsx` (`handleDeleteEmployee`) para usar la acción `DELETE_EMPLOYEE` del reducer.
    *   Mejora de la inmutabilidad en `components/admin/HoursEditor.tsx`, reemplazando `JSON.parse(JSON.stringify(...))` por desestructuración.
    *   Corrección de inconsistencia de estilo en el botón "Cancelar" de `components/admin/ServiceAssignmentEditor.tsx`.

#### **Fase 5: Optimización y Estabilidad (Adicional)**
*   **Objetivo:** Refinar la experiencia de usuario, la accesibilidad y el rendimiento con validaciones adicionales y optimizaciones de React.
*   **Logros Principales:**
    *   **Validaciones (`components/admin/ServiceAssignmentEditor.tsx`):** Implementación de validación para asegurar que al menos un empleado sea asignado a un servicio.
    *   **Manejo de Errores (`components/admin/ServiceAssignmentEditor.tsx`):** Adición de `try...catch` en `handleSave` para un manejo de errores más robusto y notificación al usuario.
    *   **Accesibilidad (`components/admin/ServiceAssignmentEditor.tsx`):** Inclusión de atributos ARIA (`role="dialog"`, `aria-labelledby`) en el modal para mejorar la accesibilidad.
    *   **Optimización de Estado (`components/admin/ServiceAssignmentEditor.tsx`):** El componente fue envuelto con `React.memo` y la función `handleToggleEmployee` fue memorizada con `useCallback` para optimizar el rendimiento.
    *   **Rendimiento (`context/BusinessContext.tsx`):** Implementación de `useMemo` para memorizar valores derivados del estado (`totalEmployees`, `activeServices`), mejorando el rendimiento general del contexto.

#### **Fase 6: Asignación Inteligente de Empleados y Robustez de Reservas**
*   **Objetivo:** Resolver el problema de sobre-reserva con la opción "Cualquiera disponible" y mejorar la lógica de disponibilidad.
*   **Logros Principales:**
    *   **Corrección de Bug Crítico:** Se solucionó el problema donde las reservas con `employeeId === 'any'` no asignaban un empleado real, lo que podía llevar a sobre-reservas.
    *   **Refactorización de Lógica de Asignación:** Se introdujo la función centralizada [`findAvailableEmployeeForSlot`](services/api.ts:99) en [`services/api.ts`](services/api.ts:1). Esta función ahora maneja la lógica de búsqueda de un empleado elegible y disponible, mejorando la mantenibilidad y evitando la duplicación de código.
    *   **Integración en `ConfirmationModal`:** El componente [`ConfirmationModal.tsx`](components/common/ConfirmationModal.tsx:1) fue actualizado para utilizar [`findAvailableEmployeeForSlot`](services/api.ts:99) al confirmar reservas con `employeeId === 'any'`, asegurando que cada reserva tenga un empleado asignado.
    *   **Mejora en `getAvailableSlots`:** Se corrigió un bug en `getAvailableSlots` que permitía mostrar horarios para empleados no calificados para un servicio específico, mejorando la precisión de la disponibilidad.
    *   **Pruebas de Integración Robustas:** Se añadieron y ajustaron pruebas de integración en [`services/api.integration.test.ts`](services/api.integration.test.ts:1) para verificar el correcto funcionamiento del flujo "Cualquiera disponible", el bloqueo de turnos y la ausencia de regresiones.

---

## 🚀 Cómo Empezarlo

Este proyecto está construido con **React y TypeScript** y utiliza **Vite** como herramienta de construcción.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/nombre-del-repo.git
    ```
2.  **Navega al directorio del proyecto:**
    ```bash
    cd nombre-del-repo
    ```
3.  **Instala las dependencias:**
    ```bash
    npm install
    ```
4.  **Inicia el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    Esto iniciará la aplicación en modo de desarrollo, generalmente accesible en `http://localhost:5173` (o un puerto similar).
5.  **Para construir la aplicación para producción:**
    ```bash
    npm run build
    ```
    Esto generará los archivos estáticos en la carpeta `dist/`, listos para ser desplegados.

---

## 🛠️ Tecnologías Utilizadas

*   **React 18:** Biblioteca de JavaScript para construir interfaces de usuario.
*   **TypeScript:** Un superset de JavaScript que añade tipado estático.
*   **Vite:** Herramienta de construcción rápida para proyectos web modernos.
*   **Tailwind CSS:** Framework CSS de utilidad para un diseño rápido y personalizado.
*   **qrcode:** Librería para generar códigos QR.
*   **PostCSS & Autoprefixer:** Para procesar CSS y añadir prefijos de proveedor automáticamente.

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si deseas mejorar este proyecto, sigue estos pasos:

1.  Haz un fork del repositorio.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y asegúrate de que el código pase las pruebas (si las hubiera).
4.  Haz commit de tus cambios (`git commit -m 'feat: Añade nueva funcionalidad'`).
5.  Sube tus cambios a tu fork (`git push origin feature/nueva-funcionalidad`).
6.  Abre un Pull Request detallando tus cambios.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.