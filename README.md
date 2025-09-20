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

## 🚀 Cómo Empezarlo

Este proyecto está construido con **React y TypeScript** utilizando módulos ES nativos a través de `esm.sh`, por lo que **no requiere un paso de `npm install` ni `build`**.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/nombre-del-repo.git
    ```
2.  **Navega al directorio:**
    ```bash
    cd nombre-del-repo
    ```
3.  **Inicia un servidor local:**
    La forma más sencilla es usar una extensión como **"Live Server"** en Visual Studio Code. Simplemente haz clic derecho en el archivo `index.html` y selecciona "Open with Live Server".

    Alternativamente, puedes usar cualquier servidor web estático. Por ejemplo, con Python:
    ```bash
    # Para Python 3
    python -m http.server
    ```
    O con Node.js (si lo tienes instalado):
    ```bash
    npx serve
    ```
4.  Abre tu navegador en la dirección que te indique el servidor (ej. `http://localhost:8000` o `http://localhost:3000`).

---

## 🛠️ Tecnologías Utilizadas

*   **React 18**
*   **TypeScript**
*   **Tailwind CSS** (vía CDN para prototipado rápido)
*   **Módulos ES Nativos** (servidos desde `esm.sh` para una configuración sin `build`)
*   **qrcode** (para generar códigos QR en el panel de compartir)