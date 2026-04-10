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

    // ── Resolve clinica_id via account_id mapping (multi-tenant safe) ──
    // Each clinic stores its Timelines AI account_id in clinicas.timelines_account_id.
    // The webhook payload includes account_id, so we match directly.
    let resolvedClinicaId: string | null = null

    const accountId = String((payload as Record<string, unknown>)?.account_id ?? '')

    // Step 1: Direct account_id → clinica_id lookup (preferred, multi-tenant safe)
    if (accountId) {
      const { data: matchedClinic } = await supabase
        .from('clinicas')
        .select('id')
        .eq('timelines_account_id', accountId)
        .limit(1)
        .single()

      if (matchedClinic) {
        resolvedClinicaId = matchedClinic.id
        console.log(`✓ Resolved clinic by account_id ${accountId} → ${matchedClinic.id}`)
      }
    }

    // Step 2: Fallback — if only one clinic has Timelines AI, use it
    //         Also auto-populate account_id so future lookups use Step 1
    if (!resolvedClinicaId) {
      const { data: clinicas } = await supabase
        .from('clinicas')
        .select('id, timelines_account_id')
        .or('timelines_ai_api_key_enc.not.is.null,timelines_ai_api_key.not.is.null')

      if (clinicas && clinicas.length === 1) {
        resolvedClinicaId = clinicas[0].id

        // Auto-populate account_id for this clinic if missing
        if (accountId && !clinicas[0].timelines_account_id) {
          await supabase
            .from('clinicas')
            .update({ timelines_account_id: accountId })
            .eq('id', clinicas[0].id)
          console.log(`✓ Auto-populated timelines_account_id=${accountId} for clinic ${clinicas[0].id}`)
        }
      } else if (clinicas && clinicas.length > 1) {
        console.warn(`⚠️ ${clinicas.length} clinics have Timelines AI but none match account_id=${accountId}. Configure timelines_account_id on each clinic.`)
      }
    }

    const { error: insertError } = await supabase.from('chat_webhook_events').insert({
      event_type: eventType,
      chat_id: chatId,
      message_uid: messageUid || null,
      payload: payload,
      clinica_id: resolvedClinicaId,
    })

    if (insertError) {
      console.error('Insert error:', JSON.stringify(insertError))
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Auto-create lead or deal on new incoming message ───────────────
    if (eventType === 'message:received:new' && resolvedClinicaId) {
      try {
        await autoCreateLeadOrDeal(supabase, payload, resolvedClinicaId)
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

// ─── Resolve responsible user from Timelines AI → CRM profile ─────────────────

async function resolveResponsible(
  supabase: ReturnType<typeof createClient>,
  chat: Record<string, unknown>,
  clinicaId: string
): Promise<string | null> {
  // Timelines AI includes responsible_email in the chat object
  const responsibleEmail = String(chat.responsible_email ?? '').trim().toLowerCase()
  if (!responsibleEmail) return null

  // Look up this email in our profiles table (same clinic)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', responsibleEmail)
    .eq('clinica_id', clinicaId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (profile?.id) {
    console.log(`✓ Responsible resolved: ${responsibleEmail} → ${profile.id}`)
    return profile.id
  }

  console.log(`⚠ Responsible email ${responsibleEmail} not found in profiles for clinic ${clinicaId}`)
  return null
}

// ─── Auto-creation logic ──────────────────────────────────────────────────────

async function autoCreateLeadOrDeal(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  clinicaId: string
) {
  const chat = payload.chat as Record<string, unknown> | undefined
  if (!chat) return

  const rawPhone = String(chat.phone ?? chat.jid ?? '')
  if (!rawPhone) return

  const normalised = normalisePhone(rawPhone)
  if (normalised.length < 7) return // Too short to be a real number

  const displayPhone = formatPhone(rawPhone)
  const contactName = String(chat.full_name ?? chat.name ?? displayPhone)

  // Resolve the Timelines AI responsible → CRM user
  const assignedTo = await resolveResponsible(supabase, chat, clinicaId)

  // 1. Get the first sucursal for this clinic (needed for leads)
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

    // Use Timelines AI responsible if available, otherwise patient's existing assignee
    const dealAssignee = assignedTo ?? patient.assigned_to ?? null

    const { error: dealError } = await supabase.from('deals').insert({
      title: `Oportunidad WhatsApp — ${patient.name}`,
      patient_id: patient.id,
      estimated_value: 0,
      status: 'Nueva oportunidad',
      stage_id: stageId,
      assigned_to: dealAssignee,
    })

    if (dealError) {
      console.error('Error creating deal:', JSON.stringify(dealError))
    } else {
      console.log(`✓ Deal created for patient ${patient.id} (${patient.name}) → assigned: ${dealAssignee}`)
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
      assigned_to: assignedTo,
    })

    if (leadError) {
      console.error('Error creating lead:', JSON.stringify(leadError))
    } else {
      console.log(`✓ Lead created for ${contactName} (${displayPhone}) → assigned: ${assignedTo}`)
    }
  }
}
