// Timelines AI API Service Layer
// Docs: https://app.timelines.ai/integrations/api/...
// Auth: Bearer token in Authorization header

const BASE_URL = 'https://app.timelines.ai/integrations/api'

export interface TimelinesChat {
  id: string
  name: string
  phone: string
  last_message?: string
  last_message_time?: string
  unread_count?: number
  whatsapp_account_phone?: string
  account_id?: string
  labels?: string[]
  chat_status?: string
  chat_assignee?: string | null
}

export interface TimelinesMessage {
  id: string
  chat_id: string
  text: string
  timestamp: string
  from_me: boolean
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'contact' | string
  media_url?: string
  caption?: string
  author_name?: string
}

export interface TimelinesChatsResponse {
  data: TimelinesChat[]
  next_page?: string | null
}

export interface TimelinesMessagesResponse {
  data: TimelinesMessage[]
  next_page?: string | null
}

function authHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

/** Fetch all chats from Timelines AI */
export async function getChats(apiKey: string): Promise<TimelinesChat[]> {
  const response = await fetch(`${BASE_URL}/chats`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  })

  if (!response.ok) {
    throw new Error(`Timelines AI error ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()

  // Handle multiple possible response shapes from Timelines AI:
  // Shape A: { data: [...] }  (documented API)
  // Shape B: [...] (raw array)
  // Shape C: anything else → return empty
  let chats: TimelinesChat[]
  if (Array.isArray(json)) {
    chats = json as TimelinesChat[]
  } else if (json && Array.isArray(json.data)) {
    chats = json.data as TimelinesChat[]
  } else if (json && Array.isArray(json.results)) {
    chats = json.results as TimelinesChat[]
  } else {
    chats = []
  }

  // Normalise: ensure labels is always an array
  return chats.map(c => ({
    ...c,
    labels: Array.isArray(c.labels) ? c.labels : [],
  }))
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

  // Same defensive multi-shape handling
  if (Array.isArray(json)) return json as TimelinesMessage[]
  if (json && Array.isArray(json.data)) return json.data as TimelinesMessage[]
  if (json && Array.isArray(json.results)) return json.results as TimelinesMessage[]
  return []
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
      whatsapp_account_phone: whatsappAccountPhone,
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
