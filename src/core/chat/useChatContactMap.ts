import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import type { TimelinesChat } from '../../services/timelinesAIService'

// ── Phone normalisation ──────────────────────────────────────────────────────

/** Normalise a phone to last 10 digits for reliable cross-format matching */
function normPhone(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '')
    return digits.length > 10 ? digits.slice(-10) : digits
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatContactMapping {
    id: string
    chat_id: string
    chat_phone: string | null
    lead_id: string | null
    patient_id: string | null
    clinica_id: string
    auto_matched: boolean
}

interface MappingWithAssignment extends ChatContactMapping {
    lead_assigned_to: string | null
    patient_assigned_to: string | null
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches existing chat-contact mappings and determines which chat_ids
 * the current user is allowed to see.
 *
 * - Admins: returns null (= no filter, show all)
 * - Asesores: returns a Set of chat_ids linked to their assigned leads/patients
 *   PLUS any chat_ids that have NO mapping yet (unmapped = new contacts, visible to all)
 */
export function useChatContactMap(chats: TimelinesChat[]) {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id
    const isAdmin = ['Platform_Owner', 'Super_Admin', 'Admin_Clinica'].includes(currentUser?.role ?? '')

    // 1. Fetch existing mappings with assignment info
    const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
        queryKey: ['chat_contact_map', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('chat_contact_map')
                .select(`
                    id, chat_id, chat_phone, lead_id, patient_id, clinica_id, auto_matched,
                    leads!chat_contact_map_lead_id_fkey ( assigned_to ),
                    patients!chat_contact_map_patient_id_fkey ( assigned_to )
                `)
            if (error) throw error
            return (data ?? []).map((row: any) => ({
                ...row,
                lead_assigned_to: row.leads?.assigned_to ?? null,
                patient_assigned_to: row.patients?.assigned_to ?? null,
            })) as MappingWithAssignment[]
        },
        enabled: !!clinicaId,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    // 2. Auto-map unmapped chats
    const autoMapRunRef = useRef<string>('')
    useEffect(() => {
        if (!clinicaId || chats.length === 0 || mappingsLoading) return

        const mappedChatIds = new Set(mappings.map(m => m.chat_id))
        const unmapped = chats.filter(c => !mappedChatIds.has(c.id) && c.phone)

        if (unmapped.length === 0) return

        // Create a fingerprint to avoid re-running for the same set
        const fingerprint = unmapped.map(c => c.id).sort().join(',')
        if (autoMapRunRef.current === fingerprint) return
        autoMapRunRef.current = fingerprint

        // Auto-map in background
        ;(async () => {
            try {
                // Fetch all lead/patient phones in this clinic (single query each)
                const { data: leads } = await supabase
                    .from('leads')
                    .select('id, phone')
                    .not('phone', 'is', null)

                const { data: patients } = await supabase
                    .from('patients')
                    .select('id, phone')
                    .not('phone', 'is', null)

                // Build lookup: normalised phone → contact
                const phoneToLead = new Map<string, string>()
                for (const l of (leads ?? [])) {
                    if (l.phone) phoneToLead.set(normPhone(l.phone), l.id)
                }

                const phoneToPatient = new Map<string, string>()
                for (const p of (patients ?? [])) {
                    if (p.phone) phoneToPatient.set(normPhone(p.phone), p.id)
                }

                // Build mappings to insert
                const toInsert: Array<{
                    chat_id: string
                    chat_phone: string
                    lead_id: string | null
                    patient_id: string | null
                    clinica_id: string
                    auto_matched: boolean
                }> = []

                for (const chat of unmapped) {
                    const norm = normPhone(chat.phone)
                    if (!norm) continue

                    const leadId = phoneToLead.get(norm) ?? null
                    const patientId = phoneToPatient.get(norm) ?? null

                    toInsert.push({
                        chat_id: chat.id,
                        chat_phone: norm,
                        lead_id: leadId,
                        patient_id: patientId,
                        clinica_id: clinicaId,
                        auto_matched: true,
                    })
                }

                if (toInsert.length > 0) {
                    await supabase
                        .from('chat_contact_map')
                        .upsert(toInsert, { onConflict: 'chat_id,clinica_id' })

                    // Refresh mappings
                    queryClient.invalidateQueries({ queryKey: ['chat_contact_map', clinicaId] })
                }
            } catch (err) {
                console.warn('[chat_contact_map] Auto-map error:', err)
            }
        })()
    }, [chats, mappings, mappingsLoading, clinicaId, queryClient])

    // 3. Compute visible chat IDs for current user
    const visibleChatIds = useMemo(() => {
        // Admins see everything
        if (isAdmin) return null

        if (mappingsLoading) return null // While loading, don't filter

        const userId = currentUser?.id
        if (!userId) return new Set<string>()

        const visible = new Set<string>()
        const mappedChatIds = new Set<string>()

        for (const m of mappings) {
            mappedChatIds.add(m.chat_id)

            // Chat is visible if lead or patient is assigned to current user
            if (m.lead_assigned_to === userId || m.patient_assigned_to === userId) {
                visible.add(m.chat_id)
            }
        }

        // Unmapped chats (new contacts not yet in CRM) are visible to all asesores
        for (const chat of chats) {
            if (!mappedChatIds.has(chat.id)) {
                visible.add(chat.id)
            }
        }

        return visible
    }, [mappings, mappingsLoading, chats, currentUser?.id, isAdmin])

    return {
        visibleChatIds,
        mappings,
        mappingsLoading,
    }
}

/**
 * Manually link a chat to a lead or patient.
 */
export function useLinkChatToContact() {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    return useMutation({
        mutationFn: async ({
            chatId,
            chatPhone,
            leadId,
            patientId,
        }: {
            chatId: string
            chatPhone?: string
            leadId?: string | null
            patientId?: string | null
        }) => {
            if (!clinicaId) throw new Error('No clinica')

            const { error } = await supabase
                .from('chat_contact_map')
                .upsert({
                    chat_id: chatId,
                    chat_phone: chatPhone ? normPhone(chatPhone) : null,
                    lead_id: leadId ?? null,
                    patient_id: patientId ?? null,
                    clinica_id: clinicaId,
                    auto_matched: false,
                }, { onConflict: 'chat_id,clinica_id' })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat_contact_map', clinicaId] })
        },
    })
}
