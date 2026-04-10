import React, { useState, useEffect } from 'react'
import { CrmTask, TaskCategory, TaskPriority } from '../../store/useStore'
import { useStore } from '../../store/useStore'
import { useUpdateTask, useDeleteTask, useTeamMembers } from '../../hooks/useTasks'
import { toast } from 'sonner'
import {
    LucideCheckCircle2, LucideCircle, LucideAlertTriangle, LucideClock,
    LucidePhone, LucideMessageSquare, LucideUsers, LucideFileText, LucidePin,
    LucidePencil, LucideX, LucideTrash2, LucideLoader2,
    LucideUser, LucideCalendar, LucideStickyNote, LucideChevronDown,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────
const TASK_TYPES: { value: TaskCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { value: 'llamada', label: 'Llamada', icon: LucidePhone, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { value: 'mensaje', label: 'Mensaje', icon: LucideMessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { value: 'reunion', label: 'Reunión', icon: LucideUsers, color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { value: 'cotizacion', label: 'Cotización', icon: LucideFileText, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { value: 'otro', label: 'Otro', icon: LucidePin, color: 'text-gray-600', bgColor: 'bg-gray-100' },
]

const PRIORITIES: { value: TaskPriority; label: string; dot: string }[] = [
    { value: 'alta', label: 'Alta', dot: 'bg-red-500' },
    { value: 'normal', label: 'Normal', dot: 'bg-gray-400' },
    { value: 'baja', label: 'Baja', dot: 'bg-blue-400' },
]

export const getTypeConfig = (type: TaskCategory) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[4]
const getPriorityConfig = (p: TaskPriority) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1]

export const isOverdue = (task: CrmTask) => !task.is_completed && new Date(task.due_date) < new Date(new Date().toDateString())
export const isToday = (task: CrmTask) => {
    const today = new Date()
    const due = new Date(task.due_date)
    return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate()
}

// Re-export for consumer convenience
export { TASK_TYPES, PRIORITIES }

// ─── Props ────────────────────────────────────────────────────
interface TaskCardProps {
    task: CrmTask
    isSelected: boolean
    selectionMode: boolean
    onToggleComplete: () => void
    onSelect: () => void
}

// ─── Read-Only Detail Row ─────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | undefined }) => {
    if (!value) return null
    return (
        <div className="flex items-start space-x-3 py-2">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{value}</p>
            </div>
        </div>
    )
}

export const TaskCard = ({ task, isSelected, selectionMode, onToggleComplete, onSelect }: TaskCardProps) => {
    const { currentUser } = useStore()
    const updateMut = useUpdateTask()
    const deleteMut = useDeleteTask()
    const { data: teamMembers = [] } = useTeamMembers()
    const isAdmin = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica'

    const typeConfig = getTypeConfig(task.task_type)
    const prioConfig = getPriorityConfig(task.priority)
    const overdue = isOverdue(task)
    const today = !task.is_completed && isToday(task)

    // ─── Expand & Edit State ──────────────────────────────────
    const [isExpanded, setIsExpanded] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    // ─── Edit Form State ──────────────────────────────────────
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDesc, setEditDesc] = useState(task.description || '')
    const [editType, setEditType] = useState<TaskCategory>(task.task_type || 'otro')
    const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority || 'normal')
    const [editDueDate, setEditDueDate] = useState(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
    const [editStartTime, setEditStartTime] = useState(task.start_time || '')
    const [editEndTime, setEditEndTime] = useState(task.end_time || '')
    const [editNotes, setEditNotes] = useState(task.notes || task.extra_fields?.notes || '')
    const [editAssignTo, setEditAssignTo] = useState(task.assigned_to || '')

    // Reset form when task data changes (e.g. after optimistic update)
    useEffect(() => {
        setEditTitle(task.title)
        setEditDesc(task.description || '')
        setEditType(task.task_type || 'otro')
        setEditPriority(task.priority || 'normal')
        setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
        setEditStartTime(task.start_time || '')
        setEditEndTime(task.end_time || '')
        setEditNotes(task.notes || task.extra_fields?.notes || '')
        setEditAssignTo(task.assigned_to || '')
    }, [task])

    const dueDateStr = task.due_date
        ? new Date(task.due_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : ''

    const daysUntil = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000) : null
    const dateLabel = daysUntil === null ? ''
        : daysUntil < 0 ? `Hace ${Math.abs(daysUntil)}d`
        : daysUntil === 0 ? 'Hoy'
        : daysUntil === 1 ? 'Mañana'
        : `En ${daysUntil}d`

    const dueDateShort = task.due_date
        ? new Date(task.due_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        : ''

    // Dynamic styles based on state
    const cardBg = task.is_completed
        ? 'bg-gray-50/50 border-gray-100 opacity-60'
        : overdue
            ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100/50'
            : today
                ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'

    const selectedRing = isSelected ? 'ring-2 ring-clinical-500 ring-offset-1' : ''

    // ─── Handlers ─────────────────────────────────────────────
    const handleCardClick = () => {
        if (selectionMode) return // Don't expand in selection mode
        setIsExpanded(prev => !prev)
        if (isExpanded) setIsEditing(false) // Collapse resets edit mode
    }

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditing(true)
    }

    const cancelEditing = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditing(false)
        // Reset form to original values
        setEditTitle(task.title)
        setEditDesc(task.description || '')
        setEditType(task.task_type || 'otro')
        setEditPriority(task.priority || 'normal')
        setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
        setEditStartTime(task.start_time || '')
        setEditEndTime(task.end_time || '')
        setEditNotes(task.notes || task.extra_fields?.notes || '')
        setEditAssignTo(task.assigned_to || '')
    }

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!editTitle.trim()) return
        updateMut.mutate({
            id: task.id,
            title: editTitle.trim(),
            description: editDesc.trim() || undefined,
            task_type: editType,
            priority: editPriority,
            due_date: editDueDate ? `${editDueDate}T12:00:00.000Z` : task.due_date,
            start_time: editStartTime || undefined,
            end_time: editEndTime || undefined,
            notes: editNotes.trim() || undefined,
            ...(isAdmin && editAssignTo ? { assigned_to: editAssignTo } : {}),
        }, {
            onSuccess: () => {
                toast.success('Tarea actualizada')
                setIsEditing(false)
            },
            onError: () => toast.error('Error al actualizar'),
        })
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Eliminar esta tarea permanentemente?')) return
        deleteMut.mutate(task.id, {
            onSuccess: () => toast.success('Tarea eliminada'),
            onError: () => toast.error('Error al eliminar'),
        })
    }

    const hasTime = editType === 'reunion' || editType === 'llamada'
    const assignedName = teamMembers.find((m: { id: string; name: string }) => m.id === task.assigned_to)?.name || task.assigned_to_name

    return (
        <div className={`group rounded-xl border transition-all duration-300 ${cardBg} ${selectedRing}`}>
            {/* ─── Collapsed Header (always visible) ───────────── */}
            <div
                className="flex items-start p-4 space-x-3 cursor-pointer"
                onClick={handleCardClick}
            >
                {/* Selection Checkbox */}
                {selectionMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect() }}
                        className="mt-0.5 shrink-0"
                    >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-clinical-600 border-clinical-600' : 'border-gray-300 hover:border-clinical-400'
                        }`}>
                            {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </button>
                )}

                {/* Toggle Circle */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete() }}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-125 active:scale-95"
                    title={task.is_completed ? 'Marcar como pendiente' : 'Completar tarea'}
                >
                    {task.is_completed ? (
                        <LucideCheckCircle2 className="w-5 h-5 text-clinical-500 transition-colors" />
                    ) : (
                        <LucideCircle className={`w-5 h-5 transition-colors ${
                            overdue ? 'text-red-400 hover:text-red-500' : 'text-gray-300 group-hover:text-clinical-400'
                        }`} />
                    )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`font-medium text-sm leading-tight ${
                            task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}>
                            {task.title}
                        </span>
                        {overdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md flex items-center space-x-0.5 animate-pulse">
                                <LucideAlertTriangle className="w-3 h-3" />
                                <span>VENCIDA</span>
                            </span>
                        )}
                        {today && !task.is_completed && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">
                                HOY
                            </span>
                        )}
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.bgColor} ${typeConfig.color}`}>
                            <typeConfig.icon className="w-3 h-3" />
                            <span>{typeConfig.label}</span>
                        </span>
                        {task.priority !== 'normal' && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                task.priority === 'alta' ? 'text-red-600 bg-red-50 border-red-200' : 'text-blue-500 bg-blue-50 border-blue-200'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prioConfig.dot}`}></span>
                                <span>{prioConfig.label}</span>
                            </span>
                        )}
                        {dueDateShort && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-medium ${
                                overdue ? 'text-red-500' : today ? 'text-amber-600' : 'text-gray-400'
                            }`}>
                                <LucideClock className="w-3 h-3" />
                                <span>{dueDateShort}</span>
                                {!task.is_completed && dateLabel && (
                                    <span className="font-bold">· {dateLabel}</span>
                                )}
                            </span>
                        )}
                        {task.start_time && (
                            <span className="text-[10px] text-gray-400 font-medium">
                                {task.start_time}{task.end_time ? ` - ${task.end_time}` : ''}
                            </span>
                        )}
                    </div>

                    {/* Description preview (only when collapsed) */}
                    {!isExpanded && task.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{task.description}</p>
                    )}
                </div>

                {/* Expand indicator */}
                <LucideChevronDown className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* ─── Expanded Area ───────────────────────────────── */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-4 pb-4 pt-0 ml-12 border-t border-gray-100/60">
                    {!isEditing ? (
                        /* ─── READ-ONLY MODE ─────────────────────── */
                        <div className="pt-3 space-y-1">
                            {/* Description */}
                            <DetailRow
                                icon={LucideFileText}
                                label="Descripción"
                                value={task.description}
                            />

                            {/* Date & Time */}
                            <DetailRow
                                icon={LucideCalendar}
                                label="Fecha de Vencimiento"
                                value={dueDateStr ? `${dueDateStr}${task.start_time ? ` · ${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}` : ''}` : undefined}
                            />

                            {/* Priority */}
                            <div className="flex items-start space-x-3 py-2">
                                <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 ${prioConfig.dot}`} />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prioridad</p>
                                    <p className="text-sm text-gray-700 mt-0.5 capitalize">{task.priority}</p>
                                </div>
                            </div>

                            {/* Assigned To */}
                            {assignedName && (
                                <DetailRow
                                    icon={LucideUser}
                                    label="Asignado a"
                                    value={assignedName}
                                />
                            )}

                            {/* Notes */}
                            <DetailRow
                                icon={LucideStickyNote}
                                label="Notas Internas"
                                value={task.notes || task.extra_fields?.notes}
                            />

                            {/* No details message */}
                            {!task.description && !assignedName && !(task.notes || task.extra_fields?.notes) && (
                                <p className="text-xs text-gray-400 italic py-2">Sin información adicional</p>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center space-x-2 pt-3 mt-2 border-t border-gray-100">
                                <button
                                    onClick={startEditing}
                                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-clinical-600 bg-clinical-50 hover:bg-clinical-100 rounded-lg transition-colors"
                                >
                                    <LucidePencil className="w-3.5 h-3.5" />
                                    <span>Editar Tarea</span>
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMut.isPending}
                                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {deleteMut.isPending ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" /> : <LucideTrash2 className="w-3.5 h-3.5" />}
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ─── EDIT MODE ───────────────────────────── */
                        <div className="pt-3 space-y-4" onClick={e => e.stopPropagation()}>
                            {/* Task Type Selector */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Tipo de Actividad
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {TASK_TYPES.map(tt => (
                                        <button key={tt.value} type="button"
                                            onClick={() => setEditType(tt.value)}
                                            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                editType === tt.value
                                                    ? `${tt.bgColor} ${tt.color} border-current shadow-sm`
                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <tt.icon className="w-3 h-3" />
                                            <span>{tt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Título</label>
                                <input type="text" value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción</label>
                                <textarea value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none"
                                />
                            </div>

                            {/* Date, Priority, Times */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha</label>
                                    <input type="date" value={editDueDate}
                                        onChange={e => setEditDueDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Prioridad</label>
                                    <select value={editPriority}
                                        onChange={e => setEditPriority(e.target.value as TaskPriority)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer"
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
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hora Inicio</label>
                                        <input type="time" value={editStartTime}
                                            onChange={e => setEditStartTime(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hora Fin</label>
                                        <input type="time" value={editEndTime}
                                            onChange={e => setEditEndTime(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Assign To — only for admins */}
                            {isAdmin && (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Asignar a</label>
                                    <select value={editAssignTo}
                                        onChange={e => setEditAssignTo(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer"
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
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notas Internas</label>
                                <textarea value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Notas privadas, observaciones..."
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMut.isPending}
                                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {deleteMut.isPending ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" /> : <LucideTrash2 className="w-3.5 h-3.5" />}
                                    <span>Eliminar</span>
                                </button>
                                <div className="flex items-center space-x-2">
                                    <button onClick={cancelEditing}
                                        className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button onClick={handleSave}
                                        disabled={updateMut.isPending || !editTitle.trim()}
                                        className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMut.isPending && <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>{updateMut.isPending ? 'Guardando...' : 'Actualizar Tarea'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
