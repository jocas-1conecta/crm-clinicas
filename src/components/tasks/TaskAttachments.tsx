import React, { useRef, useState, useCallback } from 'react'
import {
    useTaskAttachments,
    useUploadTaskAttachment,
    useDeleteTaskAttachment,
    formatFileSize,
    getFileExtension,
    validateFile,
    MAX_FILES_PER_TASK,
} from '../../hooks/useTaskAttachments'
import { TaskAttachment } from '../../store/useStore'
import { toast } from 'sonner'
import {
    LucidePaperclip, LucideUpload, LucideTrash2, LucideDownload,
    LucideLoader2, LucideFileText, LucideImage, LucideFileSpreadsheet,
    LucideFile, LucideX, LucideAlertCircle,
} from 'lucide-react'

// ─── File Icon Helper ─────────────────────────────────────────────
function FileIcon({ type, className = 'w-4 h-4' }: { type?: string; className?: string }) {
    if (type?.startsWith('image/')) return <LucideImage className={`${className} text-pink-500`} />
    if (type === 'application/pdf') return <LucideFileText className={`${className} text-red-500`} />
    if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv'))
        return <LucideFileSpreadsheet className={`${className} text-emerald-500`} />
    if (type?.includes('word') || type?.includes('document'))
        return <LucideFileText className={`${className} text-blue-500`} />
    return <LucideFile className={`${className} text-gray-400`} />
}

