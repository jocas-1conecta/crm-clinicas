# Arquitectura y Plataforma SaaS - 1Clinic CRM

Este documento detalla la arquitectura técnica, el stack tecnológico y la organización modular del **SaaS Multi-Tenant Horizontal** (1Clinic), diseñado para escalar operaciones clínicas y embudos de ventas a nivel empresarial.

---

## 🏗️ 1. Arquitectura General y Stack Tecnológico

La aplicación está construida sobre una arquitectura de **Single Page Application (SPA)** de Grado Producción Empresarial. Está diseñada para operar como una plataforma **SaaS Multi-Tenant Horizontal** (donde el software sirva indiscriminadamente a distintas clínicas, despachos o agencias, bajo una misma base de código). 

El sistema descansa sobre cinco pilares técnicos fundamentales: separación quirúrgica de dominios de negocio (Core Framework vs Módulos Acoplables como `clinic`), seguridad de acceso restringido basado en roles (RBAC) y modelos de suscripción, procesamiento de renderizado diferido (Virtualización), e inyección de datos dinámicos 100% en tiempo real sin quemar variables estáticas.

### 1.1 El Stack Frontend Básico
*   **React 18 & TypeScript Activo**: Toda la Interfaz de Usuario está tipada. Se prohíbe el uso de variables `any` garantizando fiabilidad a nivel de desarrollo e interoperabilidad segura entre componentes complejos.
*   **Vite**: Motor de empaquetado y compilación que reduce severamente los tiempos de espera del Hot Module Replacement (HMR) e inyecta dependencias al dom de manera atómica, logrando tiempos de carga inicial sub-segundo.
*   **Tailwind CSS & Lucide-React**: Diseño "Utility-First" acoplado a un motor tipográfico moderno. Garantiza una UI modular fácil de refactorizar sin CSS muerto ni conflictos de herencia. Los íconos son trazados dinámicamente como SVG directos sin impacto en el peso de la página.

### 1.2 El Ecosistema de Datos (Server State vs Client State)
La refactorización absoluta de la plataforma desplazó la carga mental de la memoria del navegador hacia manejadores profesionales:
*   **React Query (Data as a Service)**: Actúa como la *Única Fuente de Verdad* asincrónica. `React-Query` intercepta, almacena en caché y distribuye la data proveniente del servidor, evitando peticiones duplicadas a la DB o componentes estancados ("Stale UI"). Se encarga de la invalidación automática una vez que una Mutación (Ej. Mover una tarjeta Kanban de etapa) sucede, forzando la re-sincronización instantánea de todas las vistas sin necesidad de recargar el DOM a la fuerza bruta.
*   **Zustand (Estado Síncrono Superficial)**: Ha sido reducido estrictamente a "Estado del Cliente". Retiene información inmutable a lo largo de la navegación, exclusivamente: El Rol del usuario logueado (`currentUser: Asesor_Sucursal | Admin_Clinica | Super_Admin`), el ID de su tenant, y configuraciones cosméticas inmediatas de UI.

### 1.3 Escalabilidad de la UI: Rendimiento y Virtualización
*   **Virtualización de Nivel-DOM (`@tanstack/react-virtual`)**: Elemento crítico del ecosistema. En vistas pasadas el DOM se asfixiaba renderizando miles de nodos ocultos. Con esta tecnología inyectada en el `Directorio de Pacientes` y el `UniversalPipelineBoard`, el sistema puede manejar miles de leads u registros de historial calculando dinámicamente qué registros están explícitamente dentro de la ventana de visualización del usuario y renderizando y destruyendo nodos HTML bajo demanda (Scroll infinito pasivo sin ralentizar el CPU ni consumir memoria del navegador).

### 1.4 Seguridad y Control de Router Activo
*   **Enrutador Paramétrico Segregativo (React Router v7)**: Cada ruta posee un prefijo tenant (`/:slug`). El sistema inyecta protección de rutas (Route Guarding). Un Asesor de Sucursal no puede navegar jamás (ni tipeando la URL manualmente) a un "Dashboard Gerencial" o una ruta a la que su clínica no se haya suscrito.
*   **ModuleGuard (`<ModuleGuard requiredModule="clinic_core"/>`)**: Componente invisible de Control de Acceso que intercepta el flujo. Consulta los atributos `active_modules` inyectados en el tenant mediante la sesión de Auth, logrando ocultar vistas completas (Por Ej. Escondiendo las citas médicas de una Inmobiliaria) desacoplando la visión según la licencia SaaS que cada cliente pagó.

