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
  const fromMe =
    raw.from_me === true ||
    raw.direction === 'sent' ||
    (raw.sender as Record<string, unknown>)?.phone === (raw.recipient as Record<string, unknown>)?.phone

  return {
    ...(raw as unknown as TimelinesMessage),
    uid: String(raw.uid ?? raw.id ?? ''),
    id: String(raw.uid ?? raw.id ?? ''),
    chat_id: String(raw.chat_id ?? ''),
    text,
    timestamp: String(raw.timestamp ?? ''),
    from_me: !!fromMe,
    message_type: String(raw.message_type ?? raw.type ?? 'text'),
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Fetch all chats from Timelines AI — filters open chats and sorts by most recent */
export async function getChats(apiKey: string, maxPages = 3): Promise<TimelinesChat[]> {
  const allChats: TimelinesChat[] = []

  for (let page = 1; page <= maxPages; page++) {
    // closed=false → only open/active chats, sorted by most recent on Timelines side
    // closed=false: open chats only | group=false: direct chats only (skip @g.us group chats)
    const url = `${BASE_URL}/chats?closed=false&group=false&page=${page}`
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders(apiKey),
    })

    if (!response.ok) {
      if (page === 1) throw new Error(`Timelines AI error ${response.status}: ${response.statusText}`)
      break // Stop pagination on error after first page
    }

    const json = await response.json()
    // Real response: { status: "ok", data: { has_more_pages: bool, chats: [...] } }
    const raw = extractArray<Record<string, unknown>>(json, 'chats', 'data', 'results')
    const chats = raw.map(normaliseChat)
    allChats.push(...chats)

    // Stop early if no more pages
    const hasMore = json?.data?.has_more_pages === true
    if (!hasMore || chats.length === 0) break
  }

  // Sort by most recent message descending (same order as Timelines AI UI)
  allChats.sort((a, b) => {
    const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
    const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
    return tb - ta
  })

  return allChats
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

/** Send a text message via Timelines AI */
export async function sendMessage(
  apiKey: string,
  phone: string,
  whatsappAccountPhone: string,
  text: string
): Promise<void> {
  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      phone,
      whatsapp_account_id: whatsappAccountPhone,
      text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Error al enviar mensaje ${response.status}: ${response.statusText}`)
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
