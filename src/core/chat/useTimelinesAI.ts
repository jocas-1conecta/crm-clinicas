import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import * as api from '../../services/timelinesAIService'

// ── API Key ───────────────────────────────────────────────────────────────────

function useApiKey() {
    const { currentUser } = useStore()
    return useQuery({
        queryKey: ['timelines_api_key', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return null
            const { data, error } = await supabase
                .from('clinicas')
                .select('timelines_ai_api_key')
                .eq('id', currentUser.clinica_id)
                .single()
            if (error) throw error
            return (data?.timelines_ai_api_key as string | null) ?? null
        },
        enabled: !!currentUser?.clinica_id,
        staleTime: 5 * 60 * 1000,
    })
}

// ── Realtime: subscribe to webhook events ────────────────────────────────────

/**
 * Subscribes to Supabase Realtime on `chat_webhook_events`.
 * When an event for the active chatId arrives, invalidates the messages query
 * immediately — giving instant updates instead of waiting for the 15s poll.
 * Falls back gracefully if Realtime is not configured yet.
 */
export function useChatRealtime(chatId: string | null) {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!chatId || !apiKey) return

        const channel = supabase
            .channel(`chat-events-${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_webhook_events',
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    // Immediately refresh messages when a real-time event arrives
                    queryClient.invalidateQueries({
                        queryKey: ['timelines_messages', apiKey, chatId],
                    })
                    // Also refresh the chat list so last_message updates
                    queryClient.invalidateQueries({
                        queryKey: ['timelines_chats'],
                    })

                    // Play a soft notification sound only for incoming messages
                    const eventType = (payload?.new as Record<string, unknown>)?.event_type
                    if (eventType === 'message:received:new') {
                        playNotificationSound()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [chatId, apiKey, queryClient])
}

/** Play a soft two-tone notification using the Web Audio API */
function playNotificationSound() {
    try {
        const ctx = new AudioContext()
        const notes = [880, 1100] // A5 → C#6 (pleasant two-tone chime)
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
        // AudioContext blocked or not supported — silently ignore
    }
}

/** Hook to fetch and paginate chats with filters */
export function useChats(options: {
    status?: api.ChatStatusFilter
    chatType?: api.ChatTypeFilter
} = {}) {
    const { data: apiKey } = useApiKey()
    const [page, setPage] = useState(1)
    const [accumulatedChats, setAccumulatedChats] = useState<api.TimelinesChat[]>([])
    const [hasMore, setHasMore] = useState(false)

    const queryKey = ['timelines_chats', apiKey, options.status, options.chatType, page]

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            const result = await api.getChats(apiKey!, {
                status: options.status,
                chatType: options.chatType,
                page,
            })
            setHasMore(result.hasMore)
            if (page === 1) {
                setAccumulatedChats(result.chats)
            } else {
                setAccumulatedChats(prev => {
                    // Merge: avoid duplicates by id
                    const existingIds = new Set(prev.map(c => c.id))
                    const newChats = result.chats.filter(c => !existingIds.has(c.id))
                    return [...prev, ...newChats]
                })
            }
            return result
        },
        enabled: !!apiKey,
        refetchInterval: 60_000,
        retry: 1,
    })

    const loadMore = useCallback(() => {
        if (hasMore && !query.isFetching) setPage(p => p + 1)
    }, [hasMore, query.isFetching])

    // Reset to page 1 when filters change
    const resetAndRefetch = useCallback(() => {
        setPage(1)
        setAccumulatedChats([])
        setHasMore(false)
    }, [])

    return {
        ...query,
        data: accumulatedChats,
        hasMore,
        loadMore,
        resetAndRefetch,
    }
}

/** Fetch messages for a specific chat */
export function useChatMessages(chatId: string | null) {
    const { data: apiKey } = useApiKey()

    return useQuery({
        queryKey: ['timelines_messages', apiKey, chatId],
        queryFn: () => api.getChatMessages(apiKey!, chatId!),
        enabled: !!apiKey && !!chatId,
        refetchInterval: 15_000, // Poll every 15s
        retry: 1,
    })
}

/** Send a WhatsApp message within a specific chat */
export function useSendMessage() {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ chatId, text }: {
            chatId: string
            text: string
        }) => {
            if (!apiKey) throw new Error('No API Key configurada')
            return api.sendMessage(apiKey, chatId, text)
        },

        // ── Optimistic update: show the message instantly ──────────────────
        onMutate: async ({ chatId, text }) => {
            const queryKey = ['timelines_messages', apiKey, chatId]

            // NOTE: we do NOT cancel queries here — cancelling kills the 15s polling interval
            // Snapshot previous messages in case we need to roll back
            const previousMessages = queryClient.getQueryData<api.TimelinesMessage[]>(queryKey)

            // Build a temporary message that looks like a real one
            const optimistic: api.TimelinesMessage = {
                uid: `temp-${Date.now()}`,
                id: `temp-${Date.now()}`,
                chat_id: chatId,
                text,
                from_me: true,
                timestamp: new Date().toISOString(),
                message_type: 'text',
                author_name: '',
            }

            queryClient.setQueryData(queryKey, [
                ...(previousMessages ?? []),
                optimistic,
            ])

            return { previousMessages, queryKey }
        },

        // ── Roll back on error ─────────────────────────────────────────────
        onError: (_err, _vars, context) => {
            if (context?.previousMessages !== undefined) {
                queryClient.setQueryData(context.queryKey, context.previousMessages)
            }
        },

        // ── Confirm with real data after a delay; always restart polling ───
        onSuccess: (_data, { chatId }) => {
            const queryKey = ['timelines_messages', apiKey, chatId]
            setTimeout(() => queryClient.invalidateQueries({ queryKey }), 2000)
            setTimeout(() => queryClient.invalidateQueries({ queryKey }), 4000)
        },

        // ── Always re-enable polling after mutation settles ────────────────
        onSettled: (_data, _err, { chatId }) => {
            const queryKey = ['timelines_messages', apiKey, chatId]
            queryClient.resumePausedMutations()
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

/** Update a chat (close/reopen or assign responsible) */
export function useUpdateChat() {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            chatId,
            payload,
        }: {
            chatId: string
            payload: { closed?: boolean; responsible_id?: string | null }
        }) => {
            if (!apiKey) throw new Error('No API Key configurada')
            return api.updateChat(apiKey, chatId, payload)
        },
        onSuccess: () => {
            // Refresh the chat list so closed status is reflected
            queryClient.invalidateQueries({ queryKey: ['timelines_chats'] })
        },
    })
}

/** Fetch workspace members from Timelines AI for the assign dropdown */
export function useWorkspaceMembers() {
    const { data: apiKey } = useApiKey()

    return useQuery({
        queryKey: ['timelines_members', apiKey],
        queryFn: () => api.getWorkspaceMembers(apiKey!),
        enabled: !!apiKey,
        staleTime: 5 * 60 * 1000, // Members don't change often
    })
}

/** Upload a file and send it as a message in a chat */
export function useUploadAndSendFile() {
    const { data: apiKey } = useApiKey()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ chatId, file, caption }: {
            chatId: string
            file: File
            caption?: string
        }) => {
            if (!apiKey) throw new Error('No API Key configurada')
            const fileId = await api.uploadFile(apiKey, file)
            await api.sendFileMessage(apiKey, chatId, fileId, caption)
        },
        onSuccess: (_data, { chatId }) => {
            setTimeout(() => queryClient.invalidateQueries({
                queryKey: ['timelines_messages', apiKey, chatId]
            }), 2000)
        },
    })
}

/** Fetch message templates from Timelines AI */
export function useTemplates() {
    const { data: apiKey } = useApiKey()

    return useQuery({
        queryKey: ['timelines_templates', apiKey],
        queryFn: () => api.getTemplates(apiKey!),
        enabled: !!apiKey,
        staleTime: 5 * 60 * 1000,
    })
}

export { useApiKey }

