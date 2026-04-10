import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useStore, CrmTask } from '../store/useStore'

// ─── Query Key Factory ────────────────────────────────────────
export const taskKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
    entity: (type: string, id: string) => [...taskKeys.all, 'entity', type, id] as const,
    team: (clinicaId: string) => ['team_for_tasks', clinicaId] as const,
}

// ─── Types ────────────────────────────────────────────────────
export type StatusFilter = 'todas' | 'pendientes' | 'alta' | 'completadas'
export type DateFilter = 'todas' | 'hoy' | 'manana' | 'semana' | 'proximas'

export interface TaskFilters {
    statusFilter: StatusFilter
    dateFilter: DateFilter
    page: number
}

const PAGE_SIZE = 25

// ─── useTasks: Paginated global tasks query ───────────────────
export function useTasks(filters: TaskFilters) {
    const { currentUser } = useStore()

    return useQuery({
        queryKey: taskKeys.list({
            userId: currentUser?.id,
            role: currentUser?.role,
            ...filters,
        }),
        queryFn: async () => {
            let query = supabase.from('crm_tasks').select('*', { count: 'exact' })

            // Role scoping (defense in depth — RLS also enforces this)
            if (currentUser?.role === 'Admin_Clinica') {
                query = query.eq('sucursal_id', currentUser.sucursal_id)
            } else if (currentUser?.role !== 'Super_Admin') {
                query = query.eq('assigned_to', currentUser?.id)
            }

            // Status filters
            if (filters.statusFilter === 'pendientes') {
                query = query.eq('is_completed', false)
            } else if (filters.statusFilter === 'alta') {
                query = query.eq('is_completed', false).eq('priority', 'alta')
            } else if (filters.statusFilter === 'completadas') {
                query = query.eq('is_completed', true)
            }

            // Date filters
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
            const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
            const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString()
            const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

            if (filters.dateFilter === 'hoy') {
                query = query.gte('due_date', todayStart).lte('due_date', todayEnd)
            } else if (filters.dateFilter === 'manana') {
                query = query.gte('due_date', tomorrowStart).lte('due_date', tomorrowEnd)
            } else if (filters.dateFilter === 'semana') {
                query = query.gte('due_date', todayStart).lte('due_date', weekEnd)
            } else if (filters.dateFilter === 'proximas') {
                query = query.gt('due_date', weekEnd)
            }

            // Pagination
            const from = (filters.page - 1) * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const { data, error, count } = await query
                .order('due_date', { ascending: true })
                .range(from, to)

            if (error) throw error
            return { tasks: (data || []) as CrmTask[], total: count || 0, pageSize: PAGE_SIZE }
        },
        enabled: !!currentUser,
        staleTime: 1000 * 60, // 1 minute
    })
}

// ─── useToggleTask: Optimistic update for completing ──────────
export function useToggleTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const { error } = await supabase.from('crm_tasks').update({
                is_completed: completed,
                completed_at: completed ? new Date().toISOString() : null,
            }).eq('id', id)
            if (error) throw error
        },
        onMutate: async ({ id, completed }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

            // Snapshot all list queries
            const queries = queryClient.getQueriesData<{ tasks: CrmTask[]; total: number }>({
                queryKey: taskKeys.lists(),
            })

            // Optimistically update each matching query
            queries.forEach(([key, data]) => {
                if (!data) return
                queryClient.setQueryData(key, {
                    ...data,
                    tasks: data.tasks.map(t =>
                        t.id === id
                            ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null }
                            : t
                    ),
                })
            })

            return { queries }
        },
        onError: (_err, _vars, context) => {
            // Rollback on error
            context?.queries.forEach(([key, data]) => {
                if (data) queryClient.setQueryData(key, data)
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
        },
    })
}

// ─── useCreateTask ────────────────────────────────────────────
export function useCreateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (task: Partial<CrmTask>) => {
            const { data, error } = await supabase.from('crm_tasks').insert([task]).select().single()
            if (error) throw error
            return data as CrmTask
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useUpdateTask ────────────────────────────────────────────
export function useUpdateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<CrmTask> & { id: string }) => {
            const { error } = await supabase.from('crm_tasks').update(updates).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useDeleteTask ────────────────────────────────────────────
export function useDeleteTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_tasks').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useBulkCompleteTasks ─────────────────────────────────────
export function useBulkCompleteTasks() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('crm_tasks').update({
                is_completed: true,
                completed_at: new Date().toISOString(),
            }).in('id', ids)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useBulkDeleteTasks ───────────────────────────────────────
export function useBulkDeleteTasks() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('crm_tasks').delete().in('id', ids)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useBulkReschedule ───────────────────────────────────────
export function useBulkReschedule() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ ids, newDate }: { ids: string[]; newDate: string }) => {
            const { error } = await supabase.from('crm_tasks').update({
                due_date: `${newDate}T12:00:00.000Z`,
            }).in('id', ids)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
        },
    })
}

// ─── useTeamMembers: for assignment dropdown ──────────────────
export function useTeamMembers() {
    const { currentUser } = useStore()
    const isAdmin = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica'

    return useQuery({
        queryKey: taskKeys.team(currentUser?.clinica_id || ''),
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('clinica_id', currentUser!.clinica_id)
            return data || []
        },
        enabled: !!currentUser?.clinica_id && isAdmin,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