// ─── Attachment Item (in list) ────────────────────────────────────
function AttachmentItem({
    attachment,
    readonly,
    onDelete,
    isDeleting,
}: {
    attachment: TaskAttachment
    readonly: boolean
    onDelete: () => void
    isDeleting: boolean
}) {
    const ext = getFileExtension(attachment.file_name)
    const isImage = attachment.file_type?.startsWith('image/')

    return (
        <div className="group flex items-center space-x-3 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            {/* Icon */}
            <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <FileIcon type={attachment.file_type} className="w-4.5 h-4.5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate" title={attachment.file_name}>
                    {attachment.file_name}
                </p>
                <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">{ext}</span>
                    {attachment.file_size && (
                        <span className="text-[10px] text-gray-400">{formatFileSize(attachment.file_size)}</span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.file_name}
                    className="p-1.5 text-gray-400 hover:text-clinical-600 hover:bg-clinical-50 rounded-md transition-colors"
                    title="Descargar"
                    onClick={e => e.stopPropagation()}
                >
                    <LucideDownload className="w-3.5 h-3.5" />
                </a>
                {!readonly && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Eliminar"
                    >
                        {isDeleting
                            ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
                            : <LucideTrash2 className="w-3.5 h-3.5" />
                        }
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Pending File Item (before upload) ────────────────────────────
function PendingFileItem({
    file,
    onRemove,
}: {
    file: File
    onRemove: () => void
}) {
    return (
        <div className="flex items-center space-x-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center">
                <FileIcon type={file.type} className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
            </div>
            <button
                onClick={onRemove}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
                <LucideX className="w-4 h-4" />
            </button>
        </div>
    )
}

// ─── Main TaskAttachments Component ───────────────────────────────
interface TaskAttachmentsProps {
    taskId: string | undefined
    readonly?: boolean
    /** For new tasks: manage files locally before task is created */
    pendingMode?: boolean
    pendingFiles?: File[]
    onPendingFilesChange?: (files: File[]) => void
}

export const TaskAttachments = ({
    taskId,
    readonly = false,
    pendingMode = false,
    pendingFiles = [],
    onPendingFilesChange,
}: TaskAttachmentsProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Server state (only when taskId exists)
    const { data: attachments = [], isLoading } = useTaskAttachments(taskId)
    const uploadMut = useUploadTaskAttachment()
    const deleteMut = useDeleteTaskAttachment()

    const currentCount = pendingMode ? pendingFiles.length : attachments.length
    const canAddMore = currentCount < MAX_FILES_PER_TASK

    // ─── File Selection ───────────────────────────────────────
    const processFiles = useCallback((files: FileList | File[]) => {
        const fileArray = Array.from(files)
        const remaining = MAX_FILES_PER_TASK - currentCount
        if (remaining <= 0) {
            toast.error(`Máximo ${MAX_FILES_PER_TASK} archivos por tarea`)
            return
        }

        const toAdd = fileArray.slice(0, remaining)
        const errors: string[] = []

        toAdd.forEach(f => {
            const err = validateFile(f)
            if (err) errors.push(err)
        })

        if (errors.length > 0) {
            errors.forEach(e => toast.error(e))
            return
        }

        if (pendingMode && onPendingFilesChange) {
            onPendingFilesChange([...pendingFiles, ...toAdd])
        } else if (taskId) {
            // Upload immediately
            toAdd.forEach(file => {
                uploadMut.mutate({ taskId, file }, {
                    onSuccess: () => toast.success(`"${file.name}" adjuntado`),
                    onError: (err: any) => toast.error(err.message || 'Error al subir archivo'),
                })
            })
        }
    }, [currentCount, pendingMode, pendingFiles, onPendingFilesChange, taskId, uploadMut])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            processFiles(e.target.files)
            e.target.value = '' // Reset input
        }
    }

    // ─── Drag & Drop ──────────────────────────────────────────
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!readonly) setIsDragging(true)
    }
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (!readonly && e.dataTransfer.files?.length) {
            processFiles(e.dataTransfer.files)
        }
    }

    // ─── Delete ───────────────────────────────────────────────
    const handleDelete = (attachment: TaskAttachment) => {
        setDeletingId(attachment.id)
        deleteMut.mutate({ attachment }, {
            onSuccess: () => {
                toast.success('Archivo eliminado')
                setDeletingId(null)
            },
            onError: () => {
                toast.error('Error al eliminar archivo')
                setDeletingId(null)
            },
        })
    }

    const removePendingFile = (index: number) => {
        if (onPendingFilesChange) {
            onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))
        }
    }

    // ─── Render ───────────────────────────────────────────────
    const hasContent = pendingMode ? pendingFiles.length > 0 : attachments.length > 0

    return (
        <div className="space-y-3">
            {/* Label */}
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                <LucidePaperclip className="w-3.5 h-3.5" />
                <span>Archivos Adjuntos</span>
                {hasContent && (
                    <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                        {currentCount}/{MAX_FILES_PER_TASK}
                    </span>
                )}
            </label>

            {/* Drop zone / Upload button */}
            {!readonly && canAddMore && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        relative flex flex-col items-center justify-center py-4 px-4
                        border-2 border-dashed rounded-xl cursor-pointer
                        transition-all duration-200
                        ${isDragging
                            ? 'border-clinical-400 bg-clinical-50 scale-[1.02]'
                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                        }
                    `}
                >
                    <LucideUpload className={`w-5 h-5 mb-1.5 transition-colors ${isDragging ? 'text-clinical-500' : 'text-gray-300'}`} />
                    <p className="text-xs font-medium text-gray-400">
                        {isDragging ? 'Soltar archivos aquí' : 'Arrastra archivos o haz clic'}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                        PDF, imágenes, Office · máx {formatFileSize(10 * 1024 * 1024)}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {uploadMut.isPending && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
                            <LucideLoader2 className="w-5 h-5 text-clinical-500 animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Max reached notice */}
            {!readonly && !canAddMore && (
                <div className="flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <LucideAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Máximo de {MAX_FILES_PER_TASK} archivos alcanzado</span>
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && !pendingMode && (
                <div className="space-y-2">
                    {[1, 2].map(i => (
                        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            )}

            {/* Pending files (create mode) */}
            {pendingMode && pendingFiles.length > 0 && (
                <div className="space-y-2">
                    {pendingFiles.map((file, idx) => (
                        <PendingFileItem
                            key={`${file.name}-${idx}`}
                            file={file}
                            onRemove={() => removePendingFile(idx)}
                        />
                    ))}
                </div>
            )}

            {/* Existing attachments */}
            {!pendingMode && attachments.length > 0 && (
                <div className="space-y-2">
                    {attachments.map(att => (
                        <AttachmentItem
                            key={att.id}
                            attachment={att}
                            readonly={readonly}
                            onDelete={() => handleDelete(att)}
                            isDeleting={deletingId === att.id}
                        />
                    ))}
                </div>
            )}

            {/* Empty state for readonly */}
            {readonly && !isLoading && attachments.length === 0 && !pendingMode && (
                <p className="text-xs text-gray-400 italic">Sin archivos adjuntos</p>
            )}
        </div>
    )
}
