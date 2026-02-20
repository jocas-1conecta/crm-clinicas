
# 📘 Documentación Técnica - CRM Clínica Rangel

## 1. Visión General
**Clínica Rangel CRM** es una aplicación web moderna diseñada para la gestión integral de leads, pacientes y citas médicas. Construida con tecnologías de vanguardia, ofrece una interfaz fluida y una experiencia de usuario optimizada para administradores y asesores.

## 2. Tecnologías (Stack Tecnológico)
El proyecto utiliza un stack moderno basado en el ecosistema de React:

-   **Core**: React 18 + TypeScript (Vite como bundler).
-   **Estilos**: Tailwind CSS para diseño utilitario y responsivo.
-   **Estado Global**: Zustand para una gestión de estado ligera y potente.
-   **Iconos**: Lucide React.
-   **Navegación**: Enrutamiento interno basado en estado (Single Page Application real).

## 3. Arquitectura y Estructura del Proyecto

### Estructura de Directorios Completa
```
src/
├── components/                 # Componentes de UI (Vistas y Elementos Reutilizables)
│   ├── AppointmentsPipeline.tsx # Gestión visual (Kanban) de Citas Médicas
│   ├── Dashboard.tsx            # Vista principal con métricas y KPIs
│   ├── Layout.tsx               # Estructura principal (Sidebar + Contenido + Header)
│   ├── LeadDetail.tsx           # Vista detallada de un Lead (Chats, Notas, Datos)
│   ├── Login.tsx                # Pantalla de autenticación con accesos demo
│   ├── Management.tsx           # Panel de configuración/administración (Doctores, Servicios)
│   ├── Patients.tsx             # Listado y buscador de Pacientes
│   └── Pipeline.tsx             # Gestión visual (Kanban) de Leads Comerciales
├── data/                       # Datos simulados (Mock Data)
│   ├── mockData.d.ts            # Definiciones de tipos para los datos
│   └── mockData.js              # Base de datos estática inicial (Usuarios, Leads, Citas)
├── store/                      # Lógica de Estado
│   └── useStore.ts             # Store de Zustand (Lógica de negocio central: Auth, CRUD)
├── App.tsx                     # Enrutador principal y selector de vistas
├── main.tsx                    # Punto de entrada de la aplicación (Renderizado en DOM)
├── index.css                   # Importación de Tailwind y estilos globales
└── vite-env.d.ts               # Tipos de Vite
```

### Flujo de Datos
La aplicación utiliza **Zustand** (`src/store/useStore.ts`) como única fuente de verdad.
-   **Estado Inicial**: Se carga desde `src/data/mockData.js`.
-   **Acciones**: Las modificaciones (login, mover leads, agregar notas) se ejecutan a través de acciones definidas en el store, actualizando la UI reactivamente.
-   **Persistencia**: Actualmente, los datos son volátiles (en memoria) y se reinician al recargar, ideal para entornos de demostración.

## 4. Funcionalidades Clave

### 🔐 Autenticación
-   Sistema de login simulado basado en email.
-   **Accesos Demo**: Botones de acceso rápido para roles de `Admin` y `Asesora`.
-   Validación de roles para mostrar vistas personalizadas.

### 📊 Dashboard
-   Vista resumen con métricas clave (KPIs).
-   Visualización rápida del estado del negocio.

### 🚀 Pipeline de Leads
-   Gestión visual de oportunidades de venta estilo Kanban.
-   Permite mover leads entre estados (Nuevo, Contactado, Cierre, etc.) arrastrando o cambiando estado.
-   **Detalle de Lead**: Visualización completa con historial de chats simulado, notas y asignación.

### 📅 Gestión de Citas (AppointmentsPipeline)
-   Tablero Kanban específico para el flujo de citas médicas.
-   Estados: Solicitada, Por Confirmar, Confirmada, En Sala, Atendida, Cancelada.
-   Integración con la base de datos de doctores y servicios.

### 👥 Pacientes
-   Directorio de pacientes con búsqueda y filtrado.
-   Información médica básica e historia de visitas.

### ⚙️ Gestión
-   Panel administrativo para ver y gestionar Doctores, Servicios y Productos.

## 5. Instalación y Despliegue

### Requisitos
-   Node.js (v18 o superior)
-   npm o yarn

### Pasos para Ejecutar
1.  **Instalar dependencias**:
    ```bash
    npm install
    ```
2.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```
3.  **Construir para producción**:
    ```bash
    npm run build
    ```

## 6. Guía de Desarrollo
-   **Agregar una nueva vista**: Crear el componente en `src/components`, exportarlo y agregarlo al `switch` en `App.tsx`.
-   **Modificar datos**: Editar `src/data/mockData.js` para cambiar los datos iniciales o `src/store/useStore.ts` para cambiar la estructura de los tipos TS.
