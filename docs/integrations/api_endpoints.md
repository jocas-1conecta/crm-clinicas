# API Endpoints Reference

> **Tipo**: Supabase (PostgREST auto-generated) + Supabase Edge Functions + Timelines AI REST  
> **Base URL (Supabase)**: `https://<PROJECT>.supabase.co`  
> **Base URL (Timelines AI)**: `https://app.timelines.ai/integrations/api`

---

## 1. Supabase PostgREST — CRUD por Tabla

Supabase expone automáticamente endpoints REST para cada tabla con RLS habilitado. El frontend usa el SDK `@supabase/supabase-js` que mapea a estos endpoints internamente.

### 1.1 Core CRM

| Tabla | Operaciones | Filtros RLS | Archivo Frontend |
|-------|------------|-------------|------------------|
| `leads` | SELECT, INSERT, UPDATE | `clinica_id` vía `get_user_clinica_id()` | `LeadsPipeline`, `LeadsTable`, `LeadDetail` |
| `patients` | SELECT, INSERT, UPDATE | `clinica_id` | `Patients`, `PatientsTable`, `PatientDetail` |
| `appointments` | SELECT, INSERT, UPDATE | `clinica_id` | `AppointmentsPipeline`, `AppointmentsTable` |
| `deals` | SELECT, INSERT, UPDATE | `clinica_id` | `DealsPipeline`, `PatientDetail` |
| `crm_tasks` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` | `CalendarTasks`, `EntityTasks` |

### 1.2 Pipeline Engine

| Tabla | Operaciones | Filtros RLS |
|-------|------------|-------------|
| `pipeline_stages` | SELECT, INSERT, UPDATE | `clinica_id`, `board_type` |
| `pipeline_substages` | SELECT, INSERT, UPDATE | vía JOIN con `pipeline_stages` |
| `stage_transition_rules` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |
| `pipeline_history_log` | SELECT (read-only para frontend) | `clinica_id` |

### 1.3 Organizaciones

| Tabla | Operaciones | Filtros RLS |
|-------|------------|-------------|
| `clinicas` | SELECT, UPDATE | `Platform_Owner` full; otros solo su clínica |
| `sucursales` | SELECT, INSERT, UPDATE | `clinica_id` |
| `profiles` | SELECT, UPDATE | `clinica_id` |

### 1.4 Chatbot AI

| Tabla | Operaciones | Filtros RLS |
|-------|------------|-------------|
| `chatbot_config` | SELECT, INSERT, UPDATE | `clinica_id` |
| `chatbot_knowledge_base` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |
| `chatbot_branch_info` | SELECT, INSERT, UPDATE | `clinica_id` |
| `chatbot_conversations` | SELECT, INSERT | `clinica_id` |
| `chatbot_messages` | SELECT | `conversation_id` |

### 1.5 Chat & Messaging

| Tabla | Operaciones | Filtros RLS |
|-------|------------|-------------|
| `chat_webhook_events` | SELECT (INSERT vía Edge Function) | `clinica_id` |
| `chat_templates` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |

### 1.6 Settings & Tags

| Tabla | Operaciones | Filtros RLS |
|-------|------------|-------------|
| `clinic_tags` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |
| `services` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |
| `task_sequences` | SELECT, INSERT, UPDATE, DELETE | `clinica_id` |
| `task_sequence_steps` | SELECT, INSERT, UPDATE, DELETE | vía JOIN |

---

## 2. Supabase RPC Functions

Funciones SQL ejecutadas vía `supabase.rpc()`:

| Función | Propósito | Parámetros | Retorno | Usado en |
|---------|-----------|-----------|---------|----------|
| `get_my_profile()` | Obtener perfil del usuario autenticado | — | `profiles` row | `App.tsx` (auth bootstrap) |
| `get_timelines_api_key()` | Obtener API key de Timelines AI (encriptada) | — | `string` | `useApiKey()` |
| `get_user_clinica_id()` | Obtener `clinica_id` del usuario (para RLS) | — | `uuid` | Políticas RLS |

---

## 3. Supabase Edge Functions

### 3.1 `timelines-webhook`

**Archivo**: [timelines-webhook/index.ts](file:///d:/Clínica Rangel/supabase/functions/timelines-webhook/index.ts) — 260 líneas

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `https://<PROJECT>.supabase.co/functions/v1/timelines-webhook` |
| **Auth** | Header `x-webhook-secret` (env: `TIMELINES_WEBHOOK_SECRET`) |
| **Trigger** | Timelines AI webhook events |

**Flujo de procesamiento**:

```
POST /functions/v1/timelines-webhook
  ├─ Validar x-webhook-secret
  ├─ Extraer event_type, chat_id, message_uid
  ├─ Resolver clinica_id (single-tenant auto o mapping)
  ├─ INSERT → chat_webhook_events (Realtime lo broadcast al frontend)
  └─ Si event_type = 'message:received:new':
      ├─ Normalizar teléfono (JID → últimos 10 dígitos)
      ├─ Buscar en patients (phone ILIKE %normalised)
      ├─ Si patient existe AND sin deal abierto → INSERT deal
      └─ Si no existe → Buscar en leads → Si no existe → INSERT lead
```

