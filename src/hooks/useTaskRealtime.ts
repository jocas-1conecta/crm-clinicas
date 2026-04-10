import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { taskKeys } from './useTasks'
import { toast } from 'sonner'

/**
 * Subscribes to Supabase Realtime on crm_tasks.
 * When an INSERT happens with assigned_to matching the current user,
 * shows a toast notification and invalidates the cache.
 */
export function useTaskRealtime(currentUserId: string | undefined) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!currentUserId) return

        const channel = supabase
            .channel('tasks-global-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'crm_tasks',
                    filter: `assigned_to=eq.${currentUserId}`,
                },
                (payload) => {
                    // Invalidate queries to show new data
                    queryClient.invalidateQueries({ queryKey: taskKeys.all })

                    // Show toast — only if the task was assigned by someone else
                    const newTask = payload.new as { title?: string; assigned_to?: string }
                    if (newTask?.title) {
                        toast.info('📋 Nueva tarea asignada', {
                            description: newTask.title,
                            duration: 5000,
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'crm_tasks',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: taskKeys.all })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'crm_tasks',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: taskKeys.all })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId, queryClient])
}
