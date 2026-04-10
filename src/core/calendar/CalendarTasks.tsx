import React, { useState, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useTasks, useToggleTask, StatusFilter, DateFilter } from '../../hooks/useTasks'
import { useTaskRealtime } from '../../hooks/useTaskRealtime'
import { TaskCard } from '../../components/tasks/TaskCard'
import { TaskDrawer } from '../../components/tasks/TaskDrawer'
import { BulkActionsBar } from '../../components/tasks/BulkActionsBar'
import {
    LucidePlus, LucideCalendar,
    LucideChevronLeft, LucideChevronRight, LucideCheckSquare,
} from 'lucide-react'

// ─── Filter Pill Configs ──────────────────────────────────────
const STATUS_PILLS: { value: StatusFilter; label: string; emoji: string }[] = [
    { value: 'todas', label: 'Todas', emoji: '📋' },
    { value: 'pendientes', label: 'Pendientes', emoji: '⏳' },
    { value: 'alta', label: 'Prioritarias', emoji: '🔴' },
    { value: 'completadas', label: 'Completadas', emoji: '✅' },
]

const DATE_PILLS: { value: DateFilter; label: string; emoji: string }[] = [
    { value: 'todas', label: 'Todas', emoji: '📅' },
    { value: 'hoy', label: 'Hoy', emoji: '🌅' },
    { value: 'manana', label: 'Mañana', emoji: '☀️' },
    { value: 'semana', label: 'Esta Semana', emoji: '📆' },
    { value: 'proximas', label: 'Próximas', emoji: '🔮' },
]

export const CalendarTasks = () => {
    const { currentUser } = useStore()

    // ─── Filters & Pagination ─────────────────────────────────
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas')
    const [dateFilter, setDateFilter] = useState<DateFilter>('todas')
    const [page, setPage] = useState(1)

    // ─── Data ─────────────────────────────────────────────────
    const { data: result, isLoading } = useTasks({ statusFilter, dateFilter, page })
    const tasks = result?.tasks || []
    const totalCount = result?.total || 0
    const pageSize = result?.pageSize || 25
    const totalPages = Math.ceil(totalCount / pageSize)

    // ─── Mutations ────────────────────────────────────────────
    const toggleMut = useToggleTask()

    // ─── Realtime ─────────────────────────────────────────────
    useTaskRealtime(currentUser?.id)

    // ─── Create Drawer State (create-only, editing is inline) ──
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

    const openCreateDrawer = useCallback(() => {
        setCreateDrawerOpen(true)
    }, [])

    const closeCreateDrawer = useCallback(() => {
        setCreateDrawerOpen(false)
    }, [])

    // ─── Selection State ──────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const selectionMode = selectedIds.size > 0

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === tasks.length) {
            clearSelection()
        } else {
            setSelectedIds(new Set(tasks.map(t => t.id)))
        }
    }, [tasks, selectedIds.size, clearSelection])

    // ─── Filter Handlers ──────────────────────────────────────
    const changeFilter = (sf: StatusFilter, df: DateFilter) => {
        setStatusFilter(sf)
        setDateFilter(df)
        setPage(1)
        clearSelection()
    }

    // ─── Skeleton Loader ──────────────────────────────────────
    const SkeletonCards = () => (
        <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
                    <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
                            <div className="flex space-x-2">
                                <div className="h-5 bg-gray-100 rounded-md w-16" />
                                <div className="h-5 bg-gray-100 rounded-md w-12" />
                                <div className="h-5 bg-gray-100 rounded-md w-20" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

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
                <div className="flex items-center space-x-2">
                    {tasks.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className={`px-3 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 transition-colors border ${
                                selectionMode
                                    ? 'bg-clinical-50 text-clinical-600 border-clinical-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                            title="Seleccionar todas"
                        >
                            <LucideCheckSquare className="w-4 h-4" />
                            <span className="hidden md:inline">
                                {selectionMode
                                    ? selectedIds.size === tasks.length ? 'Deseleccionar' : 'Seleccionar todas'
                                    : 'Seleccionar'
                                }
                            </span>
                        </button>
                    )}
                    <button
                        onClick={openCreateDrawer}
                        className="bg-clinical-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-clinical-700 transition-colors shadow-sm"
                    >
                        <LucidePlus className="w-5 h-5" />
                        <span>Nueva Tarea</span>
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-xl p-1">
                    {STATUS_PILLS.map(pill => (
                        <button
                            key={pill.value}
                            onClick={() => changeFilter(pill.value, dateFilter)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === pill.value
                                    ? 'bg-clinical-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {pill.emoji} {pill.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-xl p-1">
                    {DATE_PILLS.map(pill => (
                        <button
                            key={pill.value}
                            onClick={() => changeFilter(statusFilter, pill.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                dateFilter === pill.value
                                    ? 'bg-clinical-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {pill.emoji} {pill.label}
                        </button>
                    ))}
                </div>
                {(statusFilter !== 'todas' || dateFilter !== 'todas') && (
                    <button
                        onClick={() => changeFilter('todas', 'todas')}
                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                    >
                        ✕ Limpiar filtros
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-auto space-y-2 pr-1">
                {isLoading ? (
                    <SkeletonCards />
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <LucideCalendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay tareas que coincidan con los filtros.</p>
                        <button
                            onClick={openCreateDrawer}
                            className="mt-3 text-sm font-bold text-clinical-600 hover:text-clinical-700"
                        >
                            + Crear una tarea
                        </button>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            isSelected={selectedIds.has(task.id)}
                            selectionMode={selectionMode}
                            onToggleComplete={() => toggleMut.mutate({ id: task.id, completed: !task.is_completed })}
                            onSelect={() => toggleSelection(task.id)}
                        />
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 shrink-0">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="flex items-center space-x-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <LucideChevronLeft className="w-4 h-4" />
                        <span>Anterior</span>
                    </button>
                    <span className="text-xs font-bold text-gray-400">
                        Página {page} de {totalPages} · {totalCount} tareas
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="flex items-center space-x-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span>Siguiente</span>
                        <LucideChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Create-Only Side Drawer */}
            <TaskDrawer
                open={createDrawerOpen}
                task={null}
                onClose={closeCreateDrawer}
            />

            {/* Bulk Actions Bar */}
            <BulkActionsBar
                selectedIds={Array.from(selectedIds)}
                onClearSelection={clearSelection}
            />
        </div>
    )
}
