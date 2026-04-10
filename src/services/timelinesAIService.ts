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

export interface WhatsAppAccount {
  id: string
  phone: string
  status: string
  owner_name: string
  owner_email: string
  account_name: string
  connected_on: string
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
  // Try to extract last_message from multiple possible API fields
  const lastMsg = String(raw.last_message_text ?? raw.last_message ?? raw.last_message_body ?? raw.latest_message_text ?? '')

  return {
    ...(raw as unknown as TimelinesChat),
    id: String(raw.id ?? ''),
    name: String(raw.name ?? raw.full_name ?? ''),
    phone: String(raw.phone ?? ''),
    labels: Array.isArray(raw.labels) ? (raw.labels as string[]) : [],
    // Map API fields → UI convenience fields
    last_message: lastMsg || undefined,
    last_message_time: String(raw.last_message_timestamp ?? raw.last_message_time ?? ''),
    chat_status: raw.closed ? 'closed' : 'open',
    chat_assignee: String(raw.responsible_name ?? raw.chat_assignee ?? '') || null,
    whatsapp_account_phone: (() => {
      const raw_wa = String(raw.whatsapp_account_id ?? raw.whatsapp_account_phone ?? '')
      // Strip JID suffix like @s.whatsapp.net → just the phone number
      const phone = raw_wa.replace(/@.*$/, '')
      return phone ? `+${phone}` : ''
    })(),
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

  // NOTE: Do NOT set read=false here — that filter hides already-read chats,
  // causing the list to appear empty intermittently. We want ALL chats regardless
  // of read status. The API returns chats sorted by recent activity by default.

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

  // Enrich chats that don't already have a last_message preview.
  // Process in batches of 10 to avoid rate-limit issues.
  const chatsNeedingEnrichment = chats.filter(c => !c.last_message)
  const BATCH_SIZE = 10
  for (let i = 0; i < chatsNeedingEnrichment.length; i += BATCH_SIZE) {
    const batch = chatsNeedingEnrichment.slice(i, i + BATCH_SIZE)
    const enrichPromises = batch.map(async (chat) => {
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
            let text = String(latestMsg.text ?? latestMsg.body ?? latestMsg.caption ?? '')
            // If no text but has attachment, show a descriptive label
            if (!text && (latestMsg.has_attachment || latestMsg.attachment_url)) {
              const fn = String(latestMsg.attachment_filename ?? '').toLowerCase()
              if (fn.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) text = '📷 Imagen'
              else if (fn.match(/\.(mp3|ogg|opus|wav|m4a|aac|oga)$/)) text = '🎵 Audio'
              else if (fn.match(/\.(mp4|webm|mov|avi|3gp)$/)) text = '🎬 Video'
              else text = '📎 Archivo'
            }
            chat.last_message = text.length > 60 ? text.slice(0, 60) + '…' : text
          }
        }
      } catch {
        // Silently skip individual enrichment failures
      }
    })
    await Promise.all(enrichPromises)
  }

  // Sort chats by last_message_time descending → most recent conversations first
  chats.sort((a, b) => {
    const timeA = a.last_message_time || ''
    const timeB = b.last_message_time || ''
    // Numeric timestamps (unix) or ISO strings both sort correctly with >
    if (timeA > timeB) return -1
    if (timeA < timeB) return 1
    return 0
  })

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


