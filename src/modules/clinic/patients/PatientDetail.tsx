import React, { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { EntityTasks } from '../../../components/tasks/EntityTasks'
import { useClinicTags, useEntityTags, useAddEntityTag, useRemoveEntityTag } from '../../../hooks/useClinicTags'
import {
    LucideX,
    LucidePhone,
    LucideMail,
    LucidePlus,
    LucideTag,
    LucideCalendar,
    LucideHistory,
    LucideStethoscope,
    LucideClock,
    LucideCheckCircle2,
    LucideBriefcase,
    LucideFiles,
    LucideChevronLeft,
    LucideLoader2,
    LucideGlobe,
    LucideHeart,
    LucideUserCheck,
    LucidePencil,
    LucideCheckSquare,
    LucideArrowRight,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────
   PatientDetail — Full-page 3-column layout
   Left:   Contact card + patient info (inline editable)
   Center: Tabbed content (Citas, Deals, Tasks, Timeline, Files)
   Right:  Summary, Assignee, Tags
   ────────────────────────────────────────────────────────────── */

const APPT_STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
    'Por Confirmar': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    'Confirmada': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    'En Sala': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    'Completada': { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600' },
    'Cancelada': { bg: 'bg-red-50 border-red-200', text: 'text-red-600' },
    'No Asistió': { bg: 'bg-red-50 border-red-200', text: 'text-red-600' },
}

export const PatientDetail = () => {
    const { id: patientId } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    const goBack = () => navigate('/pacientes')

    /* ── Data ────────────────────────────────────────── */
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('patients').select('*').eq('id', patientId!).single()
            if (error) throw error
            return data
        },
        enabled: !!patientId,
    })

    const { data: deals = [] } = useQuery({
        queryKey: ['deals', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('deals').select('*').eq('patient_id', patientId!)
            if (error) throw error
            return data
        },
        enabled: !!patientId,
    })

    const { data: dealStages = [] } = useQuery({
        queryKey: ['pipeline_stages', clinicaId, 'deals'],
        queryFn: async () => {
            if (!clinicaId) return []
            const { data, error } = await supabase.from('pipeline_stages')
                .select('*').eq('clinica_id', clinicaId).eq('board_type', 'deals').is('is_archived', false).order('sort_order', { ascending: true })
            if (error) throw error
            return data
        },
        enabled: !!clinicaId,
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['patient_appointments', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('appointments')
                .select('*').eq('patient_id', patientId!).order('appointment_date', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!patientId,
    })

    const { data: completedTasks = [] } = useQuery({
        queryKey: ['patient_completed_tasks', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('crm_tasks')
                .select('*').eq('patient_id', patientId!).eq('is_completed', true)
                .order('completed_at', { ascending: false }).limit(50)
            if (error) throw error
            return data
        },
        enabled: !!patientId,
    })

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team_members', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name, avatar_url').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId,
    })

    /* ── Local state ────────────────────────────────── */
    const [activeTab, setActiveTab] = useState('appointments')
    const [savingField, setSavingField] = useState('')
    const [showNewDeal, setShowNewDeal] = useState(false)
    const [dealTitle, setDealTitle] = useState('')
    const [dealValue, setDealValue] = useState(0)

    // Structured tags
    const { data: clinicTags = [] } = useClinicTags()
    const { data: entityTags = [] } = useEntityTags('patient', patientId)
    const addEntityTag = useAddEntityTag()
    const removeEntityTag = useRemoveEntityTag()

    /* ── Mutations ──────────────────────────────────── */
    const updateField = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const { error } = await supabase.from('patients').update(updates).eq('id', patientId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            queryClient.invalidateQueries({ queryKey: ['patients-admin'] })
            queryClient.invalidateQueries({ queryKey: ['patients-admin-table'] })
            setSavingField('')
        },
    })

    const handleFieldChange = useCallback((field: string, value: unknown) => {
        setSavingField(field)
        updateField.mutate({ [field]: value })
    }, [updateField])

    const addDealMut = useMutation({
        mutationFn: async (deal: any) => {
            const { error } = await supabase.from('deals').insert([{ ...deal, patient_id: patientId }])
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', patientId] }),
    })

    const updateDealMut = useMutation({
        mutationFn: async ({ id, stage_id }: { id: string, stage_id: string }) => {
            const targetStage = dealStages.find((s: any) => s.id === stage_id)
            const updatePayload: any = { stage_id }
            if (targetStage?.resolution_type === 'won') {
                updatePayload.status = 'Ganado'; updatePayload.closed_at = new Date().toISOString()
            } else if (targetStage?.resolution_type === 'lost') {
                updatePayload.status = 'Perdido'; updatePayload.closed_at = new Date().toISOString()
            } else {
                updatePayload.status = targetStage?.name || 'En Progreso'; updatePayload.closed_at = null
            }
            const { error } = await supabase.from('deals').update(updatePayload).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', patientId] }),
    })

    const handleAddDeal = () => {
        if (!dealTitle) return
        const defaultStage = dealStages.find((s: any) => s.is_default) || dealStages[0]
        addDealMut.mutate({ title: dealTitle, estimated_value: Number(dealValue), status: defaultStage?.name || 'Nuevo', stage_id: defaultStage?.id || null })
        setShowNewDeal(false); setDealTitle(''); setDealValue(0)
    }



    if (!patient) {
        return (
            <div className="h-full flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-clinical-400 animate-spin" />
            </div>
        )
    }

    const assignee = teamMembers.find((m: any) => m.id === patient.assigned_to)
    const getDealResolutionType = (deal: any) => {
        const stage = dealStages.find((s: any) => s.id === deal.stage_id)
        return stage ? stage.resolution_type : 'open'
    }

    // Timeline
    const timelineEvents = [
        ...appointments.map((a: any) => ({
            type: 'appointment' as const,
            date: new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`),
            title: a.service_name || a.specialty || 'Cita médica',
            subtitle: `Dr. ${a.doctor_name} · ${a.status}`,
            icon: LucideStethoscope, color: 'text-blue-600 bg-blue-100',
        })),
        ...completedTasks.map((t: any) => ({
            type: 'task' as const,
            date: new Date(t.completed_at || t.created_at),
            title: t.title,
            subtitle: `Tarea completada · ${t.task_type || 'otro'}`,
            icon: LucideCheckCircle2, color: 'text-emerald-600 bg-emerald-100',
        })),
        ...deals.map((d: any) => ({
            type: 'deal' as const,
            date: new Date(d.created_at),
            title: d.title,
            subtitle: `Oportunidad · $${Number(d.estimated_value).toLocaleString()} · ${d.status}`,
            icon: LucideBriefcase, color: 'text-violet-600 bg-violet-100',
        })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime())

    const tabs = [
        { id: 'appointments', name: 'Citas', icon: LucideStethoscope },
        { id: 'deals', name: 'Oportunidades', icon: LucideBriefcase },
        { id: 'tasks', name: 'Tareas', icon: LucideCheckSquare },
        { id: 'timeline', name: 'Timeline', icon: LucideHistory },
        { id: 'files', name: 'Archivos', icon: LucideFiles },
    ]

    /* ================================================================ */
    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* ── Top Bar ── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
                    <LucideChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Volver a Pacientes</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-clinical-50 text-clinical-600 border border-clinical-100">
                        {patient.status || 'Activo'}
                    </span>
                    <span className="text-xs text-gray-400">ID: {patientId?.substring(0, 8)}...</span>
                </div>
            </div>

            {/* ── 3-Column Layout ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ═══════════════════ LEFT COLUMN ═══════════════════ */}
                <div className="w-80 border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto bg-white">
                    {/* Contact Card */}
                    <div className="flex flex-col items-center px-8 py-8 border-b border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-clinical-100 to-clinical-200 flex items-center justify-center text-clinical-700 text-3xl font-bold shadow-lg mb-4 ring-4 ring-clinical-50">
                            {patient.name?.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 text-center">{patient.name}</h2>

                        {/* Tags under name */}
                        <div className="flex flex-wrap gap-1 mt-2 justify-center">
                            {entityTags.map((et: any) => (
                                <span key={et.id} className="text-[10px] font-medium text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: et.clinic_tag?.color || '#6b7280' }}>
                                    {et.clinic_tag?.name || '?'}
                                </span>
                            ))}
                        </div>

                        {patient.created_at && (
                            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
                                <LucideClock className="w-3 h-3" />
                                Paciente desde: {new Date(patient.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>

                    {/* Editable Fields */}
                    <div className="px-6 py-5 space-y-4 flex-1">
                        <Field label="Teléfono" icon={LucidePhone}>
                            <EditableText value={patient.phone || ''} field="phone" saving={savingField} onSave={handleFieldChange} />
                        </Field>
                        <Field label="Email" icon={LucideMail}>
                            <EditableText value={patient.email || ''} field="email" saving={savingField} onSave={handleFieldChange} />
                        </Field>
                        <Field label="Edad" icon={LucideUserCheck}>
                            <EditableText value={patient.age?.toString() || ''} field="age" saving={savingField} onSave={(f, v) => handleFieldChange(f, v ? parseInt(v) : null)} />
                        </Field>
                        <Field label="Estado" icon={LucideTag}>
                            <select
                                value={patient.status || 'Activo'}
                                onChange={(e) => handleFieldChange('status', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="Activo">Activo</option>
                                <option value="En tratamiento">En tratamiento</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                            {savingField === 'status' && <SavingIndicator />}
                        </Field>
                        <Field label="Última Visita" icon={LucideCalendar}>
                            <span className="text-sm text-gray-700 px-3 py-2">{patient.last_visit || 'Sin registros'}</span>
                        </Field>
                    </div>
                </div>

                {/* ═══════════════════ CENTER COLUMN ═══════════════════ */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
                    {/* Tabs */}
                    <div className="px-8 bg-white border-b border-gray-200 flex items-center gap-1 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3.5 px-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ── Appointments Tab ── */}
                        {activeTab === 'appointments' && (
                            <div className="max-w-2xl mx-auto p-8 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                        <LucideStethoscope className="w-5 h-5 text-blue-600" />
                                        Historial de Citas
                                    </h3>
                                    <span className="text-xs font-bold text-gray-400">{appointments.length} cita{appointments.length !== 1 ? 's' : ''}</span>
                                </div>
                                {appointments.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <LucideStethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay citas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {appointments.map((appt: any) => {
                                            const statusCfg = APPT_STATUS_CONFIG[appt.status] || APPT_STATUS_CONFIG['Por Confirmar']
                                            const dateStr = new Date(appt.appointment_date).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                            return (
                                                <div key={appt.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-blue-50 rounded-xl shrink-0 mt-0.5">
                                                                <LucideStethoscope className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{appt.service_name || appt.specialty || 'Consulta'}</p>
                                                                <p className="text-sm text-gray-500 mt-0.5">Dr. {appt.doctor_name}</p>
                                                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <LucideCalendar className="w-3.5 h-3.5" />{dateStr}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <LucideClock className="w-3.5 h-3.5" />{appt.appointment_time?.substring(0, 5) || '--:--'}
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

                        {/* ── Deals Tab ── */}
                        {activeTab === 'deals' && (
                            <div className="max-w-2xl mx-auto p-8 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                        <LucideBriefcase className="w-5 h-5 text-violet-600" />
                                        Oportunidades
                                    </h3>
                                    <button onClick={() => setShowNewDeal(!showNewDeal)} className="px-4 py-2 bg-clinical-600 text-white rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-clinical-700 transition-colors">
                                        <LucidePlus className="w-4 h-4" /> Nueva Oportunidad
                                    </button>
                                </div>
                                {showNewDeal && (
                                    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
                                        <input type="text" placeholder="Nombre del servicio (Ej. Diseño de Sonrisa)" value={dealTitle} onChange={e => setDealTitle(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none" />
                                        <input type="number" placeholder="Valor estimado ($)" value={dealValue || ''} onChange={e => setDealValue(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none" />
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setShowNewDeal(false)} className="px-4 py-2 text-gray-500 font-medium text-sm">Cancelar</button>
                                            <button onClick={handleAddDeal} disabled={!dealTitle.trim()} className="px-5 py-2 bg-clinical-600 text-white rounded-lg font-bold text-sm disabled:opacity-40">Guardar</button>
                                        </div>
                                    </div>
                                )}
                                {deals.length === 0 && !showNewDeal ? (
                                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <LucideBriefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">Sin oportunidades activas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {deals.map((deal: any) => (
                                            <div key={deal.id} className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{deal.title}</h4>
                                                    <p className="text-xs text-gray-400 mt-1">Creado: {new Date(deal.created_at).toLocaleDateString()}</p>
                                                    <p className="text-sm font-semibold text-clinical-600 mt-1">${Number(deal.estimated_value).toLocaleString()}</p>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fase</label>
                                                    <select value={deal.stage_id || ''} onChange={e => updateDealMut.mutate({ id: deal.id, stage_id: e.target.value })}
                                                        className="block w-full border border-gray-200 rounded-lg text-sm bg-gray-50 font-medium p-2 outline-none cursor-pointer focus:ring-2 focus:ring-clinical-500">
                                                        {dealStages.map((s: any) => (
                                                            <option key={s.id} value={s.id}>{s.name}{s.resolution_type === 'won' ? ' ✓' : s.resolution_type === 'lost' ? ' ✗' : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tasks Tab ── */}
                        {activeTab === 'tasks' && (
                            <div className="p-8">
                                <EntityTasks entityType="patient" entityId={patientId!} entityPhone={patient.phone} />
                            </div>
                        )}

                        {/* ── Timeline Tab ── */}
                        {activeTab === 'timeline' && (
                            <div className="max-w-2xl mx-auto p-8 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                        <LucideHistory className="w-5 h-5 text-gray-600" />
                                        Línea de Tiempo
                                    </h3>
                                    <span className="text-xs font-bold text-gray-400">{timelineEvents.length} eventos</span>
                                </div>
                                {timelineEvents.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <LucideHistory className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay actividad registrada</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>
                                        <div className="space-y-4">
                                            {timelineEvents.map((event, idx) => {
                                                const EventIcon = event.icon
                                                return (
                                                    <div key={`${event.type}-${idx}`} className="relative flex items-start gap-4 pl-1">
                                                        <div className={`relative z-10 p-2 rounded-xl ${event.color} shrink-0 ring-4 ring-gray-50`}>
                                                            <EventIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">{event.title}</p>
                                                                    <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>
                                                                </div>
                                                                <span className="text-[10px] font-medium text-gray-400 shrink-0 ml-3">
                                                                    {event.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                        {/* ── Files Tab ── */}
                        {activeTab === 'files' && (
                            <div className="max-w-2xl mx-auto p-8">
                                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                    <LucideFiles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-medium">Archivos y Material</p>
                                    <p className="text-xs text-gray-300 mt-1">Próximamente podrá subir y gestionar archivos del paciente</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════ RIGHT COLUMN ═══════════════════ */}
                <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
                    <div className="px-6 py-6 space-y-6 flex-1">

                        {/* Summary */}
                        <div>
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resumen de Valor</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Oportunidades abiertas</span>
                                    <span className="text-sm font-bold text-clinical-700">{deals.filter(d => getDealResolutionType(d) === 'open').length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Ganadas</span>
                                    <span className="text-sm font-bold text-emerald-600">{deals.filter(d => getDealResolutionType(d) === 'won').length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Valor total ganado</span>
                                    <span className="text-sm font-bold text-emerald-600">
                                        ${deals.filter(d => getDealResolutionType(d) === 'won').reduce((sum: number, d: any) => sum + Number(d.estimated_value || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Citas totales</span>
                                    <span className="text-sm font-bold text-blue-600">{appointments.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Assigned To */}
                        <div>
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Asignado a</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={assignee?.avatar_url || `https://ui-avatars.com/api/?name=${assignee?.name || 'NA'}&size=40`}
                                        className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
                                        alt=""
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{assignee?.name || 'Sin asignar'}</p>
                                    </div>
                                </div>
                                <select
                                    value={patient.assigned_to || ''}
                                    onChange={(e) => handleFieldChange('assigned_to', e.target.value || null)}
                                    className="w-full mt-3 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                >
                                    <option value="">Sin asignar</option>
                                    {teamMembers.map((m: any) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                {savingField === 'assigned_to' && <SavingIndicator />}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Etiquetas</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {entityTags.length === 0 && <span className="text-xs text-gray-400 italic">Sin etiquetas</span>}
                                    {entityTags.map((et: any) => (
                                        <span
                                            key={et.id}
                                            className="group text-xs font-medium text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                                            style={{ backgroundColor: et.clinic_tag?.color || '#6b7280' }}
                                        >
                                            {et.clinic_tag?.name || '?'}
                                            <button
                                                onClick={() => removeEntityTag.mutate({ id: et.id, entityType: 'patient', entityId: patientId! })}
                                                className="opacity-60 hover:opacity-100 transition-opacity"
                                            >×</button>
                                        </span>
                                    ))}
                                </div>
                                {clinicTags.filter(t => !entityTags.some((et: any) => et.tag_id === t.id)).length > 0 && (
                                    <select
                                        value=""
                                        onChange={e => {
                                            if (e.target.value) addEntityTag.mutate({ tagId: e.target.value, entityType: 'patient', entityId: patientId! })
                                        }}
                                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                    >
                                        <option value="">+ Agregar etiqueta...</option>
                                        {clinicTags.filter(t => !entityTags.some((et: any) => et.tag_id === t.id)).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Reusable Subcomponents ────────────────────────────────── */

const Field = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {label}
        </label>
        {children}
    </div>
)

const EditableText = ({ value, field, saving, onSave }: { value: string, field: string, saving: string, onSave: (field: string, value: string) => void }) => {
    const [editing, setEditing] = useState(false)
    const [localVal, setLocalVal] = useState(value)

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    autoFocus
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    className="flex-1 text-sm border border-clinical-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-clinical-500 outline-none"
                    onKeyDown={e => {
                        if (e.key === 'Enter') { onSave(field, localVal); setEditing(false) }
                        if (e.key === 'Escape') { setLocalVal(value); setEditing(false) }
                    }}
                    onBlur={() => { if (localVal !== value) onSave(field, localVal); setEditing(false) }}
                />
            </div>
        )
    }
    return (
        <div
            onClick={() => { setLocalVal(value); setEditing(true) }}
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 border border-transparent hover:border-gray-200 transition-all flex items-center justify-between group"
        >
            <span className={value ? '' : 'text-gray-400 italic'}>{value || 'Sin definir'}</span>
            <LucidePencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            {saving === field && <SavingIndicator />}
        </div>
    )
}

const SavingIndicator = () => (
    <LucideLoader2 className="w-3 h-3 text-clinical-500 animate-spin ml-1" />
)
