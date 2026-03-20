// Timelines AI API Service Layer
// Docs: https://timelinesai.mintlify.app/public-api-reference/overview
// Auth: Bearer token in Authorization header
// Base URL: https://app.timelines.ai/integrations/api

const BASE_URL = 'https://app.timelines.ai/integrations/api'

// ─── Interfaces (aligned with actual API response) ────────────────────────────

export interface TimelinesChat {
  id: string
  name: string
  phone: string
  jid?: string
  is_group?: boolean
  closed?: boolean
  read?: boolean
  labels?: string[]
  whatsapp_account_id?: string
  chat_url?: string
  created_timestamp?: string
  last_message_timestamp?: string
  last_message_uid?: string
  responsible_email?: string | null
  responsible_name?: string | null
  photo?: string | null
  unattended?: boolean
  is_allowed_to_message?: boolean
  // Mapped for UI convenience
  last_message?: string
  last_message_time?: string
  unread_count?: number
  whatsapp_account_phone?: string
  chat_status?: string
  chat_assignee?: string | null
}

export interface TimelinesMessage {
  uid: string
  id?: string
  chat_id: string | number
  text: string
  timestamp: string
  from_me: boolean
  direction?: 'sent' | 'received'
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'contact' | string
  media_url?: string
  caption?: string
  author_name?: string
  // Attachment fields (from Timelines AI API)
  has_attachment?: boolean
  attachment_url?: string
  attachment_filename?: string
}

export interface TimelinesTemplate {
  id: string
  name: string
  body: string
  language?: string
  category?: string
}


function authHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract an array from any response shape */
function extractArray<T>(json: unknown, ...keys: string[]): T[] {
  if (!json || typeof json !== 'object') return []
  const obj = json as Record<string, unknown>

  // Shape: { status: "ok", data: { chats: [...] } }  ← Real Timelines AI API
  // Shape: { data: [...] }
  // Shape: [...]
  if (Array.isArray(obj)) return obj as T[]

  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as T[]
    // nested one level
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>
      if (Array.isArray(data[key])) return data[key] as T[]
    }
  }

  // Last resort: obj.data itself
  if (Array.isArray((obj as Record<string, unknown>).data)) {
    return (obj as Record<string, unknown>).data as T[]
  }

  return []
}

/** Normalise a raw chat object to our TimelinesChat shape */
function normaliseChat(raw: Record<string, unknown>): TimelinesChat {
  return {
    ...(raw as unknown as TimelinesChat),
    id: String(raw.id ?? ''),
    name: String(raw.name ?? raw.full_name ?? ''),
    phone: String(raw.phone ?? ''),
    labels: Array.isArray(raw.labels) ? (raw.labels as string[]) : [],
    // Map API fields → UI convenience fields
    last_message_time: String(raw.last_message_timestamp ?? raw.last_message_time ?? ''),
    chat_status: raw.closed ? 'closed' : 'open',
    chat_assignee: String(raw.responsible_name ?? raw.chat_assignee ?? '') || null,
    whatsapp_account_phone: String(raw.whatsapp_account_id ?? raw.whatsapp_account_phone ?? ''),
    unread_count: raw.read === false ? 1 : 0,
  }
}

