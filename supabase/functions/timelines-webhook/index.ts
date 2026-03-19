// Timelines AI Webhook Receiver — Supabase Edge Function
// Receives POST events from Timelines AI and broadcasts via Supabase Realtime.
// Deploy: supabase functions deploy timelines-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-secret',
}

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
    // { event_type: "message:received:new", chat: { chat_id: 123 }, message: { message_uid: "..." } }
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

    await supabase.from('chat_webhook_events').insert({
      event_type: eventType,
      chat_id: chatId,
      message_uid: messageUid || null,
      payload: payload,
    })

    return new Response(JSON.stringify({ ok: true }), {
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
