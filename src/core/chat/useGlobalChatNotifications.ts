import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useApiKey } from './useTimelinesAI'

// ─── Notification sound (two-tone chime) ─────────────────────────────────────

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
        // Blocked by browser autoplay policy — silently ignore
    }
}

// ─── Browser notification helper ─────────────────────────────────────────────

async function requestNotificationPermission() {
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

    const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${chatId}`, // Replaces duplicate notifications for same chat
    })

    notification.onclick = () => {
        window.focus()
        navigate('/chat')
        notification.close()
    }

    // Auto-close after 6 seconds
    setTimeout(() => notification.close(), 6000)
}

// ─── Global hook ─────────────────────────────────────────────────────────────

/**
 * Global real-time listener for incoming WhatsApp messages.
 * Subscribes to ALL events in `chat_webhook_events` (not filtered by chat_id)
 * so it works from any route — not just when the ChatModule is mounted.
 *
 * Features:
 * - Plays a notification chime
 * - Shows a browser/OS notification with sender name + message preview
 * - Clicking the notification navigates to /chat
 * - Invalidates React Query caches so the chat list updates immediately
 */
export function useGlobalChatNotifications() {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const permissionRequested = useRef(false)

    // Request permission on first mount (after user interaction is likely to have occurred)
    useEffect(() => {
        if (!permissionRequested.current) {
            permissionRequested.current = true
            requestNotificationPermission()
        }
    }, [])

    useEffect(() => {
        if (!apiKey) return

        const channel = supabase
            .channel('global-chat-events')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_webhook_events',
                },
                (realtimePayload) => {
                    const row = realtimePayload?.new as Record<string, unknown>
                    const eventType = String(row?.event_type ?? '')
                    const chatId = String(row?.chat_id ?? '')
                    const payload = row?.payload as Record<string, unknown> | null

                    // Invalidate queries so any open chat list updates
                    queryClient.invalidateQueries({ queryKey: ['timelines_chats'] })
                    if (chatId) {
                        queryClient.invalidateQueries({
                            queryKey: ['timelines_messages', apiKey, chatId],
                        })
                    }

                    // Only notify for received messages
                    if (eventType !== 'message:received:new') return

                    // Extract sender info from the Timelines AI webhook payload
                    const chat = payload?.chat as Record<string, unknown> | null
                    const message = payload?.message as Record<string, unknown> | null
                    const senderName =
                        String(chat?.full_name ?? chat?.phone ?? 'WhatsApp')
                    const messageText =
                        String(message?.text ?? '📎 Archivo adjunto')
                    const preview =
                        messageText.length > 80
                            ? messageText.slice(0, 80) + '…'
                            : messageText

                    // Sound
                    playChime()

                    // Browser notification
                    showBrowserNotification(
                        `💬 ${senderName}`,
                        preview,
                        chatId,
                        navigate
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [apiKey, queryClient, navigate])
}
