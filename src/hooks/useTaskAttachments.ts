import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useStore, TaskAttachment } from '../store/useStore'

// ─── Constants ────────────────────────────────────────────────────
const MAX_FILES_PER_TASK = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
]

export { MAX_FILES_PER_TASK, MAX_FILE_SIZE, ALLOWED_TYPES }

// ─── Query Keys ───────────────────────────────────────────────────
export const attachmentKeys = {
    all: ['task_attachments'] as const,
    byTask: (taskId: string) => [...attachmentKeys.all, taskId] as const,
}

// ─── Helpers ──────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileExtension(name: string): string {
    return name.split('.').pop()?.toLowerCase() || ''
}

export function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
        return `El archivo "${file.name}" excede el límite de ${formatFileSize(MAX_FILE_SIZE)}`
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return `Tipo de archivo no permitido: ${file.type || 'desconocido'}`
    }
    return null
}

// ─── useTaskAttachments: List attachments for a task ──────────────
export function useTaskAttachments(taskId: string | undefined) {
    return useQuery({
        queryKey: attachmentKeys.byTask(taskId || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_task_attachments')
                .select('*')
                .eq('task_id', taskId!)
                .order('created_at', { ascending: false })
            if (error) throw error
            return (data || []) as TaskAttachment[]
        },
        enabled: !!taskId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    })
}

// ─── useUploadTaskAttachment ─────────────────────────────────────
export function useUploadTaskAttachment() {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
            const clinicaId = currentUser?.clinica_id
            if (!clinicaId) throw new Error('No clinica_id found')

            // Validate file
            const validationError = validateFile(file)
            if (validationError) throw new Error(validationError)

            // Generate unique path: {clinica_id}/{task_id}/{timestamp}_{filename}
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const storagePath = `${clinicaId}/${taskId}/${timestamp}_${safeName}`

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('task-attachments')
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: false,
                })
            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('task-attachments')
                .getPublicUrl(storagePath)

            // Insert record into crm_task_attachments
            const { data, error: insertError } = await supabase
                .from('crm_task_attachments')
                .insert([{
                    task_id: taskId,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: file.type,
                    file_size: file.size,
                    uploaded_by: currentUser?.id,
                }])
                .select()
                .single()

            if (insertError) throw insertError
            return data as TaskAttachment
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: attachmentKeys.byTask(variables.taskId),
            })
        },
    })
}

// ─── useDeleteTaskAttachment ─────────────────────────────────────
export function useDeleteTaskAttachment() {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ attachment }: { attachment: TaskAttachment }) => {
            const clinicaId = currentUser?.clinica_id
            if (!clinicaId) throw new Error('No clinica_id found')

            // Extract the storage path from the public URL
            // URL format: .../storage/v1/object/public/task-attachments/{path}
            const urlParts = attachment.file_url.split('/task-attachments/')
            const storagePath = urlParts[1]

            if (storagePath) {
                // Delete from storage (best-effort, don't block if already gone)
                await supabase.storage
                    .from('task-attachments')
                    .remove([storagePath])
            }

            // Delete the DB record
            const { error } = await supabase
                .from('crm_task_attachments')
                .delete()
                .eq('id', attachment.id)

            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: attachmentKeys.byTask(variables.attachment.task_id),
            })
        },
    })
}