/** Normalise a raw message object to our TimelinesMessage shape */
function normaliseMessage(raw: Record<string, unknown>): TimelinesMessage {
  const text = String(raw.text ?? raw.body ?? raw.caption ?? '')
  const fromMe = raw.from_me === true || raw.direction === 'sent'
  const attachmentUrl = String(raw.attachment_url ?? raw.media_url ?? '')
  const attachmentFilename = String(raw.attachment_filename ?? raw.filename ?? '')
  const hasAttachment = raw.has_attachment === true || !!attachmentUrl

  return {
    ...(raw as unknown as TimelinesMessage),
    uid: String(raw.uid ?? raw.id ?? ''),
    id: String(raw.uid ?? raw.id ?? ''),
    chat_id: String(raw.chat_id ?? ''),
    text,
    timestamp: String(raw.timestamp ?? ''),
    from_me: fromMe,
    message_type: String(raw.message_type ?? raw.type ?? 'text'),
    author_name: String(raw.sender_name ?? raw.author_name ?? ''),
    has_attachment: hasAttachment,
    attachment_url: attachmentUrl || undefined,
    attachment_filename: attachmentFilename || undefined,
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

// ── Filter types ──────────────────────────────────────────────────────────────
export type ChatStatusFilter = 'all' | 'open' | 'closed'
export type ChatTypeFilter   = 'all' | 'direct' | 'group'

export interface GetChatsOptions {
  status?: ChatStatusFilter  // 'all' | 'open' | 'closed'
  chatType?: ChatTypeFilter  // 'all' | 'direct' | 'group'
  page?: number              // 1-indexed, 50 chats per page
}

export interface GetChatsResult {
  chats: TimelinesChat[]
  hasMore: boolean
  page: number
}

/** Fetch a single page of chats with optional filters */
export async function getChats(
  apiKey: string,
  options: GetChatsOptions = {}
): Promise<GetChatsResult> {
  const { status = 'all', chatType = 'all', page = 1 } = options

  const params = new URLSearchParams({ page: String(page) })

  // Status filter
  if (status === 'open')   params.set('closed', 'false')
  if (status === 'closed') params.set('closed', 'true')

  // Type filter
  if (chatType === 'direct') params.set('group', 'false')
  if (chatType === 'group')  params.set('group', 'true')

  // Show unread chats by default → API returns them sorted by recent activity
  // with last_message_timestamp populated. For 'closed' tab, skip this filter.
  if (status !== 'closed') params.set('read', 'false')

  const url = `${BASE_URL}/chats?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })

  if (!response.ok) {
    throw new Error(`Timelines AI error ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()
  const raw = extractArray<Record<string, unknown>>(json, 'chats', 'data', 'results')
  const chats = raw.map(normaliseChat)

  // Enrich first 15 chats with last message text preview (in parallel)
  const enrichPromises = chats.slice(0, 15).map(async (chat) => {
    try {
      const msgResponse = await fetch(`${BASE_URL}/chats/${chat.id}/messages?limit=1`, {
        method: 'GET',
        headers: authHeaders(apiKey),
      })
      if (msgResponse.ok) {
        const msgJson = await msgResponse.json()
        const msgs = extractArray<Record<string, unknown>>(msgJson, 'messages', 'data')
        if (msgs.length > 0) {
          const latestMsg = msgs[0]
          const text = String(latestMsg.text ?? latestMsg.body ?? latestMsg.caption ?? '')
          chat.last_message = text.length > 60 ? text.slice(0, 60) + '…' : text
        }
      }
    } catch {
      // Silently skip
    }
  })
  await Promise.all(enrichPromises)

  return {
    chats,
    hasMore: json?.data?.has_more_pages === true,
    page,
  }
}

/** Fetch messages for a specific chat */
export async function getChatMessages(apiKey: string, chatId: string): Promise<TimelinesMessage[]> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })

  if (!response.ok) {
    throw new Error(`Timelines AI error ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()
  // Real response: { status: "ok", data: { messages: [...] } } or similar
  const raw = extractArray<Record<string, unknown>>(json, 'messages', 'data', 'results')
  return raw.map(normaliseMessage)
}

/** Send a text message within a specific chat (POST /chats/{chatId}/messages) */
export async function sendMessage(
  apiKey: string,
  chatId: string,
  text: string
): Promise<void> {
  // Use the chat-specific endpoint so the message appears in GET /chats/{id}/messages
  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error(`Error al enviar mensaje ${response.status}: ${response.statusText}`)
  }
}

/**
 * Start a new WhatsApp conversation with a phone number.
 * Uses POST /messages with a phone field — Timelines AI creates the chat automatically.
 * Returns the new message_uid.
 */
export async function createNewConversation(
  apiKey: string,
  phone: string,
  text: string
): Promise<string> {
  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ phone, text }),
  })

  if (!response.ok) {
    throw new Error(`Error iniciando conversación ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()
  return String(json?.data?.message_uid ?? json?.message_uid ?? '')
}


/** Verify an API key by trying to fetch chats. Returns true if valid. */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    await getChats(apiKey)
    return true
  } catch {
    return false
  }
}

/** Upload a file to Timelines AI and return its file_id */
export async function uploadFile(apiKey: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` }, // No Content-Type: browser sets multipart boundary
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Error subiendo archivo ${response.status}: ${response.statusText}`)
  }
  const json = await response.json()
  // Response: { status: "ok", data: { file_id: "..." } } or { file_id: "..." }
  const fileId = json?.data?.file_id ?? json?.file_id ?? json?.id
  if (!fileId) throw new Error('No se recibió file_id de Timelines AI')
  return String(fileId)
}

/** Send a file message using a pre-uploaded file_id */
export async function sendFileMessage(
  apiKey: string,
  chatId: string,
  fileId: string,
  caption?: string
): Promise<void> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ file_id: fileId, text: caption ?? '' }),
  })
  if (!response.ok) {
    throw new Error(`Error enviando archivo ${response.status}: ${response.statusText}`)
  }
}

/** Fetch message templates from Timelines AI workspace */
export async function getTemplates(apiKey: string): Promise<TimelinesTemplate[]> {
  const response = await fetch(`${BASE_URL}/templates`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })
  if (!response.ok) return []
  const json = await response.json()
  const raw = extractArray<Record<string, unknown>>(json, 'templates', 'data', 'results')
  return raw.map(t => ({
    id: String(t.id ?? t.name ?? ''),
    name: String(t.name ?? t.title ?? ''),
    body: String(t.body ?? t.content ?? t.text ?? ''),
    language: String(t.language ?? ''),
    category: String(t.category ?? ''),
  }))
}


/** Update a chat — close/reopen or assign responsible */
export async function updateChat(
  apiKey: string,
  chatId: string,
  payload: { closed?: boolean; responsible_id?: string | null }
): Promise<void> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Error actualizando chat ${response.status}: ${response.statusText}`)
  }
}

export interface WorkspaceMember {
  id: string
  name: string
  email: string
}

/** Get list of members/users in the Timelines AI workspace */
export async function getWorkspaceMembers(apiKey: string): Promise<WorkspaceMember[]> {
  const response = await fetch(`${BASE_URL}/users`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })
  if (!response.ok) return []
  const json = await response.json()
  const raw = extractArray<Record<string, unknown>>(json, 'users', 'data', 'results')
  return raw.map(u => ({
    id: String(u.id ?? u.email ?? ''),
    name: String(u.name ?? u.full_name ?? u.email ?? ''),
    email: String(u.email ?? ''),
  }))
}


// ─── Webhook registration ─────────────────────────────────────────────────────

/** Register a webhook URL to receive real-time events from Timelines AI */
export async function registerWebhook(
  apiKey: string,
  url: string,
  events: string[] = ['message:received:new', 'message:sent:new', 'chat:created']
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}/webhooks`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ url, events }),
  })

  if (!response.ok) {
    throw new Error(`Error registrando webhook ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
