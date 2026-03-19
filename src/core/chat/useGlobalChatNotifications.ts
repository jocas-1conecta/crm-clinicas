import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useApiKey } from './useTimelinesAI'

// ─── Notification sound ───────────────────────────────────────────────────────

function playChime() {
    try {
        const ctx = new AudioContext()
        const notes = [880, 1100]
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.value = freq
            const start = ctx.currentTime + i * 0.12
            gain.gain.setValueAtTime(0, start)
            gain.gain.linearRampToValueAtTime(0.18, start + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
            osc.start(start)
            osc.stop(start + 0.35)
        })
    } catch {
        // Autoplay blocked — silently ignore
    }
}

// ─── Browser notification ─────────────────────────────────────────────────────

async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
}

function showBrowserNotification(
    title: string,
    body: string,
    chatId: string,
    navigate: (path: string) => void
) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `chat-${chatId}`,
    })
    n.onclick = () => { window.focus(); navigate('/chat'); n.close() }
    setTimeout(() => n.close(), 8000)
}

// ─── Global hook ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000 // Check every 5s

/**
 * Polls the `chat_webhook_events` table every 5s for new incoming messages.
 * Works from any route — not just the Chat module.
 *
 * On new `message:received:new` event:
 * - Plays a notification chime
 * - Shows a browser OS notification (if permission granted)
 * - Invalidates React Query caches so any open chat refreshes
 */
export function useGlobalChatNotifications() {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const lastSeenIdRef = useRef<number | null>(null)
    const initializedRef = useRef(false)

    // Request browser notification permission on first mount
    useEffect(() => {
        ensureNotificationPermission()
    }, [])

    useEffect(() => {
        if (!apiKey) return

        const poll = async () => {
            // On the very first run, just record the current max ID as baseline
            // so we don't fire notifications for old events on page load
            const { data, error } = await supabase
                .from('chat_webhook_events')
                .select('id, event_type, chat_id, payload')
                .order('id', { ascending: false })
                .limit(10)

            if (error || !data) return

            if (!initializedRef.current) {
                // Set baseline to the latest event ID — don't notify for old events
                lastSeenIdRef.current = data.length > 0 ? data[0].id : 0
                initializedRef.current = true
                return
            }

            // Find events newer than our last seen ID
            const newEvents = data.filter(
                row => row.id > (lastSeenIdRef.current ?? 0)
            )

            if (newEvents.length === 0) return

            // Update the baseline
            lastSeenIdRef.current = newEvents[0].id

            // Process incoming message events
            const receivedMessages = newEvents.filter(
                e => e.event_type === 'message:received:new'
            )

            if (receivedMessages.length === 0) return

            // Invalidate queries so any open chat list/messages update
            queryClient.invalidateQueries({ queryKey: ['timelines_chats'] })
            for (const evt of receivedMessages) {
                if (evt.chat_id) {
                    queryClient.invalidateQueries({
                        queryKey: ['timelines_messages', apiKey, String(evt.chat_id)],
                    })
                }
            }

            // Notify for the most recent incoming message
            const latest = receivedMessages[0]
            const payload = latest.payload as Record<string, unknown> | null
            const chat = payload?.chat as Record<string, unknown> | null
            const message = payload?.message as Record<string, unknown> | null
            const senderName = String(chat?.full_name ?? chat?.phone ?? 'WhatsApp')
            const text = String(message?.text ?? '📎 Archivo adjunto')
            const preview = text.length > 80 ? text.slice(0, 80) + '…' : text

            playChime()
            showBrowserNotification(`💬 ${senderName}`, preview, String(latest.chat_id), navigate)
        }

        // Start polling
        const interval = setInterval(poll, POLL_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [apiKey, queryClient, navigate])
}
