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
        onSuccess: () => {
            // Invalidate the messages query to trigger a refresh
            queryClient.invalidateQueries({ queryKey: ['timelines_messages'] })
        },
    })
}

export { useApiKey }
