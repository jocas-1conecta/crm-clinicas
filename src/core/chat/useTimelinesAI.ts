import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import * as api from '../../services/timelinesAIService'

/** Fetch the clinic's stored Timelines AI API key */
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
        staleTime: 5 * 60 * 1000, // 5 min
    })
}

/** Fetch all chats from Timelines AI */
export function useChats() {
    const { data: apiKey } = useApiKey()

    return useQuery({
        queryKey: ['timelines_chats', apiKey],
        queryFn: () => api.getChats(apiKey!),
        enabled: !!apiKey,
        refetchInterval: 60_000, // Poll every 60s
        retry: 1,
    })
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
            // Ensure the individual query is not left in a cancelled/paused state
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

export { useApiKey }

