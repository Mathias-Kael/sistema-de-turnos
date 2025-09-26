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

*   **Gestión Avanzada de Enlaces Compartidos:**
    *   Los enlaces de acceso para clientes ahora pueden ser `activos`, `pausados` o `revocados` desde el panel de administración.
    *   Posibilidad de establecer una `fecha de caducidad` para los enlaces, asegurando un control temporal sobre el acceso.
    *   Validación robusta de tokens para asegurar que solo los enlaces válidos y no expirados permitan el acceso a la vista del cliente.

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