/** Search for a chat by phone number. Returns the first matching chat or null. */
export async function searchChatByPhone(apiKey: string, phone: string): Promise<TimelinesChat | null> {
  // Normalise: strip spaces, dashes etc but keep the + prefix
  const cleanPhone = phone.replace(/[\s\-()]/g, '')
  if (!cleanPhone) return null

  // Extract just digits for flexible matching
  const digits = cleanPhone.replace(/[^\d]/g, '')
  const last10 = digits.length > 10 ? digits.slice(-10) : digits

  // Try with the original phone (includes +)
  const trySearch = async (searchPhone: string): Promise<TimelinesChat | null> => {
    const params = new URLSearchParams({ phone: searchPhone })
    const response = await fetch(`${BASE_URL}/chats?${params.toString()}`, {
      method: 'GET',
      headers: authHeaders(apiKey),
    })
    if (!response.ok) return null
    const json = await response.json()
    const raw = extractArray<Record<string, unknown>>(json, 'chats', 'data', 'results')
    if (raw.length === 0) return null
    return normaliseChat(raw[0])
  }

  // Try different formats: +573158166898, 573158166898, 3158166898
  let result = await trySearch(cleanPhone)
  if (result) return result

  result = await trySearch(digits)
  if (result) return result

  if (last10 !== digits) {
    result = await trySearch(last10)
    if (result) return result
  }

  // Last resort: fetch recent chats and match by last 10 digits client-side
  try {
    const result2 = await getChats(apiKey)
    const match = result2.chats.find((chat: TimelinesChat) => {
      if (!chat.phone) return false
      const chatDigits = chat.phone.replace(/[^\d]/g, '')
      const chatLast10 = chatDigits.length > 10 ? chatDigits.slice(-10) : chatDigits
      return chatLast10 === last10
    })
    return match || null
  } catch {
    return null
  }
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

/** Fetch all WhatsApp accounts connected to the Timelines AI workspace */
export async function getWhatsAppAccounts(apiKey: string): Promise<WhatsAppAccount[]> {
  const response = await fetch(`${BASE_URL}/whatsapp_accounts`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })
  if (!response.ok) {
    throw new Error(`Timelines AI error ${response.status}: ${response.statusText}`)
  }
  const json = await response.json()
  const raw = extractArray<Record<string, unknown>>(json, 'whatsapp_accounts', 'data')
  return raw.map(a => ({
    id: String(a.id ?? ''),
    phone: String(a.phone ?? ''),
    status: String(a.status ?? ''),
    owner_name: String(a.owner_name ?? ''),
    owner_email: String(a.owner_email ?? ''),
    account_name: String(a.account_name ?? ''),
    connected_on: String(a.connected_on ?? ''),
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


// ─── File Upload ──────────────────────────────────────────────────────────────

/** Upload a file to Timelines AI and return the file UID */
export async function uploadFile(apiKey: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const response = await fetch(`${BASE_URL}/files_upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Error uploading file ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()
  // API returns: { status: "ok", data: { uid, filename, temporary_download_url, ... } }
  const fileUid = json?.data?.uid
  if (!fileUid) throw new Error('No file UID returned from upload')
  return fileUid
}

/** Send a file (already uploaded) to a chat using file_uid */
export async function sendFileMessage(
  apiKey: string,
  chatId: string,
  fileUid: string,
  caption?: string
): Promise<void> {
  const body: Record<string, string> = { file_uid: fileUid }
  if (caption) body.text = caption

  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Error sending file ${response.status}: ${response.statusText}`)
  }
}

/** Send a voice note as a native WhatsApp PTT audio message */
export async function sendVoiceMessage(
  apiKey: string,
  chatId: string,
  audioFile: File
): Promise<void> {
  const formData = new FormData()
  formData.append('file', audioFile, audioFile.name)

  const response = await fetch(`${BASE_URL}/chats/${chatId}/voice_message`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Error sending voice message ${response.status}: ${response.statusText}`)
  }
}

/** Mark a chat as read via PATCH /chats/{id} */
export async function markChatAsRead(apiKey: string, chatId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ read: true }),
  })
  if (!response.ok) {
    console.warn(`Failed to mark chat ${chatId} as read: ${response.status}`)
  }
}

// ─── Message Templates (local — Timelines AI has no templates API) ────────────

/** Fetch templates – tries Supabase DB first, falls back to hardcoded defaults */
export async function getTemplates(_apiKey: string): Promise<TimelinesTemplate[]> {
  // Try Supabase first
  try {
    const { supabase: sb } = await import('./supabase')
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data: profile } = await sb.from('profiles').select('clinica_id').eq('id', user.id).single()
      if (profile?.clinica_id) {
        const { data: dbTemplates } = await sb
          .from('chat_templates')
          .select('*')
          .eq('clinica_id', profile.clinica_id)
          .eq('is_active', true)
          .order('sort_order')
          .order('created_at', { ascending: false })
        if (dbTemplates && dbTemplates.length > 0) {
          return dbTemplates.map((t: Record<string, unknown>) => ({
            id: String(t.id),
            name: String(t.name),
            body: String(t.body),
            category: String(t.category ?? 'general'),
          }))
        }
      }
    }
  } catch { /* fall through to defaults */ }

  // Hardcoded defaults
  return [
    { id: 'saludo', name: '👋 Saludo inicial', body: '¡Hola! Soy parte del equipo de {{clinica}}. ¿En qué podemos ayudarte hoy?', category: 'greeting' },
    { id: 'bienvenida', name: '🏥 Bienvenida paciente nuevo', body: '¡Hola! Bienvenido/a a {{clinica}}. Qué bueno que nos escribes 😊 Me gustaría saber tu nombre, de qué ciudad nos escribes y tratamiento de interés para brindarte una mejor asesoría.', category: 'greeting' },
    { id: 'cita', name: '📅 Confirmar cita', body: 'Le confirmo su cita para el día _____ a las _____. Por favor llegar 15 minutos antes. ¿Tiene alguna pregunta?', category: 'appointment' },
    { id: 'recordatorio', name: '⏰ Recordatorio de cita', body: 'Hola, le recordamos que tiene una cita programada mañana a las _____. Por favor confirmar asistencia. ¡Gracias!', category: 'appointment' },
    { id: 'seguimiento', name: '💊 Seguimiento post-consulta', body: 'Hola, ¿cómo se ha sentido después de su consulta? Queremos saber si tiene alguna duda o si necesita algo más. Estamos para ayudarle.', category: 'follow-up' },
    { id: 'resultados', name: '📋 Resultados disponibles', body: 'Hola, le informamos que sus resultados ya están disponibles. ¿Le gustaría agendar una cita de seguimiento para revisarlos?', category: 'results' },
    { id: 'pago', name: '💳 Información de pago', body: 'Para su comodidad, puede realizar el pago mediante transferencia bancaria. Le envío los datos en seguida. Si tiene alguna duda, estoy para ayudarle.', category: 'billing' },
    { id: 'reagendar', name: '🔄 Reagendar cita', body: 'Entendemos que necesita reagendar su cita. ¿Qué fecha y horario le convendría? Tenemos disponibilidad de lunes a viernes.', category: 'appointment' },
    { id: 'despedida', name: '🙏 Despedida', body: '¡Gracias por comunicarse con {{clinica}}! Si necesita algo más, no dude en escribirnos. ¡Que tenga un excelente día!', category: 'closing' },
    { id: 'fuera_horario', name: '🌙 Fuera de horario', body: 'Hola, en este momento estamos fuera de nuestro horario de atención. Le responderemos a primera hora mañana. ¡Gracias por su comprensión!', category: 'auto' },
  ]
}

// ─── Labels ───────────────────────────────────────────────────────────────────

/** Get labels for a chat */
export async function getChatLabels(apiKey: string, chatId: string): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/labels`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })
  if (!response.ok) return []
  const json = await response.json()
  return json?.data?.labels ?? []
}

/** Set labels for a chat (replaces all existing labels) */
export async function setChatLabels(apiKey: string, chatId: string, labels: string[]): Promise<void> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/labels`, {
    method: 'PUT',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ labels }),
  })
  if (!response.ok) {
    throw new Error(`Error setting labels: ${response.status}`)
  }
}

/** Add a single label to a chat (preserves existing labels) */
export async function addChatLabel(apiKey: string, chatId: string, label: string): Promise<string[]> {
  // POST /chats/{id}/labels adds a label without removing existing ones
  const response = await fetch(`${BASE_URL}/chats/${chatId}/labels`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ labels: [label] }),
  })
  if (!response.ok) {
    throw new Error(`Error adding label: ${response.status}`)
  }
  const json = await response.json()
  return json?.data?.labels ?? []
}

// ─── Internal Notes ───────────────────────────────────────────────────────────

/** Add an internal note to a chat (visible only to workspace members) */
export async function addChatNote(apiKey: string, chatId: string, text: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/notes`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ text }),
  })
  if (!response.ok) {
    throw new Error(`Error adding note: ${response.status}`)
  }
  const json = await response.json()
  return json?.data?.message_uid ?? ''
}

// ─── Message Delivery Status ──────────────────────────────────────────────────

export interface MessageStatusEntry {
  status: 'Sent' | 'Delivered' | 'Read' | string
  timestamp: string
}

/** Get delivery status history for a specific message */
export async function getMessageStatusHistory(
  apiKey: string,
  messageUid: string
): Promise<MessageStatusEntry[]> {
  const response = await fetch(`${BASE_URL}/messages/${messageUid}/status_history`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })
  if (!response.ok) return []
  const json = await response.json()
  return json?.data ?? []
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
