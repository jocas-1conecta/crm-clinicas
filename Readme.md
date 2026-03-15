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
    *   **Enrutador Proxy Inteligente (`RootDashboard.tsx`)**: Actúa como la única puerta de entrada en la ruta de inicio. Lee el `role` del usuario desde Zustand de forma síncrona y delega dinámicamente el montaje del dashboard correcto, aislando por completo la lógica de enrutamiento y bloqueando accesos no autorizados a nivel de renderizado.
    *   **Jerarquía de Tres Niveles Estrictos**: La plataforma distribuye la carga analítica y la visibilidad matemática dependiendo del token del usuario en tiempo real:
        *   **`SuperAdminDashboard.tsx` (Root)**: Interfaz diseñada exclusivamente para el dueño del SaaS. Expone métricas de alto nivel a través de todas las instancias como ingresos totales por suscripción (MRR), volumen total de Tenants activos (Clínicas), y salud del sistema. Sub-Módulos fracturados: `GlobalKPIs` y `SystemStatus`.
        *   **`AdminClinicaDashboard.tsx` (Tenant Manager)**: El panel directivo de una clínica específica. Destruye métricas de código (SaaS) y se concentra en inteligencia de negocio local. Consume KPIs operativos con alto rigor matemático manejados nativamente mediante `useMemo` y encapsulados asíncronamente en componentes como `DashboardKPIs`, `LeadsByServiceChart` y `RecentActivityFeed`.
        *   **`AsesorSucursalDashboard.tsx` (Tactical View)**: El radar del empleado de piso filtrado minuciosamente por `sucursal_id` dictado en el payload JWT. Muestra exclusivamente lo que exige acción inmediata a través de su encapsulado `TacticalKPIs`.
    *   **Arquitectura de Widgets Dinámicos (React Suspense)**: En lugar de renderizar vistas monolíticas gigantes que se asfixian calculando arrays extensos, la interfaz visual fue partida atómicamente. Todos los dashboards están ensamblados usando importaciones perezosas bajo `Suspense Boundaries`. Si un bloque de gráficas sufre latencia SQL, reaccionará un Skeleton Loader inofensivo mientras el resto del dashboard retiene interactividad total (Bloqueo Sub-segundo).
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

## 🚀 3. Flujos Operativos y Funcionalidades Clave (Core Features)

La plataforma está diseñada para acompañar el ciclo de vida completo de un cliente: desde que es un prospecto frío, hasta que se convierte en un paciente fidelizado en la clínica.

### 3.1 Gestión Comercial y Embudos (Kanban Universal)
*   **Captación (Leads)**: Los prospectos ingresan al sistema y se visualizan en un tablero Kanban altamente interactivo (`UniversalPipelineBoard`). El tablero muestra un conteo en tiempo real del "Valor Estimado" (Revenue) atrapado en cada columna.
*   **Editor de Fases (Pipeline Configurator)**: La plataforma no fuerza a la empresa a seguir un proceso de ventas estricto. Desde el Hub de Configuración, los administradores pueden crear, eliminar y reordenar las Fases del Embudo (Ej. Añadir una columna personalizada llamada "Presupuesto Enviado"). El Kanban renderizará estas nuevas columnas de forma instantánea mediante React Query.
*   **Drag & Drop en Tiempo Real**: Los asesores pueden arrastrar tarjetas de leads a través de diferentes etapas. Al soltar la tarjeta, `React Query` dispara una mutación asíncrona hacia Supabase (Optmistic UI), guardando la nueva etapa instantáneamente e invalidando la caché para repintar la pantalla sin destellos blancos ("flicker-free").
*   **Conversión a Paciente**: Cuando un Lead llega a la etapa de cierre exitoso (Ganado), el sistema permite "promoverlo" hacia el dominio clínico a un solo clic, transformándolo en un paciente real con expediente e historial financiero.

### 3.2 Operaciones Clínicas: Pacientes y Sala de Espera
*Este módulo se bloquea automáticamente para Tenants que no tienen la licencia `clinic_core`.*
*   **Directorio Dinámico de Pacientes (Cross-Selling)**: Un CRM tabular capaz de sostener cientos de miles de registros de pacientes históricos sin ralentizar el navegador, gracias al particionamiento de memoria (`@tanstack/react-virtual`). Permite búsqueda rápida, etiquetado de condiciones, y detección de oportunidades de Venta Cruzada (Registrando si al paciente actual se le puede ofrecer un tratamiento dermatológico adicional, por ejemplo).
*   **Control de Citas Físicas (SLA Kanban)**: Un segundo tablero Kanban paralelo, pero diseñado estratégicamente para el flujo físico dentro de la clínica. Etapas tácticas: *Validación -> Sala de Espera -> Box 1 -> Box 2 -> Atendido/Cobrado*. 
*   **Relojes de Nivel de Servicio (SLA)**: Incorpora temporizadores dinámicos vinculados a cada tarjeta. Si un paciente permanece en la columna "Sala de Espera" por más de 15 minutos (El SLA configurado), la tarjeta cambia a color rojo alertando visualmente al equipo médico para evitar cuellos de botella y quejas por largos tiempos de espera.

