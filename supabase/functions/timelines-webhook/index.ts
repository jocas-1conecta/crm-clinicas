// Timelines AI Webhook Receiver — Supabase Edge Function
// Receives POST events from Timelines AI and broadcasts via Supabase Realtime.
// Also auto-creates leads (unknown numbers) or deals (existing patients).
// Deploy: supabase functions deploy timelines-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-secret',
}

// ─── Phone normalisation ─────────────────────────────────────────────────────

/** Extract just the digits from a JID or phone string, returning the last 10 */
function normalisePhone(raw: string): string {
  // "573001234567@s.whatsapp.net" → "573001234567" → last 10 = "3001234567"
  const digits = raw.replace(/@.*$/, '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** Format a JID-like phone into display format: +573001234567 */
function formatPhone(raw: string): string {
  const cleaned = raw.replace(/@.*$/, '').replace(/\D/g, '')
  return cleaned ? `+${cleaned}` : ''
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Validate shared secret (set this in Timelines AI webhook config)
    const secret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('TIMELINES_WEBHOOK_SECRET')
    if (expectedSecret && secret !== expectedSecret) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()

    // Timelines AI payload structure:
    // { event_type: "message:received:new", chat: { chat_id: 123, phone: "573001234567@s.whatsapp.net", full_name: "..." }, message: { ... } }
    const eventType:   string = payload?.event_type ?? 'unknown'
    const chatId:      string = String(payload?.chat?.chat_id ?? '')
    const messageUid:  string = String(payload?.message?.message_uid ?? '')

    if (!chatId) {
      return new Response('OK - no chat_id', { status: 200 })
    }

    // Insert event into Supabase — Realtime will broadcast it to the frontend
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: insertError } = await supabase.from('chat_webhook_events').insert({
      event_type: eventType,
      chat_id: chatId,
      message_uid: messageUid || null,
      payload: payload,
    })

    if (insertError) {
      console.error('Insert error:', JSON.stringify(insertError))
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Auto-create lead or deal on new incoming message ───────────────
    if (eventType === 'message:received:new') {
      try {
        await autoCreateLeadOrDeal(supabase, payload)
      } catch (autoErr) {
        // Log but don't fail the webhook — the event is already saved
        console.error('Auto-create error:', autoErr)
      }
    }

    return new Response(JSON.stringify({ ok: true, chat_id: chatId, event_type: eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Auto-creation logic ──────────────────────────────────────────────────────

async function autoCreateLeadOrDeal(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const chat = payload.chat as Record<string, unknown> | undefined
  if (!chat) return

  const rawPhone = String(chat.phone ?? chat.jid ?? '')
  if (!rawPhone) return

  const normalised = normalisePhone(rawPhone)
  if (normalised.length < 7) return // Too short to be a real number

  const displayPhone = formatPhone(rawPhone)
  const contactName = String(chat.full_name ?? chat.name ?? displayPhone)

  // 1. Resolve clinica_id — find the clinic that has Timelines AI configured
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .not('timelines_ai_api_key', 'is', null)
    .limit(1)
    .single()

  if (!clinica?.id) {
    console.log('No clinica with timelines_ai_api_key found, skipping auto-create')
    return
  }

  const clinicaId = clinica.id

  // 2. Get the first sucursal for this clinic (needed for leads)
  const { data: sucursal } = await supabase
    .from('sucursales')
    .select('id')
    .eq('clinica_id', clinicaId)
    .limit(1)
    .single()

  const sucursalId = sucursal?.id ?? null

  // 3. Check if this phone belongs to an existing patient
  //    Compare last 10 digits to handle format variations (+57, 57, no prefix)
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, assigned_to')
    .or(`phone.ilike.%${normalised}`)
    .limit(1)

  const isExistingPatient = patients && patients.length > 0

  if (isExistingPatient) {
    // ─── Patient exists → Create a deal (opportunity) ─────────────────
    const patient = patients[0]

    // Check for existing open deals to avoid duplicates
    // An open deal is one where stage has resolution_type = 'open'
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('patient_id', patient.id)
      .is('closed_at', null) // Still open
      .limit(1)

    if (existingDeals && existingDeals.length > 0) {
      console.log(`Patient ${patient.id} already has an open deal, skipping`)
      return
    }

    // Get default stage for deals pipeline
    const { data: defaultStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('board_type', 'deals')
      .eq('is_default', true)
      .is('is_archived', false)
      .limit(1)
      .single()

    const stageId = defaultStage?.id ?? null

    const { error: dealError } = await supabase.from('deals').insert({
      title: `Oportunidad WhatsApp — ${patient.name}`,
      patient_id: patient.id,
      estimated_value: 0,
      status: 'Nueva oportunidad',
      stage_id: stageId,
      assigned_to: patient.assigned_to ?? null,
    })

    if (dealError) {
      console.error('Error creating deal:', JSON.stringify(dealError))
    } else {
      console.log(`✓ Deal created for patient ${patient.id} (${patient.name})`)
    }
  } else {
    // ─── Unknown number → Create a lead ───────────────────────────────

    // Check for existing lead with same phone to avoid duplicates
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .or(`phone.ilike.%${normalised}`)
      .limit(1)

    if (existingLeads && existingLeads.length > 0) {
      console.log(`Lead with phone ...${normalised} already exists, skipping`)
      return
    }

    // Get default stage for leads pipeline
    const { data: defaultStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('board_type', 'leads')
      .eq('is_default', true)
      .is('is_archived', false)
      .limit(1)
      .single()

    const stageId = defaultStage?.id ?? null

    const { error: leadError } = await supabase.from('leads').insert({
      name: contactName,
      phone: displayPhone,
      source: 'Bot WhatsApp',
      sucursal_id: sucursalId,
      stage_id: stageId,
      stage_entered_at: new Date().toISOString(),
    })

    if (leadError) {
      console.error('Error creating lead:', JSON.stringify(leadError))
    } else {
      console.log(`✓ Lead created for ${contactName} (${displayPhone})`)
    }
  }
}
