import React, { useState } from 'react'
import { useStore, Deal } from '../../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { EntityTasks } from '../../../components/tasks/EntityTasks'
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
    LucideCalendar,
    LucideHistory,
    LucideStethoscope,
    LucideClock,
    LucideCheckCircle2,
    LucideCircle,
    LucideArrowRight
} from 'lucide-react'

const APPT_STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
    'Por Confirmar': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    'Confirmada': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    'En Sala': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    'Completada': { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600' },
    'Cancelada': { bg: 'bg-red-50 border-red-200', text: 'text-red-600' },
    'No Asistió': { bg: 'bg-red-50 border-red-200', text: 'text-red-600' },
}

export const PatientDetail = ({ patientId, onClose }: { patientId: string, onClose: () => void }) => {
    const queryClient = useQueryClient()
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id
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

    // ─── Pipeline stages for deals ────────────────────────────
    const { data: dealStages = [] } = useQuery({
        queryKey: ['pipeline_stages', clinicaId, 'deals'],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('pipeline_stages')
                .select('*').eq('clinica_id', clinicaId).eq('board_type', 'deals').is('is_archived', false).order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    // ─── Appointments query ───────────────────────────────────
    const { data: appointments = [] } = useQuery({
        queryKey: ['patient_appointments', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false });
            if (error) throw error;
            return data;
        }
    })

    // ─── Completed tasks (for timeline) ──────────────────────
    const { data: completedTasks = [] } = useQuery({
        queryKey: ['patient_completed_tasks', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('crm_tasks')
                .select('*')
                .eq('patient_id', patientId)
                .eq('is_completed', true)
                .order('completed_at', { ascending: false })
                .limit(50);
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
        mutationFn: async ({ id, stage_id }: { id: string, stage_id: string }) => {
            const targetStage = dealStages.find((s:any) => s.id === stage_id);
            const updatePayload: any = { stage_id };
            if (targetStage?.resolution_type === 'won') {
                updatePayload.status = 'Ganado';
                updatePayload.closed_at = new Date().toISOString();
            } else if (targetStage?.resolution_type === 'lost') {
                updatePayload.status = 'Perdido';
                updatePayload.closed_at = new Date().toISOString();
            } else {
                updatePayload.status = targetStage?.name || 'En Progreso';
                updatePayload.closed_at = null;
            }
            const { error } = await supabase.from('deals').update(updatePayload).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', patientId] })
    })

    if (!patient) return null

    const handleAddDeal = () => {
        if (!dealTitle) return
        const defaultStage = dealStages.find((s:any) => s.is_default) || dealStages[0];
        addDealMut.mutate({
            title: dealTitle,
            estimated_value: Number(dealValue),
            status: defaultStage?.name || 'Nuevo negocio/oportunidad',
            stage_id: defaultStage?.id || null
        })
        setShowNewDeal(false)
        setDealTitle('')
        setDealValue(0)
    }

    // ─── Build timeline events ─────────────────────────────
    const timelineEvents = [
        ...appointments.map((a: any) => ({
            type: 'appointment' as const,
            date: new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`),
            title: a.service_name || a.specialty || 'Cita médica',
            subtitle: `Dr. ${a.doctor_name} · ${a.status}`,
            status: a.status,
            icon: LucideStethoscope,
            color: 'text-blue-600 bg-blue-100',
        })),
        ...completedTasks.map((t: any) => ({
            type: 'task' as const,
            date: new Date(t.completed_at || t.created_at),
            title: t.title,
            subtitle: `Tarea completada · ${t.task_type || 'otro'}`,
            status: 'completada',
            icon: LucideCheckCircle2,
            color: 'text-emerald-600 bg-emerald-100',
        })),
        ...deals.map((d: any) => ({
            type: 'deal' as const,
            date: new Date(d.created_at),
            title: d.title,
            subtitle: `Oportunidad · $${Number(d.estimated_value).toLocaleString()} · ${d.status}`,
            status: d.status,
            icon: LucideBriefcase,
            color: 'text-violet-600 bg-violet-100',
        })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime())

    const tabs = [
        { id: 'info', name: 'Datos Personales', icon: LucideUser },
        { id: 'appointments', name: 'Citas', icon: LucideStethoscope },
        { id: 'deals', name: 'Oportunidades', icon: LucideBriefcase },
        { id: 'tasks', name: 'Tareas', icon: LucideCalendar },
        { id: 'timeline', name: 'Timeline', icon: LucideHistory },
        { id: 'files', name: 'Archivos', icon: LucideFiles },
    ]

    // Helper to get resolution type for a deal
    const getDealResolutionType = (deal: any) => {
        const stage = dealStages.find((s:any) => s.id === deal.stage_id);
        return stage ? stage.resolution_type : 'open';
    }

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
                                                        value={deal.stage_id || ''}
                                                        onChange={(e) => updateDealMut.mutate({ id: deal.id, stage_id: e.target.value })}
                                                        className="block w-full border-gray-200 rounded-lg text-sm bg-gray-50 font-medium p-2 outline-none cursor-pointer focus:ring-2 focus:ring-clinical-500"
                                                    >
                                                        {dealStages.map((s:any) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.name}{s.resolution_type === 'won' ? ' ✓' : s.resolution_type === 'lost' ? ' ✗' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'appointments' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900">Historial de Citas</h3>
                                    <span className="text-xs font-bold text-gray-400">{appointments.length} cita{appointments.length !== 1 ? 's' : ''}</span>
                                </div>

                                {appointments.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                        <LucideStethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Este paciente no tiene citas registradas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {appointments.map((appt: any) => {
                                            const statusCfg = APPT_STATUS_CONFIG[appt.status] || APPT_STATUS_CONFIG['Por Confirmar']
                                            const dateStr = new Date(appt.appointment_date).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                            return (
                                                <div key={appt.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3">
                                                            <div className="p-2 bg-blue-50 rounded-xl shrink-0 mt-0.5">
                                                                <LucideStethoscope className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{appt.service_name || appt.specialty || 'Consulta'}</p>
                                                                <p className="text-sm text-gray-500 mt-0.5">Dr. {appt.doctor_name}</p>
                                                                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                                                                    <span className="flex items-center space-x-1">
                                                                        <LucideCalendar className="w-3.5 h-3.5" />
                                                                        <span>{dateStr}</span>
                                                                    </span>
                                                                    <span className="flex items-center space-x-1">
                                                                        <LucideClock className="w-3.5 h-3.5" />
                                                                        <span>{appt.appointment_time?.substring(0, 5) || '--:--'}</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${statusCfg.bg} ${statusCfg.text}`}>
                                                            {appt.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <EntityTasks entityType="patient" entityId={patientId} entityPhone={patient.phone} />
                        )}

                        {activeTab === 'timeline' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900">Línea de Tiempo</h3>
                                    <span className="text-xs font-bold text-gray-400">{timelineEvents.length} eventos</span>
                                </div>

                                {timelineEvents.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                        <LucideHistory className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">No hay actividad registrada para este paciente.</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Vertical line */}
                                        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>

                                        <div className="space-y-4">
                                            {timelineEvents.map((event, idx) => {
                                                const EventIcon = event.icon
                                                const dateStr = event.date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                                const timeStr = event.date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                                                return (
                                                    <div key={`${event.type}-${idx}`} className="relative flex items-start space-x-4 pl-1">
                                                        {/* Icon on line */}
                                                        <div className={`relative z-10 p-2 rounded-xl ${event.color} shrink-0 ring-4 ring-white`}>
                                                            <EventIcon className="w-4 h-4" />
                                                        </div>
                                                        {/* Card */}
                                                        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">{event.title}</p>
                                                                    <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>
                                                                </div>
                                                                <span className="text-[10px] font-medium text-gray-400 shrink-0 ml-3">
                                                                    {dateStr} · {timeStr}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
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
                                        {deals.filter(d => getDealResolutionType(d) === 'open').length}
                                    </span>
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    Oportunidades Ganadas: <span className="text-emerald-600">
                                        {deals.filter(d => getDealResolutionType(d) === 'won').length}
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
