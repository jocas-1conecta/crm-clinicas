import React, { useState } from 'react'
import { useBulkCompleteTasks, useBulkDeleteTasks, useBulkReschedule } from '../../hooks/useTasks'
import {
    LucideCheckCircle2, LucideTrash2, LucideCalendar,
    LucideX, LucideLoader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface BulkActionsBarProps {
    selectedIds: string[]
    onClearSelection: () => void
}

export const BulkActionsBar = ({ selectedIds, onClearSelection }: BulkActionsBarProps) => {
    const completeMut = useBulkCompleteTasks()
    const deleteMut = useBulkDeleteTasks()
    const rescheduleMut = useBulkReschedule()
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [rescheduleDate, setRescheduleDate] = useState('')

    const count = selectedIds.length
    if (count === 0) return null

    const isLoading = completeMut.isPending || deleteMut.isPending || rescheduleMut.isPending

    const handleComplete = () => {
        completeMut.mutate(selectedIds, {
            onSuccess: () => {
                toast.success(`${count} tarea${count > 1 ? 's' : ''} completada${count > 1 ? 's' : ''}`)
                onClearSelection()
            },
            onError: () => toast.error('Error al completar tareas'),
        })
    }

    const handleDelete = () => {
        if (!confirm(`¿Eliminar ${count} tarea${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return
        deleteMut.mutate(selectedIds, {
            onSuccess: () => {
                toast.success(`${count} tarea${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''}`)
                onClearSelection()
            },
            onError: () => toast.error('Error al eliminar'),
        })
    }

    const handleReschedule = () => {
        if (!rescheduleDate) return
        rescheduleMut.mutate({ ids: selectedIds, newDate: rescheduleDate }, {
            onSuccess: () => {
                toast.success(`${count} tarea${count > 1 ? 's' : ''} reprogramada${count > 1 ? 's' : ''}`)
                onClearSelection()
                setShowDatePicker(false)
                setRescheduleDate('')
            },
            onError: () => toast.error('Error al reprogramar'),
        })
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center space-x-4">
                {/* Count */}
                <div className="flex items-center space-x-2 pr-4 border-r border-gray-700">
                    <span className="bg-clinical-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {count}
                    </span>
                    <span className="text-sm font-medium text-gray-300">
                        seleccionada{count > 1 ? 's' : ''}
                    </span>
                </div>

                {/* Actions */}
                <button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                    {completeMut.isPending ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" /> : <LucideCheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Completar</span>
                </button>

                {/* Reschedule */}
                <div className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        disabled={isLoading}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        <LucideCalendar className="w-3.5 h-3.5" />
                        <span>Reprogramar</span>
                    </button>
                    {showDatePicker && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[220px]">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Nueva fecha</p>
                            <input
                                type="date"
                                value={rescheduleDate}
                                onChange={e => setRescheduleDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-clinical-500 mb-2"
                            />
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowDatePicker(false); setRescheduleDate('') }}
                                    className="flex-1 px-3 py-1.5 text-gray-500 text-xs font-bold hover:bg-gray-50 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReschedule}
                                    disabled={!rescheduleDate || rescheduleMut.isPending}
                                    className="flex-1 px-3 py-1.5 bg-clinical-600 text-white text-xs font-bold rounded-lg hover:bg-clinical-700 disabled:opacity-50"
                                >
                                    {rescheduleMut.isPending ? 'Guardando...' : 'Aplicar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                    {deleteMut.isPending ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" /> : <LucideTrash2 className="w-3.5 h-3.5" />}
                    <span>Eliminar</span>
                </button>

                {/* Close selection */}
                <button
                    onClick={onClearSelection}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-1"
                    title="Cancelar selección"
                >
                    <LucideX className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
