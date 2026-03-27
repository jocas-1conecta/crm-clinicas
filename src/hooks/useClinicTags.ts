import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useStore } from '../store/useStore'

export interface ClinicTag {
    id: string
    clinica_id: string
    name: string
    color: string
    created_at: string
}

export interface EntityTag {
    id: string
    tag_id: string
    entity_type: string
    entity_id: string
    clinic_tag?: ClinicTag
}

// ── Fetch all tags for the current clinic ──
export function useClinicTags() {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id

    return useQuery<ClinicTag[]>({
        queryKey: ['clinic_tags', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clinic_tags')
                .select('*')
                .eq('clinica_id', clinicaId!)
                .order('name')
            if (error) throw error
            return data || []
        },
        enabled: !!clinicaId,
    })
}

// ── Fetch tags assigned to a specific entity ──
export function useEntityTags(entityType: string, entityId: string | undefined) {
    return useQuery<EntityTag[]>({
        queryKey: ['entity_tags', entityType, entityId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('entity_tags')
                .select('*, clinic_tag:tag_id(id, name, color, clinica_id)')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId!)
            if (error) throw error
            return (data || []).map((et: any) => ({
                ...et,
                clinic_tag: Array.isArray(et.clinic_tag) ? et.clinic_tag[0] : et.clinic_tag || undefined,
            }))
        },
        enabled: !!entityId,
    })
}

// ── Fetch all entity_tags for a given type (bulk, for list filtering) ──
export function useAllEntityTags(entityType: string) {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id

    return useQuery<EntityTag[]>({
        queryKey: ['all_entity_tags', entityType, clinicaId],
        queryFn: async () => {
            // First get all tags for this clinic
            const { data: tags, error: tagErr } = await supabase
                .from('clinic_tags')
                .select('id')
                .eq('clinica_id', clinicaId!)
            if (tagErr) throw tagErr
            const tagIds = (tags || []).map((t: any) => t.id)
            if (tagIds.length === 0) return []

            const { data, error } = await supabase
                .from('entity_tags')
                .select('*, clinic_tag:tag_id(id, name, color, clinica_id)')
                .eq('entity_type', entityType)
                .in('tag_id', tagIds)
            if (error) throw error
            return (data || []).map((et: any) => ({
                ...et,
                clinic_tag: Array.isArray(et.clinic_tag) ? et.clinic_tag[0] : et.clinic_tag || undefined,
            }))
        },
        enabled: !!clinicaId,
    })
}

// ── Add a tag to an entity ──
export function useAddEntityTag() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ tagId, entityType, entityId }: { tagId: string; entityType: string; entityId: string }) => {
            const { error } = await supabase.from('entity_tags').insert({
                tag_id: tagId,
                entity_type: entityType,
                entity_id: entityId,
            })
            if (error) throw error
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['entity_tags', vars.entityType, vars.entityId] })
            queryClient.invalidateQueries({ queryKey: ['all_entity_tags', vars.entityType] })
        },
    })
}

// ── Remove a tag from an entity ──
export function useRemoveEntityTag() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
            const { error } = await supabase.from('entity_tags').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['entity_tags', vars.entityType, vars.entityId] })
            queryClient.invalidateQueries({ queryKey: ['all_entity_tags', vars.entityType] })
        },
    })
}

// ── CRUD for clinic tag definitions ──
export function useCreateClinicTag() {
    const queryClient = useQueryClient()
    const { currentUser } = useStore()

    return useMutation({
        mutationFn: async ({ name, color }: { name: string; color: string }) => {
            const { error } = await supabase.from('clinic_tags').insert({
                clinica_id: currentUser!.clinica_id,
                name,
                color,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic_tags'] })
        },
    })
}

export function useUpdateClinicTag() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
            const { error } = await supabase.from('clinic_tags').update({ name, color }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic_tags'] })
            queryClient.invalidateQueries({ queryKey: ['entity_tags'] })
            queryClient.invalidateQueries({ queryKey: ['all_entity_tags'] })
        },
    })
}

export function useDeleteClinicTag() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('clinic_tags').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic_tags'] })
            queryClient.invalidateQueries({ queryKey: ['entity_tags'] })
            queryClient.invalidateQueries({ queryKey: ['all_entity_tags'] })
        },
    })
}