### 1.5 Backend Serverless, Auth y RLS
*   **Supabase Client**: Todas las mutaciones, validaciones de correos e injección de Data son orquestados por este cliente sobre una arquitectura PostgreSQL pura. 
*   **Row Level Security (RLS)**: El núcleo fundamental que hace seguro el modelo *Multi-Tenant*. Las tablas globales (Ej: `Leads`, `Pacientes`, `Citas`, `Doctores`) residen juntas, sin embargo, mediante políticas RLS atadas estructuralmente al JSON Web Token emitido en la sesión (`clinica_id`, `sucursal_id`), es matemáticamente imposible que un usuario extraiga de las APIs listados de pacientes de los competidores.

---

## 📦 2. Estructura de Módulos (Directorio `src/`)

El código ha sido refactorizado basándose en un diseño orientado a dominios (Domain-Driven Design). La base de código **ya no es un monolito clínico**, sino un motor SaaS horizontal (`src/core`) que puede inyectarle extensiones especializadas por rubro industrial (`src/modules/*`).

### 2.1 Dominio Genérico: `src/core/`
Este directorio encapsula el motor transversal del SaaS. Contiene todas las partes del software que cualquier empresa necesita (Ej. Bienes raíces, gimnasios, agencias), independientemente de lo que vendan.

*   **`core/auth/` (Autenticación Inyectada y Seguridad Perimetral)**:
    El sistema de autenticación fue reescrito para abandonar la idea de una "página de login estática", transformándose en un portal de entrada agnóstico (Multi-Tenant Gateway) y un enrutador inteligente.
    *   **Login Multitenant Paramétrico (`Login.tsx`)**: Reacciona dinámicamente al parámetro de la URL (Ej. `/rangelpereira` o `/inmobiliaria-xyz`). Antes incluso de montar el login, intercepta este `/:slug`, consulta la configuración del tenant en la base de datos, y sobrescribe las variables CSS maestras (color primario corporativo) y el logotipo renderizado. El usuario siente que está iniciando sesión en el software dedicado de su empresa, en lugar de un SaaS genérico.
    *   **Resolución de Perfil (Hydration)**: Al hacer submit, el componente no solo verifica credenciales de JWT vía Supabase Auth, sino que hace un JOIN contra la tabla `profiles` e hidrata el estado global en `Zustand` con el rol estricto (`Asesor_Sucursal` o `Admin_Clinica`), el Branch ID geográfico y el arreglo `active_modules` que la empresa ha alquilado.
    *   **`ModuleGuard.tsx` (Proxy Firewall)**: Es el componente de alto orden (HOC) que envuelve las rutas sensibles en `App.tsx`. Analiza a nivel de re-renderizado en tiempo real el arreglo de `active_modules` del usuario. Si un negocio de seguros (`insurance_core`) intenta invocar la ruta de Citas Médicas (`/citas`), el ModuleGuard interceptará el renderizado de React, arrojando al usuario de vuelta al inicio. Esto garantiza que la licencia SaaS contratada sea técnica y criptográficamente inviolable desde el frontend.
*   **`core/dashboards/` (Paneles Neutros y KPIs Analíticos)**:
    *   **Jerarquía de Tres Niveles Estrictos**: La plataforma distribuye la carga analítica y la visibilidad matemática dependiendo del token del usuario en tiempo real:
        *   **`SuperAdminDashboard.tsx` (Root)**: Interfaz diseñada exclusivamente para el dueño del SaaS. Expone métricas de alto nivel a través de todas las instancias como ingresos totales por suscripción (MRR), volumen total de Tenants activos (Clínicas), y salud del sistema mediante conectores directos a Supabase Admin.
        *   **`AdminClinicaDashboard.tsx` (Tenant Manager)**: El panel directivo de una clínica específica. Destruye métricas de código (SaaS) y se concentra en inteligencia de negocio local. Consumo de KPIs operativos en tiempo real: Ticket Promedio, Tasa de Conversión General de Leads, y rendimiento del embudo agregando la data de todas sus sucursales.
        *   **`AsesorSucursalDashboard.tsx` (Tactical View)**: El radar del empleado de piso. Cero distracciones gerenciales. Muestra exclusivamente lo que exige acción inmediata: "Leads Críticos Hoy", "Pacientes en Sala de Espera" (si operan módulo clínico), y el estado de sus citas personales.
    *   **Arquitectura de Widgets Dinámicos**: En lugar de recargar vistas monolíticas Gigantes, todos los dashboards están ensamblados usando mini-componentes de suspensión asíncrona (Suspense Boundaries). Si el widget de "Ganancias" falla por una consulta SQL lenta, la vista renderiza el esqueleto de carga local, sin frenar la visión del resto de la pantalla.
