import React, { useState } from 'react'
import { useStore, ActivityTask } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideCheckSquare, LucideCalendar, LucidePlus, LucideX, LucideClock, LucideAlertCircle } from 'lucide-react'

export const CalendarTasks = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [showNewTaskModal, setShowNewTaskModal] = useState(false)
    const [followUpFor, setFollowUpFor] = useState<string | null>(null)
    
    const { data: myTasks = [] } = useQuery({
        queryKey: ['tasks', currentUser?.sucursal_id],
        queryFn: async () => {
            let q = supabase.from('tasks').select('*');
            if (currentUser?.role === 'Admin_Clinica') {
                q = q.eq('sucursal_id', currentUser.sucursal_id);
            } else {
                q = q.eq('assigned_to', currentUser?.id);
            }
            const { data, error } = await q.order('task_date', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser
    })

    const pendingTasks = myTasks.filter(t => t.status === 'Pendiente' || t.status === 'Reprogramada')
    const completedTasks = myTasks.filter(t => t.status === 'Realizada')

    // Modal state
    const [title, setTitle] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [relType, setRelType] = useState<'lead' | 'patient'>('lead')
    const [relId, setRelId] = useState('')

    const updateTaskMut = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', currentUser?.sucursal_id] })
        }
    })

    const addTaskMut = useMutation({
        mutationFn: async (task: any) => {
            const { error } = await supabase.from('tasks').insert([task]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', currentUser?.sucursal_id] })
        }
    })

    const handleCompleteTask = (task: any) => {
        updateTaskMut.mutate({ id: task.id, status: 'Realizada' })
        // Regla: "Una actividad siempre lleva a una nueva"
        setFollowUpFor(task.id)
        setRelType(task.rel_type)
        setRelId(task.rel_id)
        setShowNewTaskModal(true)
    }

    const handleSaveTask = (e: React.FormEvent) => {
        e.preventDefault()
        addTaskMut.mutate({
            title,
            task_date: date,
            task_time: time,
            status: 'Pendiente',
            rel_type: relType,
            rel_id: relId || "00000000-0000-0000-0000-000000000000", // Fallback for logical reference
            assigned_to: currentUser?.id,
            sucursal_id: currentUser?.sucursal_id
        })
        setShowNewTaskModal(false)
        setFollowUpFor(null)
        setTitle('')
        setDate('')
        setTime('')
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mis Tareas y Actividades</h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona tu agenda de seguimiento (Una actividad siempre lleva a una nueva)</p>
                </div>
                <button
                    onClick={() => {
                        setFollowUpFor(null)
                        setShowNewTaskModal(true)
                    }}
                    className="bg-clinical-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-clinical-700 transition-colors shadow-sm"
                >
                    <LucidePlus className="w-5 h-5" />
                    <span>Nueva Tarea</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* Pending Tasks */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm h-full">
                    <div className="flex items-center space-x-3 mb-6 shrink-0">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <LucideAlertCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Pendientes Hoy</h2>
                    </div>
                    
                    <div className="flex-1 overflow-auto space-y-4 pr-2">
                        {pendingTasks.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                <LucideCheckSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No tienes tareas pendientes para hoy.</p>
                            </div>
                        ) : (
                            pendingTasks.map(task => (
                                <div key={task.id} className="p-5 border border-gray-100 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white transition-all shadow-sm">
                                    <div className="flex items-start space-x-4">
                                        <button 
                                            onClick={() => handleCompleteTask(task)}
                                            className="mt-0.5 w-6 h-6 rounded border-2 border-gray-300 hover:border-clinical-500 hover:bg-clinical-50 transition-colors flex shrink-0"
                                            title="Marcar como realizada"
                                        />
                                        <div>
                                            <h3 className="font-bold text-gray-900 group-hover:text-clinical-700 transition-colors">{task.title}</h3>
                                            <div className="flex items-center space-x-3 mt-2 text-xs font-medium text-gray-500">
                                                <span className="flex items-center space-x-1">
                                                    <LucideCalendar className="w-4 h-4" />
                                                    <span>{task.task_date}</span>
                                                </span>
                                                {task.task_time && (
                                                    <span className="flex items-center space-x-1">
                                                        <LucideClock className="w-4 h-4" />
                                                        <span>{task.task_time}</span>
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-bold uppercase tracking-wider text-[10px]">
                                                    {task.rel_type === 'lead' ? 'Lead' : 'Paciente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <button 
                                            onClick={() => updateTaskMut.mutate({ id: task.id, status: 'Reprogramada' })}
                                            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            Reprogramar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Completed Tasks */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm h-full">
                    <div className="flex items-center space-x-3 mb-6 shrink-0">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                            <LucideCheckSquare className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Realizadas</h2>
                    </div>
                    
                    <div className="flex-1 overflow-auto space-y-4 pr-2">
                        {completedTasks.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-gray-500 font-medium">Aún no has completado tareas.</p>
                            </div>
                        ) : (
                            completedTasks.map(task => (
                                <div key={task.id} className="p-5 border border-gray-100 bg-gray-50 opacity-70 rounded-2xl flex items-center space-x-4">
                                    <div className="w-6 h-6 rounded bg-clinical-500 flex items-center justify-center shrink-0">
                                        <LucideCheckSquare className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-500 line-through">{task.title}</h3>
                                        <div className="flex items-center space-x-3 mt-1 text-xs font-medium text-gray-400">
                                            <span>{task.task_date} {task.task_time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Task Modal */}
            {showNewTaskModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {followUpFor ? 'Siguiente Acción Requerida' : 'Nueva Tarea'}
                                </h3>
                                {followUpFor && (
                                    <p className="text-xs text-amber-600 font-bold mt-1">
                                        Has completado una actividad. Debes programar el siguiente paso.
                                    </p>
                                )}
                            </div>
                            {!followUpFor && (
                                <button onClick={() => setShowNewTaskModal(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all">
                                    <LucideX className="w-5 h-5 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSaveTask} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Título de la Tarea</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej. Llamar para resolver dudas de presupuesto"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:bg-white transition-all text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:bg-white transition-all text-gray-700"
                                    />
                                </div>
                            </div>

                            {!followUpFor && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Relación</label>
                                        <select 
                                            value={relType}
                                            onChange={(e) => setRelType(e.target.value as 'lead'|'patient')}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-gray-700"
                                        >
                                            <option value="lead">Lead</option>
                                            <option value="patient">Paciente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">ID (Opcional)</label>
                                        <input
                                            type="text"
                                            value={relId}
                                            onChange={(e) => setRelId(e.target.value)}
                                            placeholder="l1, p2..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                                {!followUpFor && (
                                    <button
                                        type="button"
                                        onClick={() => setShowNewTaskModal(false)}
                                        className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-clinical-600 text-white font-bold rounded-xl shadow-sm hover:bg-clinical-700 transition-colors"
                                >
                                    Guardar Tarea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
