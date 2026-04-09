# Módulo: Organizaciones y Configuración

> **Dominio**: `src/core/organizations/` + `src/core/settings/`  
> **Roles con acceso**: `Super_Admin` (gestión) / Todos (settings personales)

---

## 1. Propósito

Este módulo agrupa la administración multi-tenant del CRM: gestión de clínicas, sucursales, equipo, pipelines y configuraciones. Proporciona las herramientas para que los administradores configuren la operación completa de sus organizaciones.

---

## 2. Gestión Organizacional (`src/core/organizations/`)

### 2.1 Management Hub

**Archivo**: [Management.tsx](file:///d:/Clínica Rangel/src/core/organizations/Management.tsx) — 5 KB  
**Ruta**: `/gestion`  
**Rol**: `Super_Admin`

Panel central con accesos directos a:
- Sucursales, Equipo, Catálogos, Pipeline Config, Automatizaciones.

### 2.2 Gestión de Clínicas (`ClinicsManagement`)

**Archivo**: [ClinicsManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/ClinicsManagement.tsx) — 48 KB  
**Ruta**: `/clinicas`  
**Rol**: `Platform_Owner`

CRUD completo de clínicas/tenants:
- Creación de nuevas clínicas con slug único.
- Activación/desactivación de módulos (`active_modules[]`).
- Gestión de onboarding y suscripciones.

### 2.3 Gestión de Sucursales (`BranchesManagement`)

**Archivo**: [BranchesManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/BranchesManagement.tsx) — 11 KB  
**Ruta**: `/mis-sucursales`  
**Rol**: `Super_Admin`

Listado y CRUD de sucursales de la clínica:
- Nombre, dirección, teléfono, horarios.
- Click → navega a `BranchDetail`.

### 2.4 Detalle de Sucursal (`BranchDetail`)

**Archivo**: [BranchDetail.tsx](file:///d:/Clínica Rangel/src/core/organizations/BranchDetail.tsx) — 21 KB  
**Ruta**: `/mis-sucursales/:branchId`

Vista detallada de una sucursal con:
- Datos generales editables.
- Equipo asignado a la sucursal.
- Métricas de la sucursal.

### 2.5 Gestión de Equipo (`TeamManagement`)

**Archivo**: [TeamManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/TeamManagement.tsx) — 19 KB

CRUD de usuarios del equipo:
- Invitación por email, asignación de rol, asignación a sucursal.
- Roles disponibles: `Admin_Clinica`, `Asesor_Sucursal`.

### 2.6 Configuración de Pipelines (`PipelineConfig`)

**Archivo**: [PipelineConfig.tsx](file:///d:/Clínica Rangel/src/core/organizations/PipelineConfig.tsx) — 39 KB

Editor visual de embudos para leads, citas y deals:
- CRUD de etapas (`pipeline_stages`) con: nombre, color, `resolution_type` (open/won/lost), orden.
- CRUD de sub-etapas (`pipeline_substages`) con: SLA hours, orden.
- Reglas de transición (`stage_transition_rules`) con campos obligatorios.
- Cada pipeline es independiente por `board_type` y `clinica_id`.

---

## 3. Hub de Configuraciones (`src/core/settings/`)

### 3.1 Layout de Settings

**Archivo**: [SettingsLayout.tsx](file:///d:/Clínica Rangel/src/core/settings/SettingsLayout.tsx) — 6 KB  
**Ruta**: `/configuracion`

Sidebar de navegación con sub-rutas anidadas:

| Sub-ruta | Componente | Propósito |
|----------|-----------|-----------|
| `/configuracion/perfil` | `ProfileSettings` | Edición de perfil personal |
| `/configuracion/seguridad` | `SecuritySettings` | Contraseña y 2FA |
| `/configuracion/empresa` | `WorkspaceSettings` | Datos de la clínica |
| `/configuracion/plataforma` | `PlatformBrandingSettings` | Logo, nombre, colores |
| `/configuracion/equipo` | `TeamManagement` | Gestión de usuarios |
| `/configuracion/integraciones` | `IntegrationsSettings` | API keys (Timelines AI) |
| `/configuracion/plantillas-chat` | `ChatTemplatesSettings` | Plantillas de WhatsApp |
| `/configuracion/etiquetas` | `TagsManagement` | Tags globales del CRM |

### 3.2 Configuración del Workspace (`WorkspaceSettings`)

**Archivo**: [WorkspaceSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/WorkspaceSettings.tsx) — 44 KB

El archivo más grande de configuraciones. Incluye:
- Edición de datos de la clínica (nombre, teléfono, dirección, RFC).
- Gestión de logo y branding.
- Configuración de horarios operativos.
- Activación/desactivación de módulos.

### 3.3 Integraciones (`IntegrationsSettings`)

**Archivo**: [IntegrationsSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/IntegrationsSettings.tsx) — 12 KB

Panel de conexión con servicios externos:
- **Timelines AI**: Configuración de API key para WhatsApp.
- Estado de conexión (conectado/desconectado).

### 3.4 Plantillas de Chat (`ChatTemplatesSettings`)

**Archivo**: [ChatTemplatesSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/ChatTemplatesSettings.tsx) — 24 KB

CRUD de plantillas predefinidas para mensajes de WhatsApp:
- Variables dinámicas (`{nombre}`, `{servicio}`, etc.).
- Categorías: Bienvenida, Seguimiento, Recordatorio, etc.

### 3.5 Gestión de Etiquetas (`TagsManagement`)

**Archivo**: [TagsManagement.tsx](file:///d:/Clínica Rangel/src/core/settings/TagsManagement.tsx) — 9 KB

CRUD de tags globales que se aplican a leads, pacientes y deals.

---

## 4. Archivos Clave

| Archivo | Propósito | Tamaño |
|---------|-----------|--------|
| [ClinicsManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/ClinicsManagement.tsx) | CRUD de clínicas | 48 KB |
| [PipelineConfig.tsx](file:///d:/Clínica Rangel/src/core/organizations/PipelineConfig.tsx) | Editor visual de embudos | 39 KB |
| [WorkspaceSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/WorkspaceSettings.tsx) | Config del workspace | 44 KB |
| [ChatTemplatesSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/ChatTemplatesSettings.tsx) | Plantillas WhatsApp | 24 KB |
| [BranchDetail.tsx](file:///d:/Clínica Rangel/src/core/organizations/BranchDetail.tsx) | Detalle de sucursal | 21 KB |
| [TaskSequenceConfig.tsx](file:///d:/Clínica Rangel/src/core/organizations/TaskSequenceConfig.tsx) | Config automatizaciones | 21 KB |
| [TeamManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/TeamManagement.tsx) | Gestión de equipo | 19 KB |
| [PlatformBrandingSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/PlatformBrandingSettings.tsx) | Branding | 16 KB |
| [ProfileSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/ProfileSettings.tsx) | Perfil personal | 15 KB |
| [IntegrationsSettings.tsx](file:///d:/Clínica Rangel/src/core/settings/IntegrationsSettings.tsx) | API keys | 12 KB |
| [BranchesManagement.tsx](file:///d:/Clínica Rangel/src/core/organizations/BranchesManagement.tsx) | CRUD sucursales | 11 KB |
| [TagsManagement.tsx](file:///d:/Clínica Rangel/src/core/settings/TagsManagement.tsx) | CRUD tags | 9 KB |
| [SettingsLayout.tsx](file:///d:/Clínica Rangel/src/core/settings/SettingsLayout.tsx) | Layout sidebar | 6 KB |
| [Management.tsx](file:///d:/Clínica Rangel/src/core/organizations/Management.tsx) | Hub de gestión | 5 KB |
