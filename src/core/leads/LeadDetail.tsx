import React, { useState, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { EntityTasks } from '../../components/tasks/EntityTasks'
import {
    LucideX,
    LucideUser,
    LucidePhone,
    LucideMail,
    LucideCheckSquare,
    LucideMessageSquare,
    LucideSend,
    LucidePlus,
    LucideClock,
    LucideArrowRight,
    LucideCheckCircle2,
    LucideChevronLeft,
    LucideActivity,
    LucideStickyNote,
    LucidePhoneCall,
    LucideCalendar,
    LucideMapPin,
    LucideGlobe,
    LucideTag,
    LucideConstruction,
    LucideLoader2,
    LucideExternalLink,
    LucidePencil,
    LucideSave,
    LucideHeart,
    LucideUserCheck,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────
   LeadDetail — Kirrivin-inspired 3-column layout
   Left:   Contact card + lead info fields
   Center: Tabbed content (Activity, Notes, Emails, Calls, Tasks)
   Right:  Service, Deals, Assignee, Resolution
   ────────────────────────────────────────────────────────────── */

export const LeadDetail = ({ leadId, onClose }: { leadId: string, onClose: () => void }) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()

    /* ── Data ────────────────────────────────────────────── */
    const { data: lead } = useQuery({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single()
            if (error) throw error
            return data
        }
    })

    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('*').eq('clinica_id', currentUser!.clinica_id).order('position')
            return data || []
        },
        enabled: !!currentUser?.clinica_id
    })

    const { data: substages = [] } = useQuery({
        queryKey: ['pipeline_substages', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_substages')
                .select('*, pipeline_stages!inner(clinica_id)')
                .eq('pipeline_stages.clinica_id', currentUser!.clinica_id)
            return data || []
        },
        enabled: !!currentUser?.clinica_id
    })

    const { data: services = [] } = useQuery({
        queryKey: ['services_list', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('services').select('id, name').eq('clinica_id', currentUser!.clinica_id)
            return data || []
        },
        enabled: !!currentUser?.clinica_id
    })

    const { data: history = [] } = useQuery({
        queryKey: ['lead_history', leadId],
        queryFn: async () => {
            const { data, error } = await supabase.from('pipeline_history_log')
                .select(`
                    id,
                    changed_at,
                    changed_by,
                    from_substage:pipeline_substages!from_substage_id(name),
                    to_substage:pipeline_substages!to_substage_id(name),
                    from_stage:pipeline_stages!from_stage_id(name),
                    to_stage:pipeline_stages!to_stage_id(name)
                `)
                .eq('lead_id', leadId)
                .order('changed_at', { ascending: false })
            if (error) throw error
            return data
        }
    })

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team_members', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name, avatar_url').eq('clinica_id', currentUser!.clinica_id)
            return data || []
        },
        enabled: !!currentUser?.clinica_id
    })

    /* ── Local state ────────────────────────────────────── */
    const [activeTab, setActiveTab] = useState('activity')
    const [leftTab, setLeftTab] = useState('info')
    const [showWonModal, setShowWonModal] = useState(false)
    const [showLostModal, setShowLostModal] = useState(false)
    const [resolutionData, setResolutionData] = useState({ sale_value: '', lost_reason: '' })
    const [noteTitle, setNoteTitle] = useState('')
    const [noteContent, setNoteContent] = useState('')
    const [savingField, setSavingField] = useState('')

    /* ── Mutations ──────────────────────────────────────── */
    const updateField = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            setSavingField('')
        }
    })

    const resolveLeadMutation = useMutation({
        mutationFn: async ({ stage_id, data }: { stage_id: string, data: any }) => {
            const { error } = await supabase.from('leads').update({
                stage_id,
                substage_id: null,
                closed_at: new Date().toISOString(),
                ...data
            }).eq('id', leadId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            setShowWonModal(false)
            setShowLostModal(false)
        }
    })

    const handleFieldChange = useCallback((field: string, value: unknown) => {
        setSavingField(field)
        updateField.mutate({ [field]: value })
    }, [updateField])

    if (!lead) return null

    const currentStage = stages.find((s: any) => s.id === lead.stage_id)
    const currentSubstage = substages.find((s: any) => s.id === lead.substage_id)
    const assignee = teamMembers.find((m: any) => m.id === lead.assigned_to)
    const activeStages = stages.filter((s: any) => !s.resolution_type)

    /* ── Center Tabs ────────────────────────────────────── */
    const tabs = [
        { id: 'activity', name: 'Actividad', icon: LucideActivity },
        { id: 'notes', name: 'Notas', icon: LucideStickyNote },
        { id: 'emails', name: 'Correos', icon: LucideMail },
        { id: 'calls', name: 'Llamadas', icon: LucidePhoneCall },
        { id: 'tasks', name: 'Tareas', icon: LucideCheckSquare },
    ]

    /* ================================================================ */
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2">
            <div className="bg-white w-full max-w-[1440px] h-[92vh] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* ═══════════════════ LEFT COLUMN ═══════════════════ */}
                <div className="w-72 border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto bg-white">
                    {/* Back + Close */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                        <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                            <LucideChevronLeft className="w-4 h-4" />
                            <span>Volver a Leads</span>
                        </button>
                    </div>

                    {/* Contact Card */}
                    <div className="flex flex-col items-center px-6 py-6 border-b border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-clinical-100 to-clinical-200 flex items-center justify-center text-clinical-700 text-2xl font-bold shadow-md mb-3">
                            {lead.name?.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 text-center">{lead.name}</h2>
                        {lead.source && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <LucideGlobe className="w-3 h-3" />
                                {lead.source}
                            </span>
                        )}
                        {/* Quick Actions */}
                        <div className="flex items-center gap-3 mt-4">
                            {[
                                { icon: LucideStickyNote, label: 'Nota', action: () => setActiveTab('notes') },
                                { icon: LucideMail, label: 'Email', action: () => setActiveTab('emails') },
                                { icon: LucidePhoneCall, label: 'Llamar', action: () => setActiveTab('calls') },
                            ].map((btn, i) => (
                                <button key={i} onClick={btn.action} className="flex flex-col items-center group">
                                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-clinical-50 group-hover:border-clinical-200 transition-colors">
                                        <btn.icon className="w-4 h-4 text-gray-500 group-hover:text-clinical-600 transition-colors" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1">{btn.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Convert to Patient */}
                        <button className="mt-4 w-full py-2 bg-clinical-600 text-white text-sm font-semibold rounded-xl hover:bg-clinical-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                            <LucideUserCheck className="w-4 h-4" />
                            Convertir a Paciente
                        </button>

                        {lead.created_at && (
                            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                                <LucideClock className="w-3 h-3" />
                                Creado: {new Date(lead.created_at).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex border-b border-gray-100">
                        {['info', 'address'].map(t => (
                            <button
                                key={t}
                                onClick={() => setLeftTab(t)}
                                className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${leftTab === t ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t === 'info' ? 'Info del Lead' : 'Dirección'}
                            </button>
                        ))}
                    </div>

                    {/* Lead Info Fields */}
                    <div className="px-5 py-4 space-y-3.5 flex-1">
                        {leftTab === 'info' && (<>
                            <Field label="Email" icon={LucideMail}>
                                <EditableText value={lead.email || ''} field="email" saving={savingField} onSave={handleFieldChange} />
                            </Field>
                            <Field label="Teléfono" icon={LucidePhone}>
                                <EditableText value={lead.phone || ''} field="phone" saving={savingField} onSave={handleFieldChange} />
                            </Field>
                            <Field label="Estado (Etapa)" icon={LucideTag}>
                                <select
                                    value={lead.stage_id || ''}
                                    onChange={(e) => handleFieldChange('stage_id', e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                >
                                    {activeStages.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {savingField === 'stage_id' && <SavingIndicator />}
                            </Field>
                            <Field label="Sub-estado" icon={LucideTag}>
                                <select
                                    value={lead.substage_id || ''}
                                    onChange={(e) => handleFieldChange('substage_id', e.target.value || null)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                >
                                    <option value="">Sin sub-estado</option>
                                    {substages.filter((ss: any) => ss.stage_id === lead.stage_id).map((ss: any) => (
                                        <option key={ss.id} value={ss.id}>{ss.name}</option>
                                    ))}
                                </select>
                                {savingField === 'substage_id' && <SavingIndicator />}
                            </Field>
                            <Field label="Servicio / Tratamiento" icon={LucideHeart}>
                                <select
                                    value={lead.service || ''}
                                    onChange={(e) => handleFieldChange('service', e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                >
                                    <option value="">Sin servicio</option>
                                    {services.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                {savingField === 'service' && <SavingIndicator />}
                            </Field>
                            <Field label="Fuente" icon={LucideGlobe}>
                                <EditableText value={lead.source || ''} field="source" saving={savingField} onSave={handleFieldChange} />
                            </Field>
                        </>)}
                        {leftTab === 'address' && (
                            <div className="text-center py-8 text-gray-400">
                                <LucideMapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Sin dirección registrada</p>
                                <p className="text-xs mt-1">Próximamente podrá agregar dirección</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════ CENTER COLUMN ═══════════════════ */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs */}
                    <div className="px-6 border-b border-gray-100 flex items-center gap-1 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3.5 px-4 flex items-center gap-1.5 text-sm font-medium border-b-2 transition-all ${
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
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* ── Activity Tab ── */}
                        {activeTab === 'activity' && (
                            <div className="max-w-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        <LucideActivity className="w-5 h-5 text-clinical-600" />
                                        Actividad Reciente
                                    </h3>
                                </div>

                                <div className="relative pl-6 space-y-6 border-l-2 border-gray-100 ml-2">
                                    {/* Creation event */}
                                    {lead.created_at && (
                                        <TimelineItem
                                            title="Lead creado"
                                            description={`Se registró a ${lead.name} como nuevo prospecto`}
                                            date={lead.created_at}
                                            color="emerald"
                                        />
                                    )}
                                    {history.length === 0 && !lead.created_at && (
                                        <div className="text-center py-10">
                                            <p className="text-sm text-gray-400 italic">No hay actividad registrada aún.</p>
                                        </div>
                                    )}
                                    {history.map((log: any) => (
                                        <div key={log.id} className="relative group">
                                            <div className="absolute -left-[29px] top-1.5 w-3 h-3 bg-white border-[2.5px] border-clinical-500 rounded-full group-hover:scale-125 transition-transform"></div>
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                                <div className="flex items-center gap-2 text-sm mb-2">
                                                    <span className="font-semibold text-gray-800">Cambio de etapa</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(log.changed_at).toLocaleDateString()} • {new Date(log.changed_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <span className="text-gray-500 line-through">
                                                        {log.from_stage?.name || 'Nuevo'} {log.from_substage?.name ? `(${log.from_substage.name})` : ''}
                                                    </span>
                                                    <LucideArrowRight className="w-3.5 h-3.5 text-clinical-400" />
                                                    <span className="text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded">
                                                        {log.to_stage?.name} {log.to_substage?.name ? `(${log.to_substage.name})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Notes Tab ── */}
                        {activeTab === 'notes' && (
                            <div className="max-w-2xl space-y-6">
                                <h3 className="font-bold text-gray-900">Agregar nueva nota</h3>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <input
                                        type="text"
                                        placeholder="Título de la nota"
                                        value={noteTitle}
                                        onChange={e => setNoteTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                                    />
                                    <textarea
                                        placeholder="Descripción de la nota..."
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none resize-none"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => { setNoteTitle(''); setNoteContent('') }}
                                            className="px-4 py-2 bg-clinical-600 text-white text-sm font-semibold rounded-lg hover:bg-clinical-700 transition-colors"
                                        >
                                            Agregar nota
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <h4 className="text-sm font-semibold text-gray-500 mb-4">Notas</h4>
                                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                        <LucideStickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay notas registradas</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Emails Tab (Coming Soon) ── */}
                        {activeTab === 'emails' && (
                            <ComingSoonPlaceholder icon={LucideMail} title="Correos Electrónicos" />
                        )}

                        {/* ── Calls Tab (Coming Soon) ── */}
                        {activeTab === 'calls' && (
                            <ComingSoonPlaceholder icon={LucidePhoneCall} title="Registro de Llamadas" />
                        )}

                        {/* ── Tasks Tab ── */}
                        {activeTab === 'tasks' && (
                            <EntityTasks entityType="lead" entityId={leadId} entityPhone={lead.phone} />
                        )}
                    </div>
                </div>

                {/* ═══════════════════ RIGHT COLUMN ═══════════════════ */}
                <div className="w-72 border-l border-gray-100 bg-gray-50/40 flex flex-col shrink-0 overflow-y-auto">
                    {/* Close button */}
                    <div className="px-4 py-3 flex justify-end border-b border-gray-100">
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                            <LucideX className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <div className="px-5 py-5 space-y-6 flex-1">
                        {/* Service */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Servicio de Interés</h4>
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                                {lead.service ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-clinical-50 flex items-center justify-center">
                                            <LucideHeart className="w-4 h-4 text-clinical-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{lead.service}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Sin servicio asignado</p>
                                )}
                            </div>
                        </div>

                        {/* Pipeline Status */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Estado del Pipeline</h4>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Etapa</span>
                                    <span className="text-xs font-bold text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded">
                                        {currentStage?.name || 'Sin etapa'}
                                    </span>
                                </div>
                                {currentSubstage && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Sub-etapa</span>
                                        <span className="text-xs font-medium text-gray-700">{currentSubstage.name}</span>
                                    </div>
                                )}
                                {lead.stage_entered_at && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Tiempo</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <LucideClock className="w-3 h-3" />
                                            {Math.floor((new Date().getTime() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60))}h
                                        </span>
                                    </div>
                                )}
                                {/* Progress bar */}
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-clinical-500 rounded-full transition-all"
                                        style={{
                                            width: `${activeStages.length > 0
                                                ? ((activeStages.findIndex((s: any) => s.id === lead.stage_id) + 1) / activeStages.length) * 100
                                                : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assigned To */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Asignado a</h4>
                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={assignee?.avatar_url || `https://ui-avatars.com/api/?name=${assignee?.name || 'NA'}&size=32`}
                                        className="w-8 h-8 rounded-full ring-2 ring-clinical-100"
                                        alt=""
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {assignee?.name || 'Sin asignar'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deals (placeholder) */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deals</h4>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                <p className="text-xs text-gray-400 italic">Sin deals vinculados</p>
                                <button className="mt-2 text-xs text-clinical-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
                                    <LucidePlus className="w-3 h-3" />
                                    Crear deal
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Resolution Buttons */}
                    <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                        {stages.filter((s: any) => s.resolution_type === 'won').map((s: any) => (
                            <button key={s.id} onClick={() => setShowWonModal(true)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all">
                                <LucideCheckCircle2 className="w-4 h-4" />
                                Ganado
                            </button>
                        ))}
                        {stages.filter((s: any) => s.resolution_type === 'lost').map((s: any) => (
                            <button key={s.id} onClick={() => setShowLostModal(true)} className="w-full py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all">
                                Descartar
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* ═══════════════════ MODALS ═══════════════════ */}
            {showWonModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <LucideCheckCircle2 className="w-6 h-6 text-emerald-500" /> Convertir a Ganado
                        </h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Monto de Venta (Opcional)</label>
                            <input type="number" placeholder="Ej. 150000" className="w-full px-4 py-2 border rounded-xl" value={resolutionData.sale_value} onChange={e => setResolutionData({...resolutionData, sale_value: e.target.value})} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowWonModal(false)} className="flex-1 px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">Cancelar</button>
                            <button onClick={() => resolveLeadMutation.mutate({ stage_id: stages.find((s:any) => s.resolution_type === 'won')?.id || '', data: { sale_value: resolutionData.sale_value ? parseFloat(resolutionData.sale_value) : null } })} className="flex-1 px-4 py-2 bg-emerald-600 font-bold text-white rounded-xl hover:bg-emerald-700">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {showLostModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <LucideX className="w-6 h-6 text-red-500" /> Marcar como Perdido
                        </h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Motivo de Descarte</label>
                            <select className="w-full px-4 py-2 border rounded-xl bg-white" value={resolutionData.lost_reason} onChange={e => setResolutionData({...resolutionData, lost_reason: e.target.value})}>
                                <option value="">-- Selecciona un motivo --</option>
                                <option value="Muy Caro">Muy Caro (Precio)</option>
                                <option value="No Responde">No responde / Inubicable</option>
                                <option value="Ya se opero">Ya se operó / Trató en otro sitio</option>
                                <option value="Baja prioridad">Baja Prioridad / Solo curioseaba</option>
                                <option value="Otro">Otro Motivo</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLostModal(false)} className="flex-1 px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">Cancelar</button>
                            <button onClick={() => resolveLeadMutation.mutate({ stage_id: stages.find((s:any) => s.resolution_type === 'lost')?.id || '', data: { lost_reason: resolutionData.lost_reason } })} disabled={!resolutionData.lost_reason} className="flex-1 px-4 py-2 bg-red-600 font-bold text-white rounded-xl hover:bg-red-700 disabled:opacity-50">Descartar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Reusable Subcomponents ────────────────────────────────── */

const Field = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
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
                    className="flex-1 text-sm border border-clinical-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-clinical-500 outline-none"
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
            className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded-lg px-2.5 py-1.5 border border-transparent hover:border-gray-200 transition-all flex items-center justify-between group"
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

const TimelineItem = ({ title, description, date, color = 'clinical' }: { title: string, description: string, date: string, color?: string }) => (
    <div className="relative">
        <div className={`absolute -left-[29px] top-1.5 w-3 h-3 bg-white border-[2.5px] ${color === 'emerald' ? 'border-emerald-500' : 'border-clinical-500'} rounded-full`}></div>
        <div className="pb-2">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">{title}</span>
                <span className="text-[10px] text-gray-400">
                    {new Date(date).toLocaleDateString()} • {new Date(date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
    </div>
)

const ComingSoonPlaceholder = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <LucideConstruction className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-400">🚧 Muy Pronto — En Construcción</p>
        <p className="text-xs text-gray-300 mt-2">Esta funcionalidad estará disponible próximamente</p>
    </div>
)