*   **`core/organizations/` (Gestión Jerárquica)**:
    *   Todo negocio SaaS necesita gestionar: Sus inquilinos (Tenants/Clínicas), sus puntos geográficos (Sucursales), y su talento humano (`TeamManagement.tsx` restringe la visión de un empleado solo a la Sucursal donde fue asignado).
    *   **`PipelineConfig.tsx`**: El cerebro del flujo comercial. Permite a los gerentes "pintar" y estructurar embudos libremente guardando en Supabase nuevas Fases, Tiempos de Respuesta Esperados (SLA) sin tocar código.
*   **`core/settings/` (Hub Central de Configuración & Dual Sidebar)**:
    *   Módulo construido con un patrón de enrutamiento anidado **Dual Sidebar (Doble Barra Lateral)**. Permite al usuario operar configuraciones superficiales (Avatar, Contraseña) y parametrizaciones profundas (Logos del Tenant, Moneda Base) en un único cajón flotante sin perder su contexto de trabajo en la App.
    *   **Defensive UX & Pristine Validation**: Las mutaciones de red en este módulo están congeladas algorítmicamente hasta que React detecte matemáticamente mediante "Dirty Checking" o "Estado Pristino" que el usuario ha tecleado un cambio real, abortando clics inútiles y bloqueando la UI dinámicamente. 
    *   **Type Safety & A11y Strict**: Todo componente renderiza `htmlFor` amarrando etiquetas biográficas a su `input`, activando el autocompletado avanzado del SO. No existe tipo `: any`, cada bloque Try-Catch captura un `unknown` forzando chequeos pre-compilación de TypeScript.
    *   **RLS Security Bridge**: Este módulo no podría subsistir si no está pareado a las Políticas Base de Datos (RLS). Las cargas de Avatares (2MB cap) evalúan desde PostgreSQL si el `bucket_id` y nombre coinciden con el `$UID` del ejecutante de la mutación.
*   **`core/leads/` (Canalización Comercial)**: 
    *   En lugar de hardcodear cómo se vende, usa el componente `<UniversalPipelineBoard/>`. Un tablero Kanban hiper-optimizado agnóstico que gestiona negociaciones frías (Ej: Un lead reaccionó a Facebook y hay que llamarlo).
*   **`core/analytics/` & `core/calendar/`**:
    *   Motores de Inteligencia de negocio y recordatorios asíncronos para hacer Follow-Up a clientes o emitir pronósticos de caja (`ReportsDashboard.tsx`).
*   **`core/catalogs/` (Almacén de Valor)**:
    *   El módulo donde la empresa enlista asíncronamente qué Servicios, Productos o Docts/Asesores tiene en nómina listos para despachar o vender.

### 2.2 Dominio Especializado (Plugins Adicionales): `src/modules/`
Aquí vive todo el código estrictamente médico y operacional de la rama de la salud. Funciona como un plugin acoplable para aquellas organizaciones que tienen activo el módulo `clinic_core`. Si el SaaS se vende a Gimnasios, se crearía un `src/modules/gym/`.

*   **`modules/clinic/appointments/` (El Corazón Operativo)**: 
    *   Implementa una segunda instancia del **UniversalPipelineBoard** con configuraciones estrictas pero esta vez para el control físico de la sala de espera clínica: `En Validación -> Sala de Espera -> Box 1 -> Box 2 -> Atendido/Cobrado`. Utiliza relojes de Service Level Agreement (SLA) para tachar en rojo a los pacientes que llevan más de 15 minutos esperando.
*   **`modules/clinic/patients/` (El Expediente Médico/Comercial)**: 
    *   A diferencia del módulo global de captura prospectos fríos (*Leads*), la vista `PatientsDirectory.tsx` almacena a los pacientes reales fidelizados. Exige una tabla relacional hiper-segmentada con historial de vida (LTV), tags corporales, asistencias previas y oportunidades cruzadas (Cross-Selling). En esta vista, el componente Virtualizer asegura que aunque la base de datos de pacientes alcance 500,000 registros, el navegador solo renderiza los 15 que caben en la pantalla actual.

---

## 🧹 3. Certificación de Código (Garbage Collection)
El repositorio opera en modalidad Grado Producción:
- **Cero** Mock Data. Todo arreglo visual o variable quemada fue re-ensamblada para buscar `useQuery(supabase.from...)`.
- **Cero** Variables huérfanas o importaciones muertas (ESLint 0 warnings).
- **Cero** Comentarios de desarrollo, `console.logs` y archivos sobrantes del compilado Vite.
- Sistema unificado en componentes genéricos avanzados como el `<UniversalPipelineBoard />`.
