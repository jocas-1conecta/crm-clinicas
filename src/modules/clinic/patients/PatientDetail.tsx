import React, { useState } from 'react'
import { useStore, Deal } from '../../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import {
    LucideX,
    LucideUser,
    LucidePhone,
    LucideMail,
    LucideCheckSquare,
    LucideFiles,
    LucideBriefcase,
    LucidePlus,
    LucideTag,
    LucideCalendar
} from 'lucide-react'

export const PatientDetail = ({ patientId, onClose }: { patientId: string, onClose: () => void }) => {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('info')
    
    // Formulario Nuevo Negocio
    const [showNewDeal, setShowNewDeal] = useState(false)
    const [dealTitle, setDealTitle] = useState('')
    const [dealValue, setDealValue] = useState(0)

    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).single();
            if (error) throw error;
            return data;
        }
    })

    const { data: deals = [] } = useQuery({
        queryKey: ['deals', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('deals').select('*').eq('patient_id', patientId);
            if (error) throw error;
            return data;
        }
    })

    const { data: patientTasks = [] } = useQuery({
        queryKey: ['tasks', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('tasks').select('*').eq('rel_id', patientId);
            if (error) throw error;
            return data;
        }
    })

    const addDealMut = useMutation({
        mutationFn: async (deal: any) => {
            const { error } = await supabase.from('deals').insert([{ ...deal, patient_id: patientId }]);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', patientId] })
    })

    const updateDealMut = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('deals').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', patientId] })
    })

    if (!patient) return null

    const handleAddDeal = () => {
        if (!dealTitle) return
        addDealMut.mutate({
            title: dealTitle,
            estimated_value: Number(dealValue),
            status: 'Nuevo negocio/oportunidad'
        })
        setShowNewDeal(false)
        setDealTitle('')
        setDealValue(0)
    }

    const tabs = [
        { id: 'info', name: 'Datos Personales', icon: LucideUser },
        { id: 'deals', name: 'Oportunidades', icon: LucideBriefcase },
        { id: 'tasks', name: 'Contactos / Tareas', icon: LucideCalendar },
        { id: 'files', name: 'Materiales Enviados', icon: LucideFiles },
    ]

    const dealStatuses = ['Nuevo negocio/oportunidad', 'Contactado', 'En validación/seguimiento', 'Ganado', 'Perdido']

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-clinical-100 rounded-2xl">
                            <LucideUser className="w-6 h-6 text-clinical-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-clinical-50 text-clinical-600 border border-clinical-100">{patient.status}</span>
                                <span className="text-gray-300">•</span>
                                <div className="flex space-x-1">
                                    {(patient.tags || []).map((tag: string) => (
                                        <span key={tag} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-all">
                        <LucideX className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="px-8 border-b border-gray-100 flex space-x-8 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 flex items-center space-x-2 border-b-2 transition-all font-medium ${activeTab === tab.id
                                ? 'border-clinical-600 text-clinical-700'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex bg-white">
                    {/* Main Tab Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'info' && (
                            <div className="space-y-8 max-w-2xl">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <LucidePhone className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-700">{patient.phone || 'No registrado'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <LucideMail className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-700">{patient.email || 'No registrado'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Edad</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <span className="font-medium text-gray-700">{patient.age} años</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Última Visita</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <span className="font-medium text-gray-700">{patient.last_visit || 'Sin registros'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'deals' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900">Negocios / Oportunidades</h3>
                                    <button
                                        onClick={() => setShowNewDeal(!showNewDeal)}
                                        className="text-white bg-clinical-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-1 hover:bg-clinical-700 transition-colors"
                                    >
                                        <LucidePlus className="w-4 h-4" /> <span>Nueva Oportunidad</span>
                                    </button>
                                </div>

                                {showNewDeal && (
                                    <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio/Producto (Impulso o Control)</label>
                                            <input
                                                type="text"
                                                value={dealTitle}
                                                onChange={(e) => setDealTitle(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500"
                                                placeholder="Ej. Diseño de Sonrisa"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado ($)</label>
                                            <input
                                                type="number"
                                                value={dealValue}
                                                onChange={(e) => setDealValue(Number(e.target.value))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500"
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <button onClick={() => setShowNewDeal(false)} className="px-4 py-2 text-gray-500 font-medium">Cancelar</button>
                                            <button onClick={handleAddDeal} className="px-4 py-2 bg-clinical-600 text-white rounded-xl font-bold">Guardar</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 pt-4">
                                    {deals.length === 0 ? (
                                        <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                            <LucideBriefcase className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500">Este paciente no tiene oportunidades de negocio activas.</p>
                                        </div>
                                    ) : (
                                        deals.map(deal => (
                                            <div key={deal.id} className="p-5 border border-gray-100 bg-white shadow-sm rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{deal.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Creado: {new Date(deal.created_at).toLocaleDateString()}</p>
                                                    <p className="text-sm font-medium text-clinical-600 mt-2">Valor: ${Number(deal.estimated_value).toLocaleString()}</p>
                                                </div>
                                                <div className="text-right space-y-2">
                                                    <label className="text-xs font-bold text-gray-400 uppercase">Fase Actual</label>
                                                    <select
                                                        value={deal.status}
                                                        onChange={(e) => updateDealMut.mutate({ id: deal.id, status: e.target.value })}
                                                        className="block w-full border-gray-200 rounded-lg text-sm bg-gray-50 font-medium p-2 outline-none cursor-pointer focus:ring-2 focus:ring-clinical-500"
                                                    >
                                                        {dealStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900">Próximos Contactos y Tareas</h3>
                                    <button className="text-clinical-600 text-sm font-bold flex items-center space-x-1 hover:underline">
                                        <LucidePlus className="w-4 h-4" /> <span>Programar</span>
                                    </button>
                                </div>
                                
                                {patientTasks.length === 0 ? (
                                     <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                        <p className="text-gray-500">No hay contactos programados (Una actividad siempre lleva a una nueva).</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {patientTasks.map(task => (
                                            <div key={task.id} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100 group cursor-pointer hover:bg-white transition-all">
                                                <div className="flex justify-between">
                                                    <span className="flex-1 text-gray-700 font-bold">{task.title}</span>
                                                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{task.status}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-2">{task.task_date} {task.task_time}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'files' && (
                            <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl mt-4">
                                <LucideFiles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">Historial de correos y material audiovisual enviado al paciente aparecerá aquí.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Quick Actions */}
                    <div className="w-80 border-l border-gray-100 bg-gray-50/30 p-8 space-y-8 hidden xl:block">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resumen de Valor</h4>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-900">
                                    Oportunidades Abiertas: <span className="text-clinical-600">
                                        {deals.filter(d => d.status !== 'Ganado' && d.status !== 'Perdido').length}
                                    </span>
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    Oportunidades Ganadas: <span className="text-emerald-600">
                                        {deals.filter(d => d.status === 'Ganado').length}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestionado por</h4>
                            <div className="flex items-center space-x-3">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${patient.assigned_to}`}
                                    className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
                                    alt="Assignee"
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Asignado
                                    </p>
                                    <p className="text-[10px] text-gray-500">ID: {patient.assigned_to?.substring(0,8)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 space-y-3">
                            <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                <span>Añadir Etiqueta</span>
                            </button>
                            <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                <span>Enviar Material</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
