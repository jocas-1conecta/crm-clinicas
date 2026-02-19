# Clinical CRM - Prototipo de Alta Fidelidad

Bienvenido al prototipo funcional del **CRM para Clínica Rangel**. Esta aplicación es una solución moderna y centrada en la experiencia de usuario para la gestión de pacientes, citas y leads comerciales.

## 🌟 Características Principales

### 1. Dashboard Analítico
- **KPIs en Tiempo Real**: Visualización de Leads Totales, Tasa de Conversión, Citas Activas e Ingresos Proyectados.
- **Gráficos**: Distribución de leads por especialidad y feed de actividad reciente.

### 2. Gestión de Leads (Pipeline)
- **Kanban Board**: Visualización de leads por etapas (Nuevo, Contactado, En validación, etc.).
- **Drag & Drop**: Arrastra y suelta tarjetas para cambiar el estado de los leads.
- **Detalle Completo**: Al hacer clic en un lead, se abre un modal con:
  - **Info General**: Datos de contacto y preferencias.
  - **Tareas**: Lista de pendientes.
  - **Archivos**: Gestión de documentos (con simulación de subida).
  - **Foro**: Comentarios y menciones (@usuario).
  - **WhatsApp**: Simulación realista de chat para interacción rápida.

### 3. Funnel de Citas
- **Gestión de Citas**: Pipeline visual para el ciclo de vida de la cita (Solicitada -> Confirmada -> Atendida).
- **Drag & Drop**: Mueve las citas entre estados fácilmente.
- **Datos Detallados**: Incluye doctor asignado, servicio y horario.

### 4. Admin vs Asesora (Roles)
- **Seguridad**: Control de acceso basado en roles simluado.
- **Vista de Asesora**: 
  - Acceso limitado a sus leads asignados.
  - Vista de "Pacientes" filtrada solo a sus asignaciones.
- **Vista de Admin**:
  - Acceso total a todos los módulos y configuraciones.
  - Gestión de Catálogos (Doctores, Servicios, Productos).

### 5. Gestión de Pacientes
- **Directorio Global**: Búsqueda y listado de pacientes.
- **Asignación**: Los pacientes tienen un asesor responsable asignado.

## 🛠️ Stack Tecnológico
- **Frontend**: React + Vite (Velocidad y optimización).
- **Estilos**: Tailwind CSS (Diseño "Clinical Premium" personalizado).
- **Estado**: Zustand (Gestión ligera y potente del estado global).
- **Iconos**: Lucide React.
- **Datos**: Mock Data generada dinámicamente para pruebas exhaustivas.

## 🚀 Cómo Iniciar

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```

3.  **Abrir en el navegador**:
    Generalmente en `http://localhost:5173`

## 🔐 Credenciales de Acceso (Simuladas)

Puedes probar los diferentes roles usando estos correos (la contraseña puede ser cualquiera):

| Rol | Email | Acceso |
| :--- | :--- | :--- |
| **Administrador** | `admin@clinica.com` | Acceso Total (Dashboard, Leads, Citas, Pacientes Global, Gestión) |
| **Asesora** | `asesora1@clinica.com` | Acceso Limitado (Sus Leads, Sus Citas, Sus Pacientes) |

## 📂 Estructura del Proyecto

- `/src/components`: Componentes reutilizables (Layout, LeadDetail, Dashboard, etc.).
- `/src/data`: `mockData.js` contiene toda la data falsa generada para pruebas.
- `/src/store`: `useStore.ts` maneja el estado global (auth, leads, citas).