### 3.3 Inteligencia Analítica: Dashboards Tri-Nivel (RBAC)
En lugar de exportar hojas de cálculo y bloquear el navegador, la plataforma calcula la salud del negocio en milisegundos usando lógica de memorización matemática profunda (`useMemo`) en el Frontend y procesa la data a través de un **Enrutador Proxy de Roles**:
*   **Rol Super Admin (La Arquitectura/Dueño del Software)**: Conoce la salud financiera del SaaS entero. Ve el MRR (Monthly Recurring Revenue) proyectado multiplicando las Clínicas Activas por el valor de su modelo de suscripción (Plan Pro/Enterprise), audita licencias pendientes de aprobación, y monitorea la latencia de microservicios.
*   **Rol Admin de Clínica (Gerente Regional/Dueño de la Clínica)**: Su dashboard tritura y suma los datos de todas sus sucursales afiliadas. Muestra los "Leads Perdidos", calcula el **Win Rate General** de los asesores comerciales y pinta gráficos en barras de los "Tratamientos/Servicios más vendidos", segmentando el esfuerzo de marketing futuro.
*   **Rol Asesor (El Empleado de Mostrador/Ventas)**: Un diseño hiper-táctico. Excluye por completo las distracciones gerenciales (Oculta números financieros). Le indica exclusivamente lo que exige su acción inmediata según su `sucursal_id` exacta: Cuántos leads nuevos tiene sin contactar ("Follow-Ups de Hoy"), cuántos pacientes hay en su sala de espera, y su listado de citas personales confirmadas. 

### 3.4 Gobernanza, Seguridad Multi-Sucursal y Team Management
*   **Aislamiento Geográfico (Row Level Security)**: Gracias a las políticas de seguridad subyacentes alojadas directamente en el núcleo de PostgreSQL, un Asesor asignado a la "Sucursal Miami" es matemáticamente incapaz (Incluso si hackeara las peticiones de red directas) de ver, buscar o mutar la información de los leads y pacientes que aterrizan en la "Sucursal Orlando". 
*   **Team Management Avanzado**: Desde el Panel de Configuración de Equipo, los administradores pueden enviar invitaciones de correo, definir explícitamente el "Rol" en el piso (Asesor vs Manager) y anclar obligatoriamente a cada empleado a una `sucursal_id` específica.
*   **Dual Sidebar Configuration (Settings Hub)**: Un Hub arquitectónico donde el Administrador muta su entorno operativo visual: Actualiza logotipos de la empresa (Capacidad máxima 2MB validados en cliente y servidor), renombra el Workspace corporativo, edita catálogos y zonas horarias.
*   **Defensive UI (Pristine Form Tracking)**: Emplea algoritmos de validación en los formularios de ajustes, asegurando que el botón "Guardar" permanezca grisado/bloqueado si el usuario simplemente abrió la vista pero no tecleó una modificación real de datos (Estado Pristino), defendiendo a la base de datos de sobrecargas por llamadas de Guardado inútiles.

### 3.5 Autenticación Empresarial (Home Realm Discovery)
Inspirado en sistemas robustos como Microsoft 365 y Google Workspace, el sistema despacha el inicio de sesión ordinario en favor de una experiencia **"Identifier-First"** (De 2 pasos):
*   **Paso 1 (Global Gateway)**: La ruta `/` expone un diseño corporativo neutro solicitando exclusivamente el correo del usuario.
*   **Tenant Discovery (RPC Security Definer)**: Al hacer submit, una función RPC escrita directamente en PostgreSQL evade de forma controlada el blindaje RLS para buscar y devolver a qué empresa (`slug`) pertenece el correo, preservando la privacidad del padrón global de usuarios.
*   **Paso 2 (Inyección de Marca)**: El gateway fuerza una Redirección Visual animada hacia la ruta privada de la clínica (`/:slug/login?email=xxx`). El formulario cambia, pre-rellena y bloquea el campo de correo, descarga el Logotipo corporativo y el color oficial de esa empresa, solicitando ahora únicamente la constraseña.


## 🧹 4. Certificación de Código (Garbage Collection)
El repositorio opera en modalidad Grado Producción:
- **Cero** Mock Data. Todo arreglo visual o variable quemada fue re-ensamblada para buscar `useQuery(supabase.from...)`.
- **Cero** Variables huérfanas o importaciones muertas (ESLint 0 warnings).
- **Cero** Comentarios de desarrollo, `console.logs` y archivos sobrantes del compilado Vite.
- Sistema unificado en componentes genéricos avanzados como el `<UniversalPipelineBoard />`.
