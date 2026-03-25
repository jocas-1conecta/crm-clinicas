// Chatbot AI Service — Manages chatbot configuration, knowledge base, and Edge Function calls
import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatbotConfig {
  id?: string
  clinica_id: string
  bot_name: string
  personality_prompt: string
  greeting_message: string
  fallback_message: string
  is_active: boolean
}

export interface KnowledgeEntry {
  id?: string
  clinica_id: string
  section: string
  title: string
  content: string
  sort_order: number
  is_active: boolean
}

export interface BranchInfo {
  id?: string
  sucursal_id: string
  clinica_id: string
  phone: string
  whatsapp: string
  address: string
  opening_hours: string
  extra_info: Record<string, string>
  is_active: boolean
}

export interface ChatMessage {
  id?: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface Conversation {
  id: string
  clinica_id: string
  started_by: string
  created_at: string
}

// ─── Knowledge Base Sections ──────────────────────────────────────────────────

export const KB_SECTIONS = [
  { value: 'about', label: 'Acerca de la Empresa', icon: '🏢' },
  { value: 'differentiators', label: 'Diferenciadores', icon: '⭐' },
  { value: 'hours', label: 'Horarios de Atención', icon: '🕐' },
  { value: 'location', label: 'Ubicación', icon: '📍' },
  { value: 'policies', label: 'Políticas', icon: '📋' },
  { value: 'faq', label: 'Preguntas Frecuentes', icon: '❓' },
  { value: 'promotions', label: 'Promociones', icon: '🎁' },
  { value: 'general', label: 'Información General', icon: '📄' },
] as const

// ─── Config CRUD ──────────────────────────────────────────────────────────────

export async function getChatbotConfig(clinicaId: string): Promise<ChatbotConfig | null> {
  const { data, error } = await supabase
    .from('chatbot_config')
    .select('*')
    .eq('clinica_id', clinicaId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertChatbotConfig(config: Partial<ChatbotConfig> & { clinica_id: string }): Promise<ChatbotConfig> {
  const { data: existing } = await supabase
    .from('chatbot_config')
    .select('id')
    .eq('clinica_id', config.clinica_id)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('chatbot_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('chatbot_config')
      .insert([config])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─── Knowledge Base CRUD ──────────────────────────────────────────────────────

export async function getKnowledgeBase(clinicaId: string): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from('chatbot_knowledge_base')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('is_active', true)
    .order('section')
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function saveKnowledgeEntry(entry: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
  if (entry.id) {
    const { data, error } = await supabase
      .from('chatbot_knowledge_base')
      .update(entry)
      .eq('id', entry.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('chatbot_knowledge_base')
      .insert([entry])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('chatbot_knowledge_base')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Branch Info CRUD ─────────────────────────────────────────────────────────

export async function getBranchInfoList(clinicaId: string): Promise<BranchInfo[]> {
  const { data, error } = await supabase
    .from('chatbot_branch_info')
    .select('*')
    .eq('clinica_id', clinicaId)
  if (error) throw error
  return data || []
}

export async function upsertBranchInfo(info: Partial<BranchInfo> & { sucursal_id: string; clinica_id: string }): Promise<BranchInfo> {
  const { data: existing } = await supabase
    .from('chatbot_branch_info')
    .select('id')
    .eq('sucursal_id', info.sucursal_id)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from('chatbot_branch_info')
      .update(info)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('chatbot_branch_info')
      .insert([info])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─── Conversations CRUD ───────────────────────────────────────────────────────

export async function createConversation(clinicaId: string): Promise<Conversation> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .insert([{ clinica_id: clinicaId, started_by: user?.id }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ─── Send Message via Edge Function (secure — no API key in frontend) ─────────

export async function sendChatMessage(
  clinicaId: string,
  conversationId: string,
  userMessage: string,
  _config: ChatbotConfig
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('chatbot', {
    body: {
      message: userMessage,
      conversation_id: conversationId,
      clinica_id: clinicaId,
    },
  })

  if (error) {
    console.error('Edge Function error:', error)
    throw new Error(error.message || 'Error al contactar al chatbot')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data?.reply || _config.fallback_message
}
