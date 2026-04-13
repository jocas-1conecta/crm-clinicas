# Integración Timelines AI (WhatsApp)

> **Última actualización:** 2026-04-13  
> **Estado:** ✅ Producción  
> **Documentación oficial:**  
> - API: https://timelinesai.mintlify.app/public-api-reference/overview  
> - Webhooks: https://timelinesai.mintlify.app/webhook-reference/overview

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Archivos del Proyecto](#archivos-del-proyecto)
4. [Seguridad — API Keys](#seguridad--api-keys)
5. [API Service Layer](#api-service-layer)
6. [React Hooks](#react-hooks)
7. [Módulo de Chat (UI)](#módulo-de-chat-ui)
8. [Webhooks y Realtime](#webhooks-y-realtime)
9. [Base de Datos](#base-de-datos)
10. [Flujo Completo de Datos](#flujo-completo-de-datos)
11. [Problemas Conocidos y Soluciones](#problemas-conocidos-y-soluciones)
12. [Referencia de API Endpoints](#referencia-de-api-endpoints)

---

## Visión General

El CRM se integra con **Timelines AI** para ofrecer un módulo de Chat WhatsApp completo dentro de la plataforma. Esto permite a los asesores comerciales y administradores:

- Ver y responder chats de WhatsApp directamente en el CRM
- Enviar archivos (imágenes, documentos, audio, video)
- Enviar notas de voz nativas
- Asignar chats a asesores responsables
- Cerrar/reabrir conversaciones
- Auto-crear leads y deals cuando llegan mensajes de números desconocidos
- Recibir notificaciones en tiempo real de mensajes entrantes
- Usar plantillas de respuesta rápida

### ¿Qué es Timelines AI?

Timelines AI es un servicio SaaS que conecta cuentas de WhatsApp Business/Personal y expone una API REST para leer/enviar mensajes, gestionar chats y recibir webhooks. El CRM se conecta a la API de Timelines AI usando un Bearer Token (API Key) almacenado de forma cifrada en la base de datos.

---

## Arquitectura

```
┌─────────────────┐     API REST      ┌──────────────────┐
│   Frontend      │◄─────────────────►│  Timelines AI    │
│   (React)       │   Bearer Token    │  API Server      │
│                 │                   │  app.timelines.ai │
│  ┌────────────┐ │                   └──────┬───────────┘
│  │ChatModule  │ │                          │
│  │.tsx        │ │                          │ Webhooks
│  └──────┬─────┘ │                          ▼
│         │       │              ┌────────────────────────┐
│  ┌──────┴─────┐ │              │ Supabase Edge Function │
│  │useTimelines│ │              │ timelines-webhook      │
│  │AI.ts       │ │              └──────────┬─────────────┘
│  └──────┬─────┐ │                         │
│         │       │   Realtime              │ INSERT
│  ┌──────┴──────┐│   PostgreSQL            ▼
│  │timelines    ││◄───────────── ┌──────────────────────┐
│  │AIService.ts ││   Changes     │ chat_webhook_events  │
│  └─────────────┘│               │ (PostgreSQL table)   │
└─────────────────┘               └──────────────────────┘
```

### Flujo de Datos

1. **Frontend → Timelines AI (Polling):** El cliente React consulta la API de Timelines AI directamente usando el API Key descifrado. Se usa React Query con polling cada 60s para la lista de chats y 15s para los mensajes del chat activo.

2. **Timelines AI → Supabase (Webhooks):** Cuando llega un mensaje nuevo a WhatsApp, Timelines AI envía un POST webhook a un Supabase Edge Function que inserta el evento en `chat_webhook_events`.

3. **Supabase → Frontend (Realtime):** El frontend suscribe a cambios en `chat_webhook_events` vía Supabase Realtime. Cuando llega un evento, invalida las queries de React Query para refrescar inmediatamente.

---

## Archivos del Proyecto

```
src/
├── services/
│   └── timelinesAIService.ts                ← API client + types + normalización
├── core/chat/
│   ├── ChatModule.tsx                       ← UI completa (lista + conversación + info)
│   ├── useTimelinesAI.ts                    ← Hooks React Query (chats, messages, mutations)
│   ├── useChatContactMap.ts                 ← Mapeo chat ↔ lead/patient + filtro visibilidad
│   └── useGlobalChatNotifications.ts        ← Notificaciones globales (polling + browser)
├── index.css                                ← CSS animaciones (glow no leídos)

supabase/
├── functions/
│   └── timelines-webhook/
│       └── index.ts                   ← Edge Function receptor de webhooks
├── migrations/
│   ├── 20260318000001_chat_module.sql        ← Esquema base del módulo chat
│   ├── 20260319005721_chat_webhook_events.sql ← Tabla webhook events + RLS
│   ├── 20260320152800_chat_templates.sql      ← Tabla plantillas de respuesta
│   ├── 20260323_webhook_clinica_id.sql        ← clinica_id en webhook events
│   ├── 20260331000002_fix_webhook_events_rls.sql
│   ├── 20260331000010_fix_encrypt_api_keys.sql ← Cifrado AES-256 para API keys
│   └── 20260410000004_chat_contact_map.sql    ← Mapeo bidireccional chat ↔ contacto
```

---

## Seguridad — API Keys

### Almacenamiento Cifrado

Las API keys de Timelines AI se almacenan **cifradas con AES-256** en la base de datos usando `pgcrypto`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `clinicas.timelines_ai_api_key` | `TEXT` | Marker `***ENCRYPTED***` (backward compat) |
| `clinicas.timelines_ai_api_key_enc` | `BYTEA` | Key cifrada con `pgp_sym_encrypt()` |

### Funciones RPC (SECURITY DEFINER)

| Función | Acceso | Descripción |
|---------|--------|-------------|
| `get_timelines_api_key()` | Authenticated | Descifra y retorna la API key de la clínica del usuario |
| `set_timelines_api_key(p_key)` | Solo admins | Cifra y guarda una nueva API key |
| `has_timelines_api_key()` | Authenticated | Retorna boolean sin exponer el valor |

### Clave de Cifrado

La clave maestra vive en un PostgreSQL config parameter:
```sql
-- Configurar en Supabase Dashboard → Settings → Database
ALTER DATABASE postgres SET app.settings.encryption_key = '<clave-secreta-32-chars>';
```

### Flujo en el Frontend

```typescript
// El hook useApiKey() llama a la función RPC para obtener la key descifrada
const { data: apiKey } = useQuery({
    queryKey: ['timelines_api_key', clinicaId],
    queryFn: () => supabase.rpc('get_timelines_api_key'),
})
// apiKey se usa como Bearer Token en todas las llamadas a Timelines AI
```

---

## API Service Layer

**Archivo:** `src/services/timelinesAIService.ts`  
**Base URL:** `https://app.timelines.ai/integrations/api`  
**Auth:** `Authorization: Bearer <api_key>`

### Tipos Principales

```typescript
// Chat de WhatsApp normalizado
interface TimelinesChat {
    id: string
    name: string
    phone: string
    is_group?: boolean
    closed?: boolean
    read?: boolean
    labels?: string[]
    last_message?: string              // Preview del último mensaje
    last_message_time?: string         // Timestamp del último mensaje
    last_message_uid?: string          // UID del último mensaje (para enriquecimiento)
    unread_count?: number              // 0 o 1 (basado en campo read)
    chat_assignee?: string | null      // Nombre del responsable en Timelines AI
    responsible_email?: string | null   // Email del responsable (clave para glows)
    responsible_name?: string | null    // Nombre del responsable
    whatsapp_account_phone?: string
    chat_status?: string               // 'open' | 'closed' (derivado de closed)
}

// Mensaje de WhatsApp normalizado
interface TimelinesMessage {
    uid: string
    chat_id: string
    text: string
    timestamp: string
    from_me: boolean
    direction?: 'sent' | 'received'    // Alternativa a from_me
    message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'contact' | string
    has_attachment?: boolean
    attachment_url?: string
    attachment_filename?: string
    media_url?: string                 // Alternativa a attachment_url
    caption?: string                   // Caption de adjuntos
    author_name?: string
}

// Filtro de vista del chat
type ChatViewFilter = 'open' | 'unread'
```

### Funciones Exportadas

| Función | Endpoint API | Descripción |
|---------|-------------|-------------|
| `getChats(apiKey, options)` | `GET /chats` | Lista de chats paginada con filtros |
| `getChatMessages(apiKey, chatId, opts)` | `GET /chats/{id}/messages` | Mensajes de un chat (soporta incremental) |
| `sendMessage(apiKey, chatId, text)` | `POST /chats/{id}/messages` | Enviar texto |
| `createNewConversation(apiKey, phone, text)` | `POST /messages` | Iniciar nueva conversación |
| `searchChatByPhone(apiKey, phone)` | `GET /chats?phone=...` | Buscar chat por teléfono |
| `updateChat(apiKey, chatId, payload)` | `PATCH /chats/{id}` | Cerrar, asignar, marcar leído |
| `uploadFile(apiKey, file)` | `POST /files_upload` | Subir archivo y obtener UID |
| `sendFileMessage(apiKey, chatId, fileUid)` | `POST /chats/{id}/messages` | Enviar archivo ya subido |
| `sendVoiceMessage(apiKey, chatId, audio)` | `POST /chats/{id}/voice_message` | Enviar nota de voz |
| `markChatAsRead(apiKey, chatId)` | `PATCH /chats/{id}` | Marcar como leído |
| `getWhatsAppAccounts(apiKey)` | `GET /whatsapp_accounts` | Cuentas conectadas |
| `getWorkspaceMembers(apiKey)` | `GET /users` | Miembros del workspace |
| `getChatLabels(apiKey, chatId)` | `GET /chats/{id}/labels` | Etiquetas del chat |
| `setChatLabels(apiKey, chatId, labels)` | `PUT /chats/{id}/labels` | Reemplazar etiquetas |
| `addChatLabel(apiKey, chatId, label)` | `POST /chats/{id}/labels` | Añadir etiqueta |
| `addChatNote(apiKey, chatId, text)` | `POST /chats/{id}/notes` | Nota interna |
| `getMessageStatusHistory(apiKey, uid)` | `GET /messages/{uid}/status_history` | Estado de entrega |
| `getTemplates(apiKey)` | Supabase DB / hardcoded | Plantillas de respuesta |
| `registerWebhook(apiKey, url, events)` | `POST /webhooks` | Registrar webhook |
| `verifyApiKey(apiKey)` | `GET /chats` | Verificar si API key es válida |

### Normalización de Datos

La API de Timelines AI devuelve campos con nombres inconsistentes. Las funciones `normaliseChat()` y `normaliseMessage()` unifican los datos:

```
API Field                    → Normalised Field
─────────────────────────────────────────────────
last_message_text/body/text  → last_message
last_message_timestamp       → last_message_time
responsible_name             → chat_assignee
read === false               → unread_count = 1
phone (JID format)           → whatsapp_account_phone
```

### Filtros de Chat y Eliminación de Fantasmas (Dual-Fetch)

La API de Timelines AI devuelve "contactos fantasma" (entradas del directorio WhatsApp sin historial de mensajes) cuando se consulta sin filtro `read`. Estos fantasmas pueden ser 500+ entradas antes de aparecer chats reales.

**Estrategia dual-fetch:** Para evitar fantasmas, `getChats()` siempre ejecuta 2 requests en paralelo:

```typescript
// Ambas requests en paralelo — NUNCA se llama sin filtro read
GET /chats?closed=false&read=false&page=1  → chats no leídos (sin fantasmas)
GET /chats?closed=false&read=true&page=1   → chats leídos (sin fantasmas)
```

Luego se combinan, deduplicando por chat ID, con `unread_count` correcto:
- Chats de `read=true` → `unread_count = 0`
- Chats de `read=false` → `unread_count = 1` (sobrescribe si duplicado)

Se ordenan por `last_message_timestamp` DESC y se eliminan fantasmas:
```typescript
const realChats = merged.filter(c => !!(c.last_message_time || c.last_message_uid))
```

El tab **"No leídos"** es un **filtro client-side** (`unread_count > 0`), NO hace una llamada adicional a la API.

### Retry con Backoff Exponencial

Todas las llamadas a la API usan `fetchWithRetry` con backoff exponencial (2s, 4s, 8s) para manejar errores HTTP 429 (rate limit).

### Enriquecimiento de Previews

El endpoint `/chats` **NO retorna el texto del último mensaje**, solo `last_message_uid`. Por eso hacemos un enriquecimiento ligero:

- Se toman los primeros 5 chats sin preview
- Se fetch en batches de 2 (para evitar rate limit 429)
- Delay de 800ms entre batches
- Para adjuntos: se muestra emoji según extensión (📷 Imagen, 🎵 Audio, etc.)

### Carga Incremental de Mensajes

```typescript
// Primera carga: todos los mensajes
GET /chats/{id}/messages?sorting_order=asc

// Polls subsiguientes: solo mensajes nuevos
GET /chats/{id}/messages?sorting_order=asc&after_message={last_uid}
```

Los mensajes nuevos se fusionan con el caché existente en React Query, evitando recargas totales.

---

## React Hooks

**Archivo:** `src/core/chat/useTimelinesAI.ts`

### Hooks Principales

| Hook | Propósito |
|------|-----------|
| `useApiKey()` | Obtiene la API key descifrada vía RPC |
| `useChats()` | Todos los chats abiertos (dual-fetch), filtrado de "No leídos" es client-side |
| `useChatMessages(chatId)` | Mensajes con carga incremental y polling 15s |
| `useSendMessage()` | Mutation para enviar texto con optimistic update |
| `useUpdateChat()` | Mutation para cerrar/asignar/marcar leído |
| `useUploadAndSendFile()` | Upload + send de archivos |
| `useCreateNewConversation()` | Iniciar chat nuevo por teléfono |
| `useMarkChatAsRead()` | Marcar chat como leído |
| `useWorkspaceMembers()` | Miembros de Timelines AI para asignación |
| `useTemplates()` | Plantillas de respuesta rápida |
| `useChatRealtime(chatId)` | Subscripción Realtime a webhook events |
| `useChatLabels(chatId)` | CRUD de etiquetas del chat |
| `useAddChatNote()` | Agregar nota interna |
| `useAssignedPhones()` | Phones de leads/patients del asesor actual |
| `useMessageStatus(messageUid)` | Historial de estado de entrega de un mensaje |
| `useChatByPhone(phone)` | Busca un chat por teléfono (usado en LeadDetail y PatientDetail) |

### Configuración de Cache (React Query)

| Parámetro | Chat List | Messages |
|-----------|-----------|----------|
| `staleTime` | 30s | 10s |
| `gcTime` | 5 min | 5 min |
| `refetchInterval` | 60s | 15s |
| `refetchOnWindowFocus` | No | No |

> **Nota sobre tab switching:** Los tabs "Abiertos" y "No leídos" comparten la misma query de datos. El filtro de "No leídos" (`unread_count > 0`) se aplica client-side en `ChatModule.tsx`, haciendo el cambio de tab **instantáneo** (sin llamadas API). Al hacer clic en un chat, `updateChatLocal()` actualiza `unread_count: 0` inmediatamente en el estado local.

---

## Módulo de Chat (UI)

**Archivo:** `src/core/chat/ChatModule.tsx`

### Componentes Internos

| Componente | Descripción |
|------------|-------------|
| `ChatListPanel` | Sidebar izquierdo: barra de búsqueda, tabs de filtro, lista de chats |
| `ConversationPanel` | Panel central: mensajes, input de texto, adjuntos |
| `ChatInfoPanel` | Panel derecho: info del contacto, acciones, asignación |

### Filtros (2 Tabs)

| Tab | Filtro | Descripción |
|-----|--------|-------------|
| 📥 **Abiertos** | Dual-fetch API (`read=false` + `read=true`) | Todos los chats abiertos (leídos + no leídos) |
| 💬 **No leídos** | Client-side (`unread_count > 0`) | Solo chats con mensajes pendientes — **cambio instantáneo** |

### Efectos Visuales — Sistema de Glows Contextuales

| Clase CSS | Color | Condición | Significado |
|-----------|-------|-----------|-------------|
| `.chat-glow-new` | 🟢 Verde | `!chat_assignee && !responsible_email` | Chat nuevo, sin asignar |
| `.chat-glow-mine` | 🔵 Celeste | `responsible_email === currentUser.email` | Asignado a ti |
| _(sin glow)_ | — | Asignado a otro asesor | No requiere tu atención |

- **Badge "NUEVO"** (verde): Indica chat sin responsable asignado en Timelines AI
- **Badge "TUYO"** (celeste): Indica chat asignado al usuario actual
- **Punto de notificación**: Verde (nuevo) o celeste (tuyo) en el avatar
- **Audio notification**: Sonido Web Audio API (880Hz + 1100Hz) al recibir mensaje

### Modal de Nuevo Chat

Cuando un asesor abre un chat sin asignar (`!chat_assignee && !responsible_email`), se muestra un modal informativo:

1. **Explica los colores**: Verde = nuevo, Celeste = tuyo, Teal = otro asesor
2. **Opción de asignar**: Dropdown con miembros del workspace de Timelines AI
3. **"No mostrar de nuevo"**: Checkbox que guarda preferencia en `localStorage` (`chat_new_modal_dismissed`)

Si el usuario marca "No mostrar de nuevo", el modal no aparece en futuros chats nuevos. La preferencia se puede resetear borrando `localStorage.removeItem('chat_new_modal_dismissed')` desde DevTools.

### Mapeo Chat → Contacto CRM

**Archivo:** `src/core/chat/useChatContactMap.ts`

Vincula automáticamente los chats de Timelines AI con leads/patients del CRM usando normalización de teléfonos (últimos 10 dígitos).

**Reglas de visibilidad para asesores:**
- ✅ Chats mapeados a leads/patients asignados al asesor
- ✅ Chats mapeados sin asignar (pool compartido)
- ✅ Chats sin mapear (contactos nuevos, visibles para todos)
- ❌ Chats mapeados a leads/patients de otro asesor

**Admins ven todos los chats sin restricción.**

**Hooks exportados:**

| Hook | Propósito |
|------|-----------|
| `useChatContactMap(chats)` | Auto-mapea chats ↔ leads/patients y retorna `visibleChatIds` filtrados por rol |
| `useLinkChatToContact()` | Mutation para vincular manualmente un chat a un lead o patient (upsert en `chat_contact_map`) |

---

## Webhooks y Realtime

### Edge Function: `timelines-webhook`

**Archivo:** `supabase/functions/timelines-webhook/index.ts`  
**URL:** `https://<supabase-project>.supabase.co/functions/v1/timelines-webhook`

### Eventos Soportados

| Evento | Acción |
|--------|--------|
| `message:received:new` | Inserta en `chat_webhook_events` + auto-crea lead/deal |
| `message:sent:new` | Inserta en `chat_webhook_events` |
| `chat:created` | Inserta en `chat_webhook_events` |

### Auto-Creación de Leads/Deals

Cuando llega un `message:received:new`:

1. **Teléfono desconocido** → Crea un nuevo **Lead** con:
   - `source = 'Bot WhatsApp'`
   - `phone` del contacto
   - `assigned_to` resuelto desde `responsible_email` de Timelines AI
   - `stage_id` = stage default del pipeline de leads

2. **Teléfono de paciente existente** → Crea un nuevo **Deal** con:
   - `title = 'Oportunidad WhatsApp — {nombre}'`
   - `patient_id` vinculado
   - `assigned_to` del responsable o del paciente existente
   - Solo si no hay deals abiertos para ese paciente

### Resolución de Clínica (Multi-tenant)

1. **Prioridad 1:** Busca `account_id` del webhook → `clinicas.timelines_account_id`
2. **Prioridad 2:** Si solo hay 1 clínica con API key, la usa (y auto-guarda `account_id`)

### Seguridad del Webhook

- Valida `x-webhook-secret` header contra `TIMELINES_WEBHOOK_SECRET` env var
- Usa `SUPABASE_SERVICE_ROLE_KEY` para inserts (bypassa RLS)

### Subscripción Realtime en el Frontend

```typescript
// useChatRealtime(chatId) suscribe a:
supabase
    .channel(`chat-events-${chatId}`)
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_webhook_events',
        filter: `chat_id=eq.${chatId}`,
    }, (payload) => {
        // Invalida queries para refresco inmediato
        queryClient.invalidateQueries(['timelines_messages', apiKey, chatId])
        queryClient.invalidateQueries(['timelines_chats'])
        
        // Sonido de notificación para mensajes entrantes
        if (payload.event_type === 'message:received:new') {
            playNotificationSound()
        }
    })
```

### Notificaciones Globales (fuera del Chat)

**Archivo:** `src/core/chat/useGlobalChatNotifications.ts`  
**Montado en:** `App.tsx` — se ejecuta en **todas las rutas**, no solo en `/chat`.

Este hook complementa la subscripción Realtime con un **sistema de polling** que garantiza notificaciones incluso si Realtime no está configurado o falla:

| Aspecto | Valor |
|---------|-------|
| **Intervalo de polling** | 5 segundos |
| **Tabla consultada** | `chat_webhook_events` (últimos 10 registros) |
| **Baseline** | Al montar, registra el último `id` como baseline para no notificar eventos viejos |
| **Filtro** | Solo procesa eventos `message:received:new` posteriores al baseline |

**Acciones al recibir un mensaje entrante:**

1. 🔊 **Sonido de notificación** — Web Audio API (880Hz + 1100Hz, two-tone chime)
2. 🖥️ **Browser notification** (OS-level) — Pide permiso al montar; muestra título con nombre/teléfono del contacto y preview del mensaje (80 chars). Click en la notificación navega a `/chat`.
3. ⚡ **Invalidación de cache** — `invalidateQueries(['timelines_chats'])` + queries de mensajes por `chat_id`.

> **Nota:** El permiso de browser notifications se solicita automáticamente al cargar la app. Si el usuario lo deniega, solo se reproduce el sonido.

---

## Base de Datos

### Tablas Relacionadas con Chat

#### `chat_webhook_events`
```sql
id          BIGINT PRIMARY KEY           -- Auto-increment
event_type  TEXT NOT NULL                 -- 'message:received:new', etc.
chat_id     TEXT NOT NULL                 -- ID del chat en Timelines AI
message_uid TEXT                          -- UID del mensaje (si aplica)
payload     JSONB                        -- Payload completo del webhook
clinica_id  UUID                         -- FK a clinicas (multi-tenant)
created_at  TIMESTAMPTZ DEFAULT now()
```
- **Auto-cleanup:** Función `cleanup_old_webhook_events()` borra eventos > 24h
- **Realtime:** Habilitado para suscripciones en el frontend
- **RLS:** Service role = insert, authenticated = select

#### `chat_contact_map`
```sql
id           UUID PRIMARY KEY
chat_id      TEXT NOT NULL                 -- ID del chat en Timelines AI
chat_phone   TEXT                          -- Teléfono normalizado (10 dígitos)
lead_id      UUID REFERENCES leads(id)    -- FK a leads (nullable)
patient_id   UUID REFERENCES patients(id) -- FK a patients (nullable)
clinica_id   UUID NOT NULL                -- FK a clinicas
auto_matched BOOLEAN DEFAULT true         -- false si fue manual
created_at   TIMESTAMPTZ DEFAULT now()
UNIQUE(chat_id, clinica_id)
```
- **Auto-mapping:** El hook `useChatContactMap` compara teléfonos y crea mappings automáticamente
- **RLS:** Aislamiento por clínica vía `get_user_clinica_id()`

#### `chat_templates`
```sql
id          UUID PRIMARY KEY
clinica_id  UUID NOT NULL
name        TEXT NOT NULL                  -- "👋 Saludo inicial"
body        TEXT NOT NULL                  -- "¡Hola! Soy parte de {{clinica}}..."
category    TEXT DEFAULT 'general'         -- greeting, appointment, follow-up, etc.
media_url   TEXT                           -- Adjunto opcional
media_type  TEXT                           -- image, video, audio, document
variables   JSONB DEFAULT '[]'             -- Variables de plantilla
sort_order  INT DEFAULT 0
is_active   BOOLEAN DEFAULT true
created_by  UUID REFERENCES auth.users(id)
```
- **RLS:** Todos leen; solo admins crean/editan/borran

#### `clinicas` (campos de Timelines AI)
```sql
timelines_ai_api_key      TEXT    -- Marker '***ENCRYPTED***'
timelines_ai_api_key_enc  BYTEA  -- Key cifrada con pgcrypto AES-256
timelines_account_id      TEXT   -- Account ID para multi-tenant webhook routing
```

---

## Flujo Completo de Datos

### Flujo: Asesor abre el Chat

```
1. ChatModule monta
2. useApiKey() → supabase.rpc('get_timelines_api_key') → API key descifrada
3. useChats() → getChats() dual-fetch:
   a. GET /chats?closed=false&read=false (no leídos)
   b. GET /chats?closed=false&read=true  (leídos)
   c. Merge + dedup por chat ID + sort por timestamp
4. normaliseChat() mapea campos, unread_count correcto
5. Filtro fantasma: descarta chats sin last_message_uid
6. Enriquecimiento: fetch preview de últimos 5 chats sin texto
7. useChatContactMap() filtra por visibilidad del asesor
8. Tab "No leídos" → filtro client-side: unread_count > 0 (instantáneo)
9. ChatListPanel renderiza con glow animado
```

### Flujo: Asesor envía un mensaje

```
1. useSendMessage() → optimistic update (mensaje local 'temp-xxx')
2. api.sendMessage() → POST /chats/{id}/messages
3. Timelines AI envía el mensaje por WhatsApp
4. Next poll (15s) → getChatMessages() con after_message → merge
5. Mensaje temporal reemplazado por el real
```

### Flujo: Cliente envía mensaje por WhatsApp

```
1. WhatsApp → Timelines AI recibe el mensaje
2. Timelines AI → POST webhook a Edge Function
3. Edge Function → INSERT en chat_webhook_events
4. Si número desconocido → auto-create Lead
5. Si paciente existente → auto-create Deal
6. Supabase Realtime → notifica al frontend
7. useChatRealtime() → invalidateQueries()
8. React Query refetch → mensajes actualizados
9. 🔊 Sonido de notificación
```

---

## Problemas Conocidos y Soluciones

### Problema: Chats Fantasma ✅ RESUELTO

**Síntoma:** La lista de chats mostraba ~500+ contactos vacíos (nombres como ".", "0", "????") en las primeras páginas.

**Causa:** La API sin filtro `read` devuelve contactos del directorio de WhatsApp sincronizados que no tienen historial de mensajes.

**Solución (dual-fetch):**
1. NUNCA llamar sin filtro `read` — siempre usar `read=false` y `read=true` en paralelo
2. Merge con deduplicación por chat ID
3. Filtro post-procesamiento: `chats.filter(c => c.last_message_time || c.last_message_uid)`

### Problema: Rate Limit 429 ✅ MITIGADO

**Síntoma:** Errores 429 al enriquecer previews o hacer muchas consultas.

**Solución:** 
- `fetchWithRetry` con backoff exponencial (2s, 4s, 8s) para todas las llamadas
- Batches de 2 con delay de 800ms para enriquecimiento de previews
- Límite de 5 chats para enriquecimiento por página

### Problema: Texto "Sin mensajes" en lista

**Síntoma:** Chats aparecen con "Sin mensajes" como preview.

**Causa:** El endpoint `/chats` NO retorna el texto del último mensaje, solo `last_message_uid`.

**Solución:** Enriquecimiento que hace `GET /chats/{id}/messages?limit=1&sorting_order=desc` para cada chat.

### Problema: Chat vacío para Asesores en tab "Abiertos"

**Síntoma:** El tab "Abiertos" muestra vacío para asesores.

**Causa:** Los chats leídos pueden estar asignados a otros asesores en el CRM, y el filtro de visibilidad (`useChatContactMap`) los oculta correctamente.

**Estado:** Comportamiento esperado. El asesor debe ir a "No leídos" para ver sus chats pendientes.

---

## Referencia de API Endpoints

### Documentación Oficial

| Recurso | URL |
|---------|-----|
| API Reference | https://timelinesai.mintlify.app/public-api-reference/overview |
| Webhooks | https://timelinesai.mintlify.app/webhook-reference/overview |
| Base URL | `https://app.timelines.ai/integrations/api` |
| Auth | `Authorization: Bearer <api_key>` |

### Endpoints Usados

#### Chats

```http
# Listar chats abiertos — DUAL-FETCH (siempre ambos en paralelo)
GET /chats?closed=false&read=false&page=1   # No leídos (sin fantasmas)
GET /chats?closed=false&read=true&page=1    # Leídos (sin fantasmas)
# ⚠️ NUNCA usar GET /chats?closed=false sin filtro read → devuelve 500+ fantasmas

# Buscar chat por teléfono
GET /chats?phone=+573158166898

# Actualizar chat (cerrar, asignar, marcar leído)
PATCH /chats/{id}
Body: { "closed": true }  |  { "responsible": "email@..." }  |  { "read": true }
```

#### Mensajes

```http
# Listar mensajes (cronológico)
GET /chats/{id}/messages?sorting_order=asc

# Carga incremental (mensajes después de un UID)
GET /chats/{id}/messages?sorting_order=asc&after_message={uid}

# Último mensaje (para preview)
GET /chats/{id}/messages?limit=1&sorting_order=desc

# Enviar texto
POST /chats/{id}/messages
Body: { "text": "Hola..." }

# Enviar archivo previamente subido
POST /chats/{id}/messages
Body: { "file_uid": "abc-123", "text": "Caption opcional" }

# Enviar nota de voz
POST /chats/{id}/voice_message
Body: FormData con campo "file" (audio)

# Iniciar conversación nueva
POST /messages
Body: { "phone": "+573001234567", "text": "Hola..." }
```

#### Archivos

```http
# Subir archivo
POST /files_upload
Body: FormData con campo "file"
Response: { "status": "ok", "data": { "uid": "...", "filename": "...", "temporary_download_url": "..." } }
```

#### Labels y Notas

```http
# Obtener etiquetas
GET /chats/{id}/labels

# Reemplazar etiquetas
PUT /chats/{id}/labels
Body: { "labels": ["urgente", "vip"] }

# Agregar etiqueta (sin borrar las existentes)
POST /chats/{id}/labels
Body: { "labels": ["nueva-etiqueta"] }

# Agregar nota interna
POST /chats/{id}/notes
Body: { "text": "Nota para el equipo..." }
```

#### Estado de Mensajes

```http
# Historial de estado de un mensaje
GET /messages/{uid}/status_history
Response: [{ "status": "Sent", "timestamp": "..." }, { "status": "Delivered", "timestamp": "..." }]
```

#### Otros

```http
# Cuentas de WhatsApp conectadas
GET /whatsapp_accounts

# Usuarios del workspace
GET /users

# Registrar webhook
POST /webhooks
Body: { "url": "https://...", "events": ["message:received:new", "message:sent:new", "chat:created"] }
```

---

## Variables de Entorno Relacionadas

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `app.settings.encryption_key` | PostgreSQL config | Clave AES-256 para cifrar API keys |
| `TIMELINES_WEBHOOK_SECRET` | Edge Function env | Secreto compartido para validar webhooks |
| `SUPABASE_URL` | Edge Function env | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env | Service role key para bypasear RLS |

---

## Configuración Inicial

### 1. Obtener API Key de Timelines AI
- Ir a https://app.timelines.ai → Settings → API
- Copiar el Bearer Token

### 2. Guardar en el CRM
- Ir a CRM → Configuración → Integraciones
- Pegar el API Key en el campo de Timelines AI
- El sistema lo cifra automáticamente con `set_timelines_api_key()`

### 3. Configurar Webhook
- En Timelines AI → Settings → Webhooks
- URL: `https://<supabase-project>.supabase.co/functions/v1/timelines-webhook`
- Events: `message:received:new`, `message:sent:new`, `chat:created`
- Secret: Configurar el mismo valor en `TIMELINES_WEBHOOK_SECRET`

### 4. Habilitar Realtime
- En Supabase Dashboard → Database → Replication
- Añadir `chat_webhook_events` a las tablas con Realtime habilitado
