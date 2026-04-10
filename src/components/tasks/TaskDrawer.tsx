import React, { useState, useEffect } from 'react'
import { CrmTask, TaskCategory, TaskPriority } from '../../store/useStore'
import { useStore } from '../../store/useStore'
import { useCreateTask, useUpdateTask, useDeleteTask, useTeamMembers } from '../../hooks/useTasks'
import { TASK_TYPES, PRIORITIES } from './TaskCard'
import {
    LucideX, LucideTrash2, LucideLoader2, LucideUser,
    LucideLink, LucideCalendar, LucideStickyNote,
} from 'lucide-react'
import { toast } from 'sonner'

interface TaskDrawerProps {
    open: boolean
    task: CrmTask | null // null = create mode, CrmTask = edit mode
    onClose: () => void
    // Optional: pre-fill for entity-linked tasks
    prefill?: {
        leadId?: string
        patientId?: string
    }
}

export const TaskDrawer = ({ open, task, onClose, prefill }: TaskDrawerProps) => {
    const { currentUser } = useStore()
    const createMut = useCreateTask()
    const updateMut = useUpdateTask()
    const deleteMut = useDeleteTask()
    const { data: teamMembers = [] } = useTeamMembers()

    const isAdmin = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica'
    const isEditing = !!task

    // ─── Form State ───────────────────────────────────────────
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [taskType, setTaskType] = useState<TaskCategory>('otro')
    const [priority, setPriority] = useState<TaskPriority>('normal')
    const [dueDate, setDueDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [notes, setNotes] = useState('')
    const [assignTo, setAssignTo] = useState(currentUser?.id || '')

    // Populate form when editing
    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setDescription(task.description || '')
            setTaskType(task.task_type || 'otro')
            setPriority(task.priority || 'normal')
            setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
            setStartTime(task.start_time || '')
            setEndTime(task.end_time || '')
            setNotes(task.notes || task.extra_fields?.notes || '')
            setAssignTo(task.assigned_to || currentUser?.id || '')
        } else {
            resetForm()
        }
    }, [task, currentUser?.id])

    const resetForm = () => {
        setTitle('')
        setDescription('')
        setTaskType('otro')
        setPriority('normal')
        setDueDate('')
        setStartTime('')
        setEndTime('')
        setNotes('')
        setAssignTo(currentUser?.id || '')
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const isoDate = dueDate ? `${dueDate}T12:00:00.000Z` : new Date().toISOString()

        const payload: Partial<CrmTask> = {
            title: title.trim(),
            description: description.trim() || undefined,
            task_type: taskType,
            priority,
            due_date: isoDate,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            notes: notes.trim() || undefined,
        }

        if (isEditing) {
            updateMut.mutate({ id: task.id, ...payload }, {
                onSuccess: () => {
                    toast.success('Tarea actualizada')
                    onClose()
                },
                onError: () => toast.error('Error al actualizar la tarea'),
            })
        } else {
            const createPayload = {
                ...payload,
                assigned_to: isAdmin ? (assignTo || currentUser?.id) : currentUser?.id,
                sucursal_id: currentUser?.sucursal_id,
                ...(prefill?.leadId ? { lead_id: prefill.leadId } : {}),
                ...(prefill?.patientId ? { patient_id: prefill.patientId } : {}),
            }
            createMut.mutate(createPayload, {
                onSuccess: () => {
                    toast.success('Tarea creada')
                    onClose()
                },
                onError: () => toast.error('Error al crear la tarea'),
            })
        }
    }

    const handleDelete = () => {
        if (!task) return
        if (!confirm('¿Eliminar esta tarea permanentemente?')) return
        deleteMut.mutate(task.id, {
            onSuccess: () => {
                toast.success('Tarea eliminada')
                onClose()
            },
            onError: () => toast.error('Error al eliminar'),
        })
    }

    const hasTime = taskType === 'reunion' || taskType === 'llamada'
    const isSaving = createMut.isPending || updateMut.isPending

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

            {/* Drawer */}
            <div className="relative bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
                        </h3>
                        {isEditing && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                Creada {task.created_at ? new Date(task.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <LucideX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Task Type Selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Tipo de Actividad
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TASK_TYPES.map(tt => (
                                <button
                                    key={tt.value} type="button"
                                    onClick={() => setTaskType(tt.value)}
                                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                        taskType === tt.value
                                            ? `${tt.bgColor} ${tt.color} border-current shadow-sm scale-105`
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <tt.icon className="w-3.5 h-3.5" />
                                    <span>{tt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Título *
                        </label>
                        <input
                            type="text" required value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="¿Qué necesitas hacer?"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm font-medium placeholder:text-gray-400"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Instrucciones, guión de llamada, contexto..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none placeholder:text-gray-400"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <LucideCalendar className="w-3.5 h-3.5" />
                            <span>Fecha y Hora</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Fecha *</label>
                                <input
                                    type="date" required value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Prioridad</label>
                                <select
                                    value={priority}
                                    onChange={e => setPriority(e.target.value as TaskPriority)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer"
                                >
                                    {PRIORITIES.map(p => (
                                        <option key={p.value} value={p.value}>
                                            {p.value === 'alta' ? '🔴 ' : p.value === 'baja' ? '🔵 ' : '⚪ '}
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {hasTime && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Hora Inicio</label>
                                    <input
                                        type="time" value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Hora Fin</label>
                                    <input
                                        type="time" value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assign To — HIDDEN for Asesor_Sucursal */}
                    {isAdmin && (
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                                <LucideUser className="w-3.5 h-3.5" />
                                <span>Asignar a</span>
                            </label>
                            <select
                                value={assignTo}
                                onChange={e => setAssignTo(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer"
                            >
                                <option value="">Seleccionar...</option>
                                {teamMembers.map((m: { id: string; name: string }) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                            <LucideStickyNote className="w-3.5 h-3.5" />
                            <span>Notas Internas</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Notas privadas, observaciones..."
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none placeholder:text-gray-400"
                        />
                    </div>

                    {/* Linked Entity (readonly) */}
                    {isEditing && (task.lead_id || task.patient_id || prefill?.leadId || prefill?.patientId) && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                                <LucideLink className="w-3.5 h-3.5" />
                                <span>Vinculado a</span>
                            </label>
                            {(task.lead_id || prefill?.leadId) && (
                                <p className="text-sm text-gray-700 font-medium">🎯 Lead: <span className="font-mono text-xs text-gray-400">{(task.lead_id || prefill?.leadId)?.slice(0, 8)}...</span></p>
                            )}
                            {(task.patient_id || prefill?.patientId) && (
                                <p className="text-sm text-gray-700 font-medium">🏥 Paciente: <span className="font-mono text-xs text-gray-400">{(task.patient_id || prefill?.patientId)?.slice(0, 8)}...</span></p>
                            )}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 shrink-0 space-y-3">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteMut.isPending}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            <LucideTrash2 className="w-4 h-4" />
                            <span>Eliminar Tarea</span>
                        </button>
                    )}
                    <button
                        type="submit"
                        onClick={handleSave}
                        disabled={isSaving || !title.trim()}
                        className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-clinical-600 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-clinical-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : null}
                        <span>{isSaving ? 'Guardando...' : isEditing ? 'Actualizar Tarea' : 'Crear Tarea'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