**Payload recibido** (ejemplo):
```json
{
  "event_type": "message:received:new",
  "chat": {
    "chat_id": "12345",
    "phone": "573001234567@s.whatsapp.net",
    "full_name": "Juan Pérez"
  },
  "message": {
    "message_uid": "abc-123",
    "text": "Hola, quisiera una cita"
  }
}
```

**Respuesta exitosa**:
```json
{ "ok": true, "chat_id": "12345", "event_type": "message:received:new" }
```

---

### 3.2 `chatbot`

**Archivo**: [chatbot/index.ts](file:///d:/Clínica Rangel/supabase/functions/chatbot/index.ts) — 12 KB

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `https://<PROJECT>.supabase.co/functions/v1/chatbot` |
| **Auth** | Supabase Auth JWT (vía `supabase.functions.invoke()`) |
| **Modelo** | Gemini 2.0 Flash (`GEMINI_API_KEY`) |

**Request body**:
```json
{
  "message": "¿Cuáles son sus horarios?",
  "conversation_id": "uuid",
  "clinica_id": "uuid"
}
```

**Flujo interno**:
1. Cargar `chatbot_config` para la clínica.
2. Cargar `chatbot_knowledge_base` (RAG context injection).
3. Cargar `chatbot_branch_info` (datos de sucursales).
4. Cargar historial de `chatbot_messages` (contexto conversacional).
5. Construir prompt con personalidad + knowledge + branch info.
6. Llamar a Gemini 2.0 Flash API.
7. Guardar user message + assistant reply en `chatbot_messages`.
8. Retornar `{ reply: "..." }`.

**Respuesta exitosa**:
```json
{ "reply": "¡Hola! Nuestros horarios de atención son de Lunes a Viernes de 9:00 a 18:00..." }
```

---

## 4. Timelines AI REST API (External)

**Base URL**: `https://app.timelines.ai/integrations/api`  
**Auth**: `Authorization: Bearer <API_KEY>`  
**Archivo de servicio**: [timelinesAIService.ts](file:///d:/Clínica Rangel/src/services/timelinesAIService.ts) — 586 líneas

### 4.1 Chats

| Endpoint | Método | Descripción | Params |
|----------|--------|-------------|--------|
| `/chats` | GET | Listar chats paginados | `page`, `closed`, `group`, `read`, `phone` |
| `/chats/{chatId}` | PATCH | Actualizar chat (cerrar/abrir, asignar) | Body: `{ closed, responsible_id, read }` |
| `/chats/{chatId}/messages` | GET | Obtener mensajes de un chat | `limit` |
| `/chats/{chatId}/messages` | POST | Enviar texto o archivo | Body: `{ text }` o `{ file_uid }` |
| `/chats/{chatId}/voice_message` | POST | Enviar nota de voz (PTT) | FormData: `file` |
| `/chats/{chatId}/labels` | GET | Obtener etiquetas | — |
| `/chats/{chatId}/labels` | POST | Añadir etiqueta | Body: `{ labels: ["tag"] }` |
| `/chats/{chatId}/labels` | PUT | Reemplazar todas las etiquetas | Body: `{ labels: [...] }` |
| `/chats/{chatId}/notes` | POST | Añadir nota interna | Body: `{ text }` |

### 4.2 Messages

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/messages` | POST | Crear nueva conversación | Body: `{ phone, text }` |
| `/messages/{messageUid}/status_history` | GET | Estado de entrega |

### 4.3 Files

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/files_upload` | POST | Subir archivo | FormData: `file` |

### 4.4 Users & Webhooks

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/users` | GET | Listar miembros del workspace |
| `/webhooks` | POST | Registrar webhook | Body: `{ url, events }` |

---

## 5. Supabase Realtime Channels

| Canal | Tabla | Filtro | Evento | Usado en |
|-------|-------|--------|--------|----------|
| `chat-events-{chatId}` | `chat_webhook_events` | `chat_id=eq.{chatId}` | INSERT | `useChatRealtime()` |
| `global-chat-events` | `chat_webhook_events` | Ninguno | INSERT | `useGlobalChatNotifications()` |

---

## 6. Chatbot Service Functions (Frontend → Supabase)

**Archivo**: [chatbotService.ts](file:///d:/Clínica Rangel/src/services/chatbotService.ts) — 236 líneas

| Función | Tabla/RPC | Operación |
|---------|-----------|-----------|
| `getChatbotConfig(clinicaId)` | `chatbot_config` | SELECT single |
| `upsertChatbotConfig(config)` | `chatbot_config` | UPSERT (check + insert/update) |
| `getKnowledgeBase(clinicaId)` | `chatbot_knowledge_base` | SELECT all active |
| `saveKnowledgeEntry(entry)` | `chatbot_knowledge_base` | INSERT or UPDATE |
| `deleteKnowledgeEntry(id)` | `chatbot_knowledge_base` | DELETE |
| `getBranchInfoList(clinicaId)` | `chatbot_branch_info` | SELECT all |
| `upsertBranchInfo(info)` | `chatbot_branch_info` | UPSERT |
| `createConversation(clinicaId)` | `chatbot_conversations` | INSERT |
| `getConversationMessages(id)` | `chatbot_messages` | SELECT ordered |
| `sendChatMessage(...)` | Edge Function `chatbot` | `supabase.functions.invoke()` |
