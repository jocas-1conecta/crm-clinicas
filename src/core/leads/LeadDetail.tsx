import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { EntityTasks } from '../../components/tasks/EntityTasks'
import { useClinicTags, useEntityTags, useAddEntityTag, useRemoveEntityTag } from '../../hooks/useClinicTags'
import { useChatByPhone, useChatMessages, useSendMessage, useChatRealtime, useCreateNewConversation } from '../chat/useTimelinesAI'
import { PhoneInput } from '../../components/PhoneInput'
import {
    LucideX,
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
    LucideMapPin,
    LucideGlobe,
    LucideTag,
    LucideConstruction,
    LucideLoader2,
    LucidePencil,
    LucideHeart,
    LucideUserCheck,
    LucideMessageCircle,
    LucideTrash2,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────
   LeadDetail — Full-page 3-column layout
   Left:   Contact card + lead info fields
   Center: Tabbed content (Activity, Notes, WhatsApp, Tasks, etc.)
   Right:  Service, Pipeline, Assignee, Deals, Resolution
   ────────────────────────────────────────────────────────────── */

export const LeadDetail = () => {
    const { id: leadId } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { currentUser } = useStore()
    const queryClient = useQueryClient()

    const goBack = () => navigate('/leads')

    /* ── Data ────────────────────────────────────────────── */
    const { data: lead } = useQuery({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const { data, error } = await supabase.from('leads').select('id, name, phone, email, status, source, service, stage_id, substage_id, stage_entered_at, assigned_to, sucursal_id, is_converted, converted_at, closed_at, sale_value, lost_reason, created_at').eq('id', leadId!).single()
            if (error) throw error
            return data
        },
        enabled: !!leadId
    })

    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages_leads', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('id, name, color, sort_order, is_default, is_archived, resolution_type, clinica_id, board_type').eq('clinica_id', currentUser!.clinica_id).eq('board_type', 'leads').order('sort_order')
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
                .eq('lead_id', leadId!)
                .order('changed_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!leadId
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

    // Notes stored in localStorage (no DB table yet)
    const notesKey = `lead_notes_${leadId}`
    const [notes, setNotes] = useState<Array<{ id: string, title: string, content: string, created_at: string }>>([])
    useEffect(() => {
        try { const raw = localStorage.getItem(notesKey); if (raw) setNotes(JSON.parse(raw)) } catch { /* skip */ }
    }, [notesKey])
    const saveNote = () => {
        if (!noteTitle.trim() && !noteContent.trim()) return
        const newNote = { id: Date.now().toString(), title: noteTitle.trim(), content: noteContent.trim(), created_at: new Date().toISOString() }
        const updated = [newNote, ...notes]
        setNotes(updated)
        localStorage.setItem(notesKey, JSON.stringify(updated))
        setNoteTitle(''); setNoteContent('')
    }
    const deleteNote = (id: string) => {
        const updated = notes.filter(n => n.id !== id)
        setNotes(updated)
        localStorage.setItem(notesKey, JSON.stringify(updated))
    }

    /* ── Mutations ──────────────────────────────────────── */
    const updateField = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const { error } = await supabase.from('leads').update(updates).eq('id', leadId!)
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
            }).eq('id', leadId!)
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

    // ── Convert to Patient ──
    const convertToPatientMutation = useMutation({
        mutationFn: async () => {
            if (!lead) throw new Error('Lead not loaded')
            // Create patient linked to original lead
            const { error: insertError } = await supabase.from('patients').insert([{
                name: lead.name,
                status: 'Activo',
                assigned_to: lead.assigned_to,
                sucursal_id: lead.sucursal_id,
                email: lead.email,
                phone: lead.phone,
                converted_from_lead_id: leadId,
            }])
            if (insertError) throw insertError

            // Mark lead as converted (don't delete — preserves history for reports)
            const { error: updateError } = await supabase.from('leads').update({
                is_converted: true,
                converted_at: new Date().toISOString(),
            }).eq('id', leadId!)
            if (updateError) throw updateError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            navigate('/leads')
        }
    })

    if (!lead) {
        return (
            <div className="h-full flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-clinical-400 animate-spin" />
            </div>
        )
    }

    const currentStage = stages.find((s: any) => s.id === lead.stage_id)
    const currentSubstage = substages.find((s: any) => s.id === lead.substage_id)
    const assignee = teamMembers.find((m: any) => m.id === lead.assigned_to)
    const activeStages = stages.filter((s: any) => !s.resolution_type)

    /* ── Center Tabs ────────────────────────────────────── */
    const tabs = [
        { id: 'activity', name: 'Actividad', icon: LucideActivity },
        { id: 'notes', name: 'Notas', icon: LucideStickyNote },
        { id: 'whatsapp', name: 'WhatsApp', icon: LucideMessageCircle },
        { id: 'tasks', name: 'Tareas', icon: LucideCheckSquare },
        { id: 'emails', name: 'Correos', icon: LucideMail },
        { id: 'calls', name: 'Llamadas', icon: LucidePhoneCall },
    ]

    /* ================================================================ */
    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* ── Top Bar ── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
                    <LucideChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Volver a Leads</span>
                </button>
                <div className="flex items-center gap-3">
                    {currentStage && (
                        <span
                            className="text-xs font-bold px-3 py-1 rounded-lg"
                            style={{ backgroundColor: (currentStage as any).color + '18', color: (currentStage as any).color }}
                        >
                            {currentStage.name}
                        </span>
                    )}
                    <span className="text-xs text-gray-400">
                        ID: {leadId?.substring(0, 8)}...
                    </span>
                </div>
            </div>

            {/* ── 3-Column Layout ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ═══════════════════ LEFT COLUMN ═══════════════════ */}
                <div className="w-80 border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto bg-white">
                    {/* Contact Card */}
                    <div className="flex flex-col items-center px-8 py-8 border-b border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-clinical-100 to-clinical-200 flex items-center justify-center text-clinical-700 text-3xl font-bold shadow-lg mb-4 ring-4 ring-clinical-50">
                            {lead.name?.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 text-center">{lead.name}</h2>
                        {lead.source && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                                <LucideGlobe className="w-3 h-3" />
                                {lead.source}
                            </span>
                        )}
                        {/* Quick Actions */}
                        <div className="flex items-center gap-4 mt-5">
                            {[
                                { icon: LucideStickyNote, label: 'Nota', action: () => setActiveTab('notes') },
                                { icon: LucideMessageCircle, label: 'WhatsApp', action: () => setActiveTab('whatsapp') },
                                { icon: LucidePhoneCall, label: 'Llamar', action: () => setActiveTab('calls') },
                                { icon: LucideMail, label: 'Email', action: () => setActiveTab('emails') },
                            ].map((btn, i) => (
                                <button key={i} onClick={btn.action} className="flex flex-col items-center group">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-clinical-50 group-hover:border-clinical-200 group-hover:shadow-sm transition-all">
                                        <btn.icon className="w-4 h-4 text-gray-500 group-hover:text-clinical-600 transition-colors" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1.5 group-hover:text-clinical-600 transition-colors">{btn.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Convert to Patient */}
                        {lead.is_converted ? (
                            <div className="mt-5 w-full py-2.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border border-emerald-200">
                                <LucideUserCheck className="w-4 h-4" />
                                Ya convertido a Paciente
                            </div>
                        ) : (
                            <button
                                onClick={() => { if (confirm('¿Convertir este lead a paciente? El lead se marcará como convertido y su historial se preservará para reportes.')) convertToPatientMutation.mutate() }}
                                disabled={convertToPatientMutation.isPending}
                                className="mt-5 w-full py-2.5 bg-clinical-600 text-white text-sm font-semibold rounded-xl hover:bg-clinical-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                                {convertToPatientMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideUserCheck className="w-4 h-4" />}
                                Convertir a Paciente
                            </button>
                        )}

                        {lead.created_at && (
                            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
                                <LucideClock className="w-3 h-3" />
                                Creado: {new Date(lead.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex border-b border-gray-100">
                        {['info', 'address'].map(t => (
                            <button
                                key={t}
                                onClick={() => setLeftTab(t)}
                                className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${leftTab === t ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t === 'info' ? 'Info del Lead' : 'Dirección'}
                            </button>
                        ))}
                    </div>

                    {/* Lead Info Fields */}
                    <div className="px-6 py-5 space-y-4 flex-1">
                        {leftTab === 'info' && (<>
                            <Field label="Email" icon={LucideMail}>
                                <EditableText value={lead.email || ''} field="email" saving={savingField} onSave={handleFieldChange} />
                            </Field>
                            <Field label="Teléfono" icon={LucidePhone}>
                                <PhoneInput
                                    value={lead.phone || ''}
                                    onChange={() => {}}
                                    onBlur={(v) => { if (v !== (lead.phone || '')) handleFieldChange('phone', v) }}
                                    size="sm"
                                    id="lead-phone"
                                />
                                {savingField === 'phone' && <SavingIndicator />}
                            </Field>
                            <Field label="Estado (Etapa)" icon={LucideTag}>
                                <select
                                    value={lead.stage_id || ''}
                                    onChange={(e) => handleFieldChange('stage_id', e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer hover:border-gray-300 transition-colors"
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
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer hover:border-gray-300 transition-colors"
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
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer hover:border-gray-300 transition-colors"
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
                            <div className="text-center py-10 text-gray-400">
                                <LucideMapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Sin dirección registrada</p>
                                <p className="text-xs mt-1 text-gray-300">Próximamente podrá agregar dirección</p>
                            </div>
                        )}
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
                                        ? tab.id === 'whatsapp'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-gray-900 text-gray-900'
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

                        {/* ── Activity Tab ── */}
                        {activeTab === 'activity' && (
                            <div className="max-w-2xl mx-auto p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        <LucideActivity className="w-5 h-5 text-clinical-600" />
                                        Actividad Reciente
                                    </h3>
                                </div>

                                <div className="relative pl-8 space-y-6 border-l-2 border-gray-200 ml-3">
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
                                        <div className="text-center py-12">
                                            <p className="text-sm text-gray-400 italic">No hay actividad registrada aún.</p>
                                        </div>
                                    )}
                                    {history.map((log: any) => (
                                        <div key={log.id} className="relative group">
                                            <div className="absolute -left-[33px] top-2 w-3.5 h-3.5 bg-white border-[2.5px] border-clinical-500 rounded-full group-hover:scale-125 transition-transform"></div>
                                            <div className="bg-white p-5 rounded-xl border border-gray-100 transition-all hover:shadow-sm">
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
                                                    <span className="text-clinical-700 bg-clinical-50 px-2.5 py-0.5 rounded-md">
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
                            <div className="max-w-2xl mx-auto p-8 space-y-6">
                                <h3 className="font-bold text-gray-900 text-lg">Agregar nueva nota</h3>
                                <div className="space-y-3 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <input
                                        type="text"
                                        placeholder="Título de la nota"
                                        value={noteTitle}
                                        onChange={e => setNoteTitle(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                                    />
                                    <textarea
                                        placeholder="Descripción de la nota..."
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none resize-none"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={saveNote}
                                            disabled={!noteTitle.trim() && !noteContent.trim()}
                                            className="px-5 py-2.5 bg-clinical-600 text-white text-sm font-semibold rounded-lg hover:bg-clinical-700 transition-colors shadow-sm disabled:opacity-40"
                                        >
                                            Agregar nota
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <h4 className="text-sm font-semibold text-gray-500 mb-4">Notas ({notes.length})</h4>
                                    {notes.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                            <LucideStickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">No hay notas registradas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {notes.map(note => (
                                                <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm group relative">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            {note.title && <h5 className="text-sm font-bold text-gray-900 mb-1">{note.title}</h5>}
                                                            {note.content && <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>}
                                                        </div>
                                                        <button onClick={() => deleteNote(note.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                                                            <LucideTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-2">
                                                        {new Date(note.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── WhatsApp Tab ── */}
                        {activeTab === 'whatsapp' && (
                            <EmbeddedWhatsAppChat phone={lead.phone} leadName={lead.name} />
                        )}

                        {/* ── Emails Tab (Coming Soon) ── */}
                        {activeTab === 'emails' && (
                            <div className="p-8"><ComingSoonPlaceholder icon={LucideMail} title="Correos Electrónicos" /></div>
                        )}

                        {/* ── Calls Tab (Coming Soon) ── */}
                        {activeTab === 'calls' && (
                            <div className="p-8"><ComingSoonPlaceholder icon={LucidePhoneCall} title="Registro de Llamadas" /></div>
                        )}

                        {/* ── Tasks Tab ── */}
                        {activeTab === 'tasks' && (
                            <div className="p-8">
                                <EntityTasks entityType="lead" entityId={leadId!} entityPhone={lead.phone} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════ RIGHT COLUMN ═══════════════════ */}
                <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
                    <div className="px-6 py-6 space-y-6 flex-1">
                        {/* Service */}
                        <div>
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Servicio de Interés</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                {lead.service ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-clinical-50 flex items-center justify-center">
                                            <LucideHeart className="w-5 h-5 text-clinical-600" />
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
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Estado del Pipeline</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Etapa</span>
                                    <span className="text-xs font-bold text-clinical-700 bg-clinical-50 px-2.5 py-1 rounded-md">
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
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <LucideClock className="w-3 h-3" />
                                            {Math.floor((new Date().getTime() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60))}h
                                        </span>
                                    </div>
                                )}
                                {/* Progress bar */}
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-gradient-to-r from-clinical-400 to-clinical-600 rounded-full transition-all"
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
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Asignado a</h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={assignee?.avatar_url || `https://ui-avatars.com/api/?name=${assignee?.name || 'NA'}&size=40`}
                                        className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
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

                        {/* Tags */}
                        <LeadTagsSection leadId={leadId!} />

                        {/* Deals (placeholder) */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Deals</h4>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                <p className="text-xs text-gray-400 italic">Sin deals vinculados</p>
                                <button className="mt-2 text-xs text-clinical-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
                                    <LucidePlus className="w-3 h-3" />
                                    Crear deal
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Resolution Buttons */}
                    <div className="px-6 py-5 border-t border-gray-100 space-y-2">
                        {stages.filter((s: any) => s.resolution_type === 'won').map((s: any) => (
                            <button key={s.id} onClick={() => setShowWonModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all hover:shadow-sm">
                                <LucideCheckCircle2 className="w-4 h-4" />
                                Ganado
                            </button>
                        ))}
                        {stages.filter((s: any) => s.resolution_type === 'lost').map((s: any) => (
                            <button key={s.id} onClick={() => setShowLostModal(true)} className="w-full py-3 text-sm font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all">
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

/* ═══════════════════════════════════════════════════════════════
   Embedded WhatsApp Chat — uses TimelinesAI to find chat by phone
   ═══════════════════════════════════════════════════════════════ */

function formatChatTime(isoOrTimestamp: string | number | undefined): string {
    if (!isoOrTimestamp) return ''
    const d = new Date(
        typeof isoOrTimestamp === 'number' ? isoOrTimestamp * 1000 : isoOrTimestamp
    )
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Ayer'
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

const EmbeddedWhatsAppChat = ({ phone, leadName }: { phone: string | null, leadName: string }) => {
    const { data: chat, isLoading: loadingChat } = useChatByPhone(phone)
    const { data: messages, isLoading: loadingMessages } = useChatMessages(chat?.id ?? null)
    const sendMutation = useSendMessage()
    const createMutation = useCreateNewConversation()
    const [draft, setDraft] = useState('')
    const [newChatText, setNewChatText] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Real-time updates
    useChatRealtime(chat?.id ?? null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (!draft.trim() || !chat) return
        const text = draft.trim()
        setDraft('')
        sendMutation.mutate({ chatId: chat.id, text })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleStartConversation = () => {
        if (!phone || !newChatText.trim()) return
        createMutation.mutate(
            { phone: phone.trim(), text: newChatText.trim() },
            { onSuccess: () => setNewChatText('') }
        )
    }

    // No phone number
    if (!phone) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <LucidePhone className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin número de teléfono</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center">
                    Agrega un número de teléfono al lead para poder ver o iniciar conversaciones de WhatsApp.
                </p>
            </div>
        )
    }

    // Searching for chat
    if (loadingChat) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <LucideLoader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
                <p className="text-sm text-gray-400">Buscando conversación de WhatsApp...</p>
            </div>
        )
    }

    // No chat found — offer to start one
    if (!chat) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 px-8">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                    <LucideMessageCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin conversación</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center mb-6">
                    No se encontró una conversación de WhatsApp con {phone}. Puedes iniciar una nueva.
                </p>
                <div className="w-full max-w-sm space-y-3">
                    <textarea
                        placeholder="Escribe el primer mensaje..."
                        value={newChatText}
                        onChange={e => setNewChatText(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    />
                    <button
                        onClick={handleStartConversation}
                        disabled={!newChatText.trim() || createMutation.isPending}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending
                            ? <LucideLoader2 className="w-4 h-4 animate-spin" />
                            : <LucideSend className="w-4 h-4" />
                        }
                        Iniciar conversación
                    </button>
                    {createMutation.isSuccess && (
                        <p className="text-xs text-green-600 text-center">✓ Mensaje enviado — la conversación aparecerá en segundos</p>
                    )}
                    {createMutation.isError && (
                        <p className="text-xs text-red-500 text-center">{String((createMutation.error as Error)?.message ?? 'Error')}</p>
                    )}
                </div>
            </div>
        )
    }

    // Chat found — render messages
    return (
        <div className="flex flex-col h-full">
            {/* Chat header */}
            <div className="bg-[#075e54] text-white px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {(chat.name || leadName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-semibold leading-tight">{chat.name || leadName}</p>
                    <p className="text-[11px] text-white/70">{chat.phone}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#f0ebe3' }}>
                {loadingMessages && (
                    <div className="flex justify-center py-8">
                        <LucideLoader2 className="w-6 h-6 text-green-500 animate-spin" />
                    </div>
                )}

                {!loadingMessages && (!messages || messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 text-sm">
                        <LucideMessageSquare className="w-8 h-8 text-gray-300" />
                        <span>No hay mensajes en esta conversación</span>
                    </div>
                )}

                {[...(messages ?? [])].reverse().map((msg) => {
                    const isMine = msg.from_me
                    return (
                        <div key={msg.uid || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                                isMine
                                    ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'
                            }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${isMine ? 'text-gray-500 text-right' : 'text-gray-400'}`}>
                                    {formatChatTime(msg.timestamp)}
                                    {isMine && <span className="ml-1 text-blue-500">✓✓</span>}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-3 shrink-0 border-t border-gray-200">
                <textarea
                    placeholder="Escribe un mensaje..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
                <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-full bg-[#075e54] hover:bg-[#064e46] disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
                >
                    {sendMutation.isPending
                        ? <LucideLoader2 className="w-4 h-4 animate-spin" />
                        : <LucideSend className="w-4 h-4" />
                    }
                </button>
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

const TimelineItem = ({ title, description, date, color = 'clinical' }: { title: string, description: string, date: string, color?: string }) => (
    <div className="relative">
        <div className={`absolute -left-[33px] top-2 w-3.5 h-3.5 bg-white border-[2.5px] ${color === 'emerald' ? 'border-emerald-500' : 'border-clinical-500'} rounded-full`}></div>
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
    <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <LucideConstruction className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-400">🚧 Muy Pronto — En Construcción</p>
        <p className="text-xs text-gray-300 mt-2">Esta funcionalidad estará disponible próximamente</p>
    </div>
)

/* ── Tags Section for Lead Right Column ──────────────────────── */
const LeadTagsSection = ({ leadId }: { leadId: string }) => {
    const { data: clinicTags = [] } = useClinicTags()
    const { data: entityTags = [] } = useEntityTags('lead', leadId)
    const addTag = useAddEntityTag()
    const removeTag = useRemoveEntityTag()

    const assignedTagIds = new Set(entityTags.map(et => et.tag_id))
    const availableTags = clinicTags.filter(t => !assignedTagIds.has(t.id))

    return (
        <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Etiquetas</h4>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                    {entityTags.length === 0 && <span className="text-xs text-gray-400 italic">Sin etiquetas</span>}
                    {entityTags.map(et => (
                        <span
                            key={et.id}
                            className="group text-xs font-medium text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                            style={{ backgroundColor: et.clinic_tag?.color || '#6b7280' }}
                        >
                            {et.clinic_tag?.name || '?'}
                            <button
                                onClick={() => removeTag.mutate({ id: et.id, entityType: 'lead', entityId: leadId })}
                                className="opacity-60 hover:opacity-100 transition-opacity"
                            >×</button>
                        </span>
                    ))}
                </div>
                {availableTags.length > 0 && (
                    <select
                        value=""
                        onChange={e => {
                            if (e.target.value) addTag.mutate({ tagId: e.target.value, entityType: 'lead', entityId: leadId })
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                    >
                        <option value="">+ Agregar etiqueta...</option>
                        {availableTags.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    )
}

