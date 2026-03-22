import React, { useState } from 'react'
import { useStore, CrmTask, TaskCategory, TaskPriority } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import {
    LucideCheckCircle2, LucideCircle, LucidePlus, LucideX,
    LucidePhone, LucideMessageSquare, LucideUsers, LucideFileText,
    LucidePin, LucideAlertTriangle, LucideClock, LucideCalendar,
    LucideChevronLeft, LucideChevronRight, LucideFilter
} from 'lucide-react'

const TASK_TYPES: { value: TaskCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { value: 'llamada', label: 'Llamada', icon: LucidePhone, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { value: 'mensaje', label: 'Mensaje', icon: LucideMessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { value: 'reunion', label: 'Reunión', icon: LucideUsers, color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { value: 'cotizacion', label: 'Cotización', icon: LucideFileText, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { value: 'otro', label: 'Otro', icon: LucidePin, color: 'text-gray-600', bgColor: 'bg-gray-100' },
]

const getTypeConfig = (type: TaskCategory) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[4]
const isOverdue = (task: CrmTask) => !task.is_completed && new Date(task.due_date) < new Date()

type StatusFilter = 'todas' | 'alta' | 'completadas'
type DateFilter = 'todas' | 'hoy' | 'manana' | 'semana' | 'proximas'

const PAGE_SIZE = 25

export const CalendarTasks = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas')
    const [dateFilter, setDateFilter] = useState<DateFilter>('todas')
    const [page, setPage] = useState(1)

    // ─── New Task Form ────────────────────────────────────────
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [taskType, setTaskType] = useState<TaskCategory>('otro')
    const [priority, setPriority] = useState<TaskPriority>('normal')
    const [dueDate, setDueDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    // Follow-up state
    const [followUpMode, setFollowUpMode] = useState(false)

    // ─── Server-side paginated query ──────────────────────────
    const { data: result, isLoading } = useQuery({
        queryKey: ['global_tasks', currentUser?.id, currentUser?.role, statusFilter, dateFilter, page],
        queryFn: async () => {
            let query = supabase.from('crm_tasks').select('*', { count: 'exact' })

            // Role scoping
            if (currentUser?.role === 'Admin_Clinica') {
                query = query.eq('sucursal_id', currentUser.sucursal_id)
            } else if (currentUser?.role !== 'Super_Admin') {
                query = query.eq('assigned_to', currentUser?.id)
            }

            // Status filters
            if (statusFilter === 'todas') {
                query = query.eq('is_completed', false)
            } else if (statusFilter === 'alta') {
                query = query.eq('is_completed', false).eq('priority', 'alta')
            } else if (statusFilter === 'completadas') {
                query = query.eq('is_completed', true)
            }

            // Date filters
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
            const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
            const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString()
            const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

            if (dateFilter === 'hoy') {
                query = query.gte('due_date', todayStart).lte('due_date', todayEnd)
            } else if (dateFilter === 'manana') {
                query = query.gte('due_date', tomorrowStart).lte('due_date', tomorrowEnd)
            } else if (dateFilter === 'semana') {
                query = query.gte('due_date', todayStart).lte('due_date', weekEnd)
            } else if (dateFilter === 'proximas') {
                query = query.gt('due_date', weekEnd)
            }

            // Pagination
            const from = (page - 1) * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const { data, error, count } = await query
                .order('due_date', { ascending: true })
                .range(from, to)

            if (error) throw error
            return { tasks: (data || []) as CrmTask[], total: count || 0 }
        },
        enabled: !!currentUser
    })

    const tasks = result?.tasks || []
    const totalCount = result?.total || 0
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    // ─── Mutations ────────────────────────────────────────────
    const toggleMut = useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const { error } = await supabase.from('crm_tasks').update({
                is_completed: completed,
                completed_at: completed ? new Date().toISOString() : null
            }).eq('id', id)
            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['global_tasks'] })
            // Follow-up: completing a task triggers "next action required"
            if (variables.completed) {
                setFollowUpMode(true)
                setShowForm(true)
                setTitle('')
                setDescription('')
                setDueDate('')
            }
        }
    })

    const addTaskMut = useMutation({
        mutationFn: async (task: any) => {
            const { error } = await supabase.from('crm_tasks').insert([task])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global_tasks'] })
            setShowForm(false)
            setFollowUpMode(false)
            setTitle(''); setDescription(''); setDueDate(''); setStartTime(''); setEndTime('')
            setTaskType('otro'); setPriority('normal')
        }
    })

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        const isoDate = dueDate ? `${dueDate}T12:00:00.000Z` : new Date().toISOString()
        addTaskMut.mutate({
            title: title.trim(),
            description: description.trim() || null,
            task_type: taskType,
            priority,
            due_date: isoDate,
            start_time: startTime || null,
            end_time: endTime || null,
            assigned_to: currentUser?.id,
            sucursal_id: currentUser?.sucursal_id,
        })
    }

    const changeFilter = (sf: StatusFilter, df: DateFilter) => {
        setStatusFilter(sf); setDateFilter(df); setPage(1)
    }

    const hasTime = taskType === 'reunion' || taskType === 'llamada'

    // ─── Status Filter Pills ─────────────────────────────────
    const statusPills: { value: StatusFilter; label: string; emoji: string }[] = [
        { value: 'todas', label: 'Todas', emoji: '📋' },
        { value: 'alta', label: 'Prioritarias', emoji: '🔴' },
        { value: 'completadas', label: 'Completadas', emoji: '✅' },
    ]

    const datePills: { value: DateFilter; label: string; emoji: string }[] = [
        { value: 'todas', label: 'Todas', emoji: '📅' },
        { value: 'hoy', label: 'Hoy', emoji: '🌅' },
        { value: 'manana', label: 'Mañana', emoji: '☀️' },
        { value: 'semana', label: 'Esta Semana', emoji: '📆' },
        { value: 'proximas', label: 'Próximas', emoji: '🔮' },
    ]

    return (
        <div className="h-full flex flex-col space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mis Tareas y Actividades</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {totalCount} tarea{totalCount !== 1 ? 's' : ''} · Página {page} de {totalPages || 1}
                    </p>
                </div>
                <button
                    onClick={() => { setFollowUpMode(false); setShowForm(!showForm) }}
                    className="bg-clinical-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-clinical-700 transition-colors shadow-sm"
                >
                    {showForm ? <LucideX className="w-5 h-5" /> : <LucidePlus className="w-5 h-5" />}
                    <span>{showForm ? 'Cancelar' : 'Nueva Tarea'}</span>
                </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-xl p-1">
                    {statusPills.map(pill => (
                        <button key={pill.value}
                            onClick={() => changeFilter(pill.value, dateFilter)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === pill.value
                                    ? 'bg-clinical-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}>
                            {pill.emoji} {pill.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-xl p-1">
                    {datePills.map(pill => (
                        <button key={pill.value}
                            onClick={() => changeFilter(statusFilter, pill.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                dateFilter === pill.value
                                    ? 'bg-clinical-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}>
                            {pill.emoji} {pill.label}
                        </button>
                    ))}
                </div>
                {(statusFilter !== 'todas' || dateFilter !== 'todas') && (
                    <button onClick={() => changeFilter('todas', 'todas')}
                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                        ✕ Limpiar filtros
                    </button>
                )}
            </div>

            {/* New Task Form / Follow-up */}
            {showForm && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {followUpMode && (
                        <div className="flex items-center space-x-2 text-amber-700 bg-amber-50 px-4 py-2 rounded-xl text-sm font-bold border border-amber-200">
                            <LucideAlertTriangle className="w-4 h-4" />
                            <span>Has completado una actividad. Programa el siguiente paso.</span>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Type selector */}
                        <div className="flex flex-wrap gap-2">
                            {TASK_TYPES.map(tt => (
                                <button key={tt.value} type="button" onClick={() => setTaskType(tt.value)}
                                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        taskType === tt.value
                                            ? `${tt.bgColor} ${tt.color} border-current shadow-sm scale-105`
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    <tt.icon className="w-3.5 h-3.5" />
                                    <span>{tt.label}</span>
                                </button>
                            ))}
                        </div>

                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Título de la tarea..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium" />

                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Descripción (opcional)" rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm resize-none" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
                                <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                            </div>
                            {hasTime && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora Inicio</label>
                                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hora Fin</label>
                                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prioridad</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 cursor-pointer">
                                    <option value="alta">🔴 Alta</option>
                                    <option value="normal">⚪ Normal</option>
                                    <option value="baja">🔵 Baja</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            {!followUpMode && (
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-lg">Cancelar</button>
                            )}
                            <button type="submit" disabled={addTaskMut.isPending}
                                className="px-5 py-2 bg-clinical-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-clinical-700 transition-colors disabled:opacity-50">
                                Guardar Tarea
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Task List */}
            <div className="flex-1 overflow-auto space-y-2 pr-1">
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="w-8 h-8 border-4 border-clinical-200 border-t-clinical-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-3 font-medium">Cargando tareas...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <LucideCalendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay tareas que coincidan con los filtros.</p>
                    </div>
                ) : (
                    tasks.map(task => {
                        const typeConfig = getTypeConfig(task.task_type)
                        const overdue = isOverdue(task)
                        const dueDateStr = task.due_date ? new Date(task.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''

                        return (
                            <div key={task.id}
                                className={`flex items-start p-4 rounded-xl border transition-all group ${
                                    task.is_completed
                                        ? 'bg-gray-50/50 border-gray-100 opacity-70'
                                        : overdue
                                            ? 'bg-white border-red-200 shadow-sm shadow-red-100'
                                            : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                                }`}
                            >
                                {/* Toggle */}
                                <button onClick={() => toggleMut.mutate({ id: task.id, completed: !task.is_completed })}
                                    className="mt-0.5 mr-3 shrink-0 transition-transform hover:scale-110">
                                    {task.is_completed
                                        ? <LucideCheckCircle2 className="w-5 h-5 text-clinical-500" />
                                        : <LucideCircle className={`w-5 h-5 ${overdue ? 'text-red-400' : 'text-gray-300 group-hover:text-clinical-400'}`} />
                                    }
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
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
                                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig.bgColor} ${typeConfig.color}`}>
                                            <typeConfig.icon className="w-3 h-3" />
                                            <span>{typeConfig.label}</span>
                                        </span>
                                        {task.priority === 'alta' && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-md">🔴 Alta</span>
                                        )}
                                        {dueDateStr && (
                                            <span className={`inline-flex items-center space-x-1 text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                <LucideClock className="w-3 h-3" />
                                                <span>{dueDateStr}</span>
                                            </span>
                                        )}
                                        {task.start_time && (
                                            <span className="text-[10px] text-gray-400">{task.start_time}{task.end_time ? ` - ${task.end_time}` : ''}</span>
                                        )}
                                    </div>
                                    {task.description && (
                                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{task.description}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 shrink-0">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="flex items-center space-x-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <LucideChevronLeft className="w-4 h-4" />
                        <span>Anterior</span>
                    </button>
                    <span className="text-xs font-bold text-gray-400">
                        Página {page} de {totalPages} · {totalCount} tareas
                    </span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                        className="flex items-center space-x-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <span>Siguiente</span>
                        <LucideChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
