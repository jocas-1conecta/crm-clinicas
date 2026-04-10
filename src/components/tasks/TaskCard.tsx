import React from 'react'
import { CrmTask, TaskCategory, TaskPriority } from '../../store/useStore'
import {
    LucideCheckCircle2, LucideCircle, LucideAlertTriangle, LucideClock,
    LucidePhone, LucideMessageSquare, LucideUsers, LucideFileText, LucidePin,
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
    onOpenDrawer: () => void
}

export const TaskCard = ({ task, isSelected, selectionMode, onToggleComplete, onSelect, onOpenDrawer }: TaskCardProps) => {
    const typeConfig = getTypeConfig(task.task_type)
    const prioConfig = getPriorityConfig(task.priority)
    const overdue = isOverdue(task)
    const today = !task.is_completed && isToday(task)

    const dueDateStr = task.due_date
        ? new Date(task.due_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        : ''

    const daysUntil = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000) : null
    const dateLabel = daysUntil === null ? ''
        : daysUntil < 0 ? `Hace ${Math.abs(daysUntil)}d`
        : daysUntil === 0 ? 'Hoy'
        : daysUntil === 1 ? 'Mañana'
        : `En ${daysUntil}d`

    // Dynamic styles based on state
    const cardBg = task.is_completed
        ? 'bg-gray-50/50 border-gray-100 opacity-60'
        : overdue
            ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100/50'
            : today
                ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'

    const selectedRing = isSelected ? 'ring-2 ring-clinical-500 ring-offset-1' : ''

    return (
        <div
            className={`group rounded-xl border transition-all duration-200 ${cardBg} ${selectedRing}`}
        >
            <div className="flex items-start p-4 space-x-3">
                {/* Selection Checkbox (visible in selection mode) */}
                {selectionMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect() }}
                        className="mt-0.5 shrink-0"
                    >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                                ? 'bg-clinical-600 border-clinical-600'
                                : 'border-gray-300 hover:border-clinical-400'
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

                {/* Content (clickable for drawer) */}
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={onOpenDrawer}
                >
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
                        {/* Type badge */}
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.bgColor} ${typeConfig.color}`}>
                            <typeConfig.icon className="w-3 h-3" />
                            <span>{typeConfig.label}</span>
                        </span>

                        {/* Priority badge */}
                        {task.priority !== 'normal' && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                task.priority === 'alta' ? 'text-red-600 bg-red-50 border-red-200' : 'text-blue-500 bg-blue-50 border-blue-200'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prioConfig.dot}`}></span>
                                <span>{prioConfig.label}</span>
                            </span>
                        )}

                        {/* Date */}
                        {dueDateStr && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-medium ${
                                overdue ? 'text-red-500' : today ? 'text-amber-600' : 'text-gray-400'
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

                    {/* Description preview */}
                    {task.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{task.description}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
