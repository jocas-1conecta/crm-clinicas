import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore, CrmTask, TaskCategory, TaskPriority } from '../../store/useStore'
import {
    LucidePlus, LucideX, LucideCheckCircle2, LucideCircle,
    LucidePhone, LucideMessageSquare, LucideUsers, LucideFileText	,
    LucidePin, LucideAlertTriangle, LucideChevronDown, LucideChevronUp,
    LucideClock, LucideCalendar
} from 'lucide-react'

// ─── Task Type Config ────────────────────────────────────────────
const TASK_TYPES: { value: TaskCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { value: 'llamada', label: 'Llamada', icon: LucidePhone, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { value: 'mensaje', label: 'Mensaje', icon: LucideMessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { value: 'reunion', label: 'Reunión', icon: LucideUsers, color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { value: 'cotizacion', label: 'Cotización', icon: LucideFileText, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { value: 'otro', label: 'Otro', icon: LucidePin, color: 'text-gray-600', bgColor: 'bg-gray-100' },
]

const PRIORITIES: { value: TaskPriority; label: string; color: string; dot: string }[] = [
    { value: 'alta', label: 'Alta', color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' },
    { value: 'normal', label: 'Normal', color: 'text-gray-600 bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
    { value: 'baja', label: 'Baja', color: 'text-blue-500 bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
]

const getTaskTypeConfig = (type: TaskCategory) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[4]
const getPriorityConfig = (p: TaskPriority) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1]
const isOverdue = (task: CrmTask) => !task.is_completed && new Date(task.due_date) < new Date()

// ─── Main Component ──────────────────────────────────────────────
interface EntityTasksProps {
    entityType: 'lead' | 'patient'
    entityId: string
    entityPhone?: string  // Pre-fill for llamada type
}

export const EntityTasks = ({ entityType, entityId, entityPhone }: EntityTasksProps) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)
    const [editingTask, setEditingTask] = useState<CrmTask | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [taskType, setTaskType] = useState<TaskCategory>('otro')
    const [priority, setPriority] = useState<TaskPriority>('normal')
    const [dueDate, setDueDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const entityColumn = entityType === 'lead' ? 'lead_id' : 'patient_id'

    // ─── Queries ──────────────────────────────────────────────
    const { data: tasks = [] } = useQuery({
        queryKey: ['entity_tasks', entityType, entityId],
        queryFn: async () => {
            const { data, error } = await supabase.from('crm_tasks')
                .select('*')
                .eq(entityColumn, entityId)
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data as CrmTask[];
        }
    })

    const pendingTasks = tasks.filter(t => !t.is_completed)
    const completedTasks = tasks.filter(t => t.is_completed)

    // ─── Mutations ────────────────────────────────────────────
    const toggleMut = useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const { error } = await supabase.from('crm_tasks').update({
                is_completed: completed,
                completed_at: completed ? new Date().toISOString() : null
            }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entity_tasks', entityType, entityId] })
    })

    const saveMut = useMutation({
        mutationFn: async (task: any) => {
            if (editingTask) {
                const { error } = await supabase.from('crm_tasks').update(task).eq('id', editingTask.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('crm_tasks').insert([task])
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entity_tasks', entityType, entityId] })
            resetForm()
        }
    })

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_tasks').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entity_tasks', entityType, entityId] })
    })

    // ─── Form Helpers ─────────────────────────────────────────
    const resetForm = () => {
        setTitle(''); setDescription(''); setTaskType('otro'); setPriority('normal')
        setDueDate(''); setStartTime(''); setEndTime('')
        setShowForm(false); setEditingTask(null)
    }

    const openEdit = (task: CrmTask) => {
        setEditingTask(task)
        setTitle(task.title)
        setDescription(task.description || '')
        setTaskType(task.task_type || 'otro')
        setPriority(task.priority || 'normal')
        setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
        setStartTime(task.start_time || '')
        setEndTime(task.end_time || '')
        setShowForm(true)
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const isoDate = dueDate ? `${dueDate}T12:00:00.000Z` : new Date().toISOString()

        const payload: any = {
            title: title.trim(),
            description: description.trim() || null,
            task_type: taskType,
            priority,
            due_date: isoDate,
            start_time: startTime || null,
            end_time: endTime || null,
            extra_fields: {},
        }

        if (!editingTask) {
            payload[entityColumn] = entityId
            payload.assigned_to = currentUser?.id
            payload.sucursal_id = currentUser?.sucursal_id
        }

        saveMut.mutate(payload)
    }

    const hasTime = taskType === 'reunion' || taskType === 'llamada'

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">
                    Tareas
                    {pendingTasks.length > 0 && (
                        <span className="ml-2 text-xs font-bold bg-clinical-50 text-clinical-600 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                    )}
                </h3>
                <button
                    onClick={() => { resetForm(); setShowForm(!showForm) }}
                    className="text-clinical-600 text-sm font-bold flex items-center space-x-1 hover:bg-clinical-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    {showForm ? <LucideX className="w-4 h-4" /> : <LucidePlus className="w-4 h-4" />}
                    <span>{showForm ? 'Cancelar' : 'Nueva Tarea'}</span>
                </button>
            </div>

            {/* Inline Form */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Task Type Selector */}
                    <div className="flex flex-wrap gap-2">
                        {TASK_TYPES.map(tt => (
                            <button
                                key={tt.value} type="button"
                                onClick={() => setTaskType(tt.value)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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

                    {/* Title */}
                    <input
                        type="text" required value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Título de la tarea..."
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm font-medium"
                    />

                    {/* Description */}
                    <textarea
                        value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Descripción o guión de seguimiento (opcional)"
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none"
                    />

                    {/* Date, Time, Priority Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha</label>
                            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                        </div>
                        {hasTime && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hora Inicio</label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hora Fin</label>
                                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Prioridad</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer">
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={resetForm}
                            className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={saveMut.isPending}
                            className="px-5 py-2 bg-clinical-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-clinical-700 transition-colors disabled:opacity-50">
                            {editingTask ? 'Actualizar' : 'Crear Tarea'}
                        </button>
                    </div>
                </form>
            )}

            {/* Pending Tasks */}
            <div className="space-y-2">
                {pendingTasks.length === 0 && !showForm ? (
                    <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <LucideCalendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400 font-medium">No hay tareas pendientes.</p>
                    </div>
                ) : (
                    pendingTasks.map(task => (
                        <TaskCard
                            key={task.id} task={task}
                            onToggle={() => toggleMut.mutate({ id: task.id, completed: true })}
                            onEdit={() => openEdit(task)}
                            onDelete={() => { if (confirm('¿Eliminar esta tarea?')) deleteMut.mutate(task.id) }}
                        />
                    ))
                )}
            </div>

            {/* Completed Tasks Toggle */}
            {completedTasks.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors w-full"
                    >
                        {showCompleted ? <LucideChevronUp className="w-4 h-4" /> : <LucideChevronDown className="w-4 h-4" />}
                        <span>Completadas ({completedTasks.length})</span>
                    </button>
                    {showCompleted && (
                        <div className="space-y-2 mt-3">
                            {completedTasks.map(task => (
                                <TaskCard
                                    key={task.id} task={task}
                                    onToggle={() => toggleMut.mutate({ id: task.id, completed: false })}
                                    onEdit={() => openEdit(task)}
                                    onDelete={() => { if (confirm('¿Eliminar?')) deleteMut.mutate(task.id) }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── TaskCard Sub-component ──────────────────────────────────────
const TaskCard = ({ task, onToggle, onEdit, onDelete }: {
    task: CrmTask; onToggle: () => void; onEdit: () => void; onDelete: () => void
}) => {
    const [expanded, setExpanded] = useState(false)
    const typeConfig = getTaskTypeConfig(task.task_type)
    const prioConfig = getPriorityConfig(task.priority)
    const overdue = isOverdue(task)

    const dueDateStr = task.due_date ? new Date(task.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''
    const daysUntil = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000) : null

    const dateLabel = daysUntil === null ? '' :
        daysUntil < 0 ? `Venció hace ${Math.abs(daysUntil)}d` :
        daysUntil === 0 ? 'Hoy' :
        daysUntil === 1 ? 'Mañana' :
        `En ${daysUntil}d`

    return (
        <div
            className={`group rounded-xl border transition-all ${
                task.is_completed
                    ? 'bg-gray-50/50 border-gray-100 opacity-70'
                    : overdue
                        ? 'bg-white border-red-200 shadow-sm shadow-red-100'
                        : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            }`}
        >
            <div className="flex items-start p-4 space-x-3">
                {/* Toggle Circle */}
                <button onClick={onToggle} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                    {task.is_completed ? (
                        <LucideCheckCircle2 className="w-5 h-5 text-clinical-500" />
                    ) : (
                        <LucideCircle className={`w-5 h-5 ${overdue ? 'text-red-400' : 'text-gray-300 group-hover:text-clinical-400'}`} />
                    )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center space-x-2 flex-wrap">
                        <span className={`font-medium text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                        </span>
                        {overdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md flex items-center space-x-0.5">
                                <LucideAlertTriangle className="w-3 h-3" />
                                <span>VENCIDA</span>
                            </span>
                        )}
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                        {/* Type badge */}
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.bgColor} ${typeConfig.color}`}>
                            <typeConfig.icon className="w-3 h-3" />
                            <span>{typeConfig.label}</span>
                        </span>

                        {/* Priority badge (only show if not normal) */}
                        {task.priority !== 'normal' && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${prioConfig.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prioConfig.dot}`}></span>
                                <span>{prioConfig.label}</span>
                            </span>
                        )}

                        {/* Date */}
                        {dueDateStr && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-medium ${
                                overdue ? 'text-red-500' : daysUntil === 0 ? 'text-amber-600' : 'text-gray-400'
                            }`}>
                                <LucideClock className="w-3 h-3" />
                                <span>{dueDateStr}</span>
                                {!task.is_completed && dateLabel && (
                                    <span className="font-bold">· {dateLabel}</span>
                                )}
                            </span>
                        )}

                        {/* Time */}
                        {task.start_time && (
                            <span className="text-[10px] text-gray-400 font-medium">
                                {task.start_time}{task.end_time ? ` - ${task.end_time}` : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0 animate-in fade-in slide-in-from-top-1 duration-150">
                    {task.description && (
                        <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-3 mt-3">
                        <button onClick={onEdit}
                            className="text-xs font-bold text-clinical-600 bg-clinical-50 px-3 py-1.5 rounded-lg hover:bg-clinical-100 transition-colors">
                            ✏️ Editar
                        </button>
                        <button onClick={onDelete}
                            className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                            🗑 Eliminar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
