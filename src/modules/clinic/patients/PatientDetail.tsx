import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { EntityTasks } from '../../../components/tasks/EntityTasks'
import { useClinicTags, useEntityTags, useAddEntityTag, useRemoveEntityTag } from '../../../hooks/useClinicTags'
import { useChatByPhone, useChatMessages, useSendMessage, useChatRealtime, useCreateNewConversation } from '../../../core/chat/useTimelinesAI'
import { PhoneInput } from '../../../components/PhoneInput'
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
    LucideFileText,
    LucideDownload,
    LucideBriefcase,
    LucideStethoscope,
    LucideCalendar,
} from 'lucide-react'
import { TimelinesMessage } from '../../../services/timelinesAIService'

/* ──────────────────────────────────────────────────────────────
   PatientDetail — Full-page 3-column layout
   Mirrors LeadDetail structure for consistent UX
   Left:   Contact card + patient info fields
   Center: Tabbed content (Activity, Notes, WhatsApp, Tasks, etc.)
   Right:  Summary, Assignee, Tags, Deals
   ────────────────────────────────────────────────────────────── */

export const PatientDetail = () => {
    const { id: patientId } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    const goBack = () => navigate('/pacientes')

    /* ── Data ────────────────────────────────────────────── */
    const { data: patient, isLoading: patientLoading, isError: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('patients')
                .select('id, name, phone, email, age, status, assigned_to, sucursal_id, last_visit, converted_from_lead_id, created_at, tags')
                .eq('id', patientId!).single()
            if (error) throw error
            return data
        },
        enabled: !!patientId,
        retry: 2,
    })

    const { data: deals = [] } = useQuery({
        queryKey: ['deals', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('deals')
                .select('id, title, patient_id, estimated_value, status, stage_id, assigned_to, closed_at, created_at')
                .eq('patient_id', patientId!)
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
                .select('id, name, sort_order, is_default, is_archived, resolution_type, clinica_id, board_type')
                .eq('clinica_id', clinicaId).eq('board_type', 'deals')
                .is('is_archived', false).order('sort_order', { ascending: true })
            if (error) throw error
            return data
        },
        enabled: !!clinicaId,
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['patient_appointments', patientId],
        queryFn: async () => {
            const { data, error } = await supabase.from('appointments')
                .select('id, patient_id, appointment_date, appointment_time, status, doctor_name, service_name, specialty, sucursal_id, assigned_to, created_at')
                .eq('patient_id', patientId!).order('appointment_date', { ascending: false })
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

    /* ── Local state ────────────────────────────────────── */
    const [activeTab, setActiveTab] = useState('activity')
    const [savingField, setSavingField] = useState('')
    const [showNewDeal, setShowNewDeal] = useState(false)
    const [dealTitle, setDealTitle] = useState('')
    const [dealValue, setDealValue] = useState(0)

    // Notes stored in localStorage
    const notesKey = `patient_notes_${patientId}`
    const [noteTitle, setNoteTitle] = useState('')
    const [noteContent, setNoteContent] = useState('')
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

    // Structured tags
    const { data: clinicTags = [] } = useClinicTags()
    const { data: entityTags = [] } = useEntityTags('patient', patientId)
    const addEntityTag = useAddEntityTag()
    const removeEntityTag = useRemoveEntityTag()

    /* ── Mutations ──────────────────────────────────────── */
    const updateField = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const { error } = await supabase.from('patients').update(updates).eq('id', patientId!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            queryClient.invalidateQueries({ queryKey: ['patients-admin'] })
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

    /* ── Loading / Error ─────────────────────────────────── */
    if (patientLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-clinical-400 animate-spin" />
            </div>
        )
    }

    if (patientError || !patient) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                    <LucideX className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Paciente no encontrado</h2>
                    <p className="text-sm text-gray-500">No se pudo cargar la información del paciente. Es posible que haya sido eliminado o no tengas acceso.</p>
                </div>
                <button onClick={goBack} className="mt-2 px-6 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-bold hover:bg-clinical-700 transition-colors flex items-center gap-2">
                    <LucideChevronLeft className="w-4 h-4" />
                    Volver a Pacientes
                </button>
            </div>
        )
    }

    const assignee = teamMembers.find((m: any) => m.id === patient.assigned_to)
    const getDealResolutionType = (deal: any) => {
        const stage = dealStages.find((s: any) => s.id === deal.stage_id)
        return stage ? stage.resolution_type : 'open'
    }

    const tabs = [
        { id: 'activity', name: 'Actividad', icon: LucideActivity },
        { id: 'notes', name: 'Notas', icon: LucideStickyNote },
        { id: 'whatsapp', name: 'WhatsApp', icon: LucideMessageCircle },
        { id: 'tasks', name: 'Tareas', icon: LucideCheckSquare },
        { id: 'appointments', name: 'Citas', icon: LucideStethoscope },
        { id: 'deals', name: 'Deals', icon: LucideBriefcase },
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

                        {/* Quick Actions */}
                        <div className="flex items-center gap-4 mt-5">
                            {[
                                { icon: LucideStickyNote, label: 'Nota', action: () => setActiveTab('notes') },
                                { icon: LucideMessageCircle, label: 'WhatsApp', action: () => setActiveTab('whatsapp') },
                                { icon: LucidePhoneCall, label: 'Llamar', action: () => {} },
                                { icon: LucideMail, label: 'Email', action: () => {} },
                            ].map((btn, i) => (
                                <button key={i} onClick={btn.action} className="flex flex-col items-center group">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-clinical-50 group-hover:border-clinical-200 group-hover:shadow-sm transition-all">
                                        <btn.icon className="w-4 h-4 text-gray-500 group-hover:text-clinical-600 transition-colors" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1.5 group-hover:text-clinical-600 transition-colors">{btn.label}</span>
                                </button>
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
                        <Field label="Email" icon={LucideMail}>
                            <EditableText value={patient.email || ''} field="email" saving={savingField} onSave={handleFieldChange} />
                        </Field>
                        <Field label="Teléfono" icon={LucidePhone}>
                            <PhoneInput
                                value={patient.phone || ''}
                                onChange={() => {}}
                                onBlur={(v) => { if (v !== (patient.phone || '')) handleFieldChange('phone', v) }}
                                size="sm"
                                id="patient-phone"
                            />
                            {savingField === 'phone' && <SavingIndicator />}
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
                                    {patient.created_at && (
                                        <TimelineItem
                                            title="Paciente registrado"
                                            description={`Se registró a ${patient.name} como paciente`}
                                            date={patient.created_at}
                                            color="emerald"
                                        />
                                    )}
                                    {appointments.map((appt: any) => (
                                        <TimelineItem
                                            key={appt.id}
                                            title={appt.service_name || appt.specialty || 'Cita médica'}
                                            description={`Dr. ${appt.doctor_name || 'N/A'} · ${appt.status} · ${new Date(appt.appointment_date).toLocaleDateString('es-CO')}`}
                                            date={appt.created_at}
                                            color="clinical"
                                        />
                                    ))}
                                    {deals.map((deal: any) => (
                                        <TimelineItem
                                            key={deal.id}
                                            title={`Oportunidad: ${deal.title}`}
                                            description={`$${Number(deal.estimated_value || 0).toLocaleString()} · ${deal.status}`}
                                            date={deal.created_at}
                                            color="clinical"
                                        />
                                    ))}
                                    {!patient.created_at && appointments.length === 0 && deals.length === 0 && (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-gray-400 italic">No hay actividad registrada aún.</p>
                                        </div>
                                    )}
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
                            <EmbeddedWhatsAppChat phone={patient.phone} contactName={patient.name} />
                        )}

                        {/* ── Tasks Tab ── */}
                        {activeTab === 'tasks' && (
                            <div className="p-8">
                                <EntityTasks entityType="patient" entityId={patientId!} entityPhone={patient.phone} convertedFromLeadId={patient.converted_from_lead_id} />
                            </div>
                        )}

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
                                                                    <span className="flex items-center gap-1"><LucideCalendar className="w-3.5 h-3.5" />{dateStr}</span>
                                                                    <span className="flex items-center gap-1"><LucideClock className="w-3.5 h-3.5" />{appt.appointment_time?.substring(0, 5) || '--:--'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-gray-50 text-gray-600">
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

function getAttachmentType(url: string, filename?: string): 'image' | 'audio' | 'video' | 'document' {
    const ext = (filename || url).split('.').pop()?.toLowerCase()?.split('?')[0] || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
    if (['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'oga'].includes(ext)) return 'audio'
    if (['mp4', 'webm', 'mov', 'avi', '3gp'].includes(ext)) return 'video'
    return 'document'
}

function formatWhatsAppText(text: string, isMine: boolean): React.ReactNode[] {
    if (!text) return []
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            urlRegex.lastIndex = 0
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                    className={`underline break-all ${isMine ? 'text-blue-700 hover:text-blue-900' : 'text-blue-600 hover:text-blue-800'}`}
                >
                    {part.length > 50 ? part.slice(0, 50) + '…' : part}
                </a>
            )
        }
        const formatted = part
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
            .replace(/_((?!\s)[^_]+(?!\s))_/g, '<em>$1</em>')
            .replace(/~([^~]+)~/g, '<del>$1</del>')
        return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
    })
}

const MessageContent = ({ msg, isMine }: { msg: TimelinesMessage; isMine: boolean }) => {
    const [imgExpanded, setImgExpanded] = useState(false)
    const attachUrl = msg.attachment_url
    const attachName = msg.attachment_filename
    const hasAttach = msg.has_attachment && !!attachUrl

    if (hasAttach && attachUrl) {
        const type = getAttachmentType(attachUrl, attachName)

        if (type === 'image') {
            return (
                <div>
                    <img src={attachUrl} alt={attachName || 'Imagen'} className="rounded-lg max-w-full max-h-56 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setImgExpanded(true)} loading="lazy" />
                    {msg.text && <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">{formatWhatsAppText(msg.text, isMine)}</p>}
                    {imgExpanded && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setImgExpanded(false)}>
                            <img src={attachUrl} alt={attachName || 'Imagen'} className="max-w-full max-h-full rounded-lg" />
                        </div>
                    )}
                </div>
            )
        }
        if (type === 'audio') {
            return (
                <div className="min-w-[220px]">
                    <audio controls className="w-full h-10" preload="none"><source src={attachUrl} /></audio>
                    {msg.text && <p className="mt-1 text-sm whitespace-pre-wrap break-words">{formatWhatsAppText(msg.text, isMine)}</p>}
                </div>
            )
        }
        if (type === 'video') {
            return (
                <div>
                    <video controls className="rounded-lg max-w-full max-h-56" preload="none"><source src={attachUrl} /></video>
                    {msg.text && <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">{formatWhatsAppText(msg.text, isMine)}</p>}
                </div>
            )
        }
        return (
            <div>
                <a href={attachUrl} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isMine ? 'border-green-300/40 bg-green-100/30 hover:bg-green-100/50 text-gray-700' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                >
                    <LucideFileText className="w-5 h-5 shrink-0" />
                    <span className="text-sm truncate flex-1">{attachName || 'Archivo'}</span>
                    <LucideDownload className="w-4 h-4 shrink-0" />
                </a>
                {msg.text && <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">{formatWhatsAppText(msg.text, isMine)}</p>}
            </div>
        )
    }
    return <p className="whitespace-pre-wrap break-words">{formatWhatsAppText(msg.text, isMine)}</p>
}

const EmbeddedWhatsAppChat = ({ phone, contactName }: { phone: string | null, contactName: string }) => {
    const { data: chat, isLoading: loadingChat } = useChatByPhone(phone)
    const { data: messages, isLoading: loadingMessages } = useChatMessages(chat?.id ?? null)
    const sendMutation = useSendMessage()
    const createMutation = useCreateNewConversation()
    const [draft, setDraft] = useState('')
    const [newChatText, setNewChatText] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

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
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const handleStartConversation = () => {
        if (!phone || !newChatText.trim()) return
        createMutation.mutate(
            { phone: phone.trim(), text: newChatText.trim() },
            { onSuccess: () => setNewChatText('') }
        )
    }

    if (!phone) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <LucidePhone className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin número de teléfono</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center">
                    Agrega un número de teléfono al paciente para poder ver o iniciar conversaciones de WhatsApp.
                </p>
            </div>
        )
    }

    if (loadingChat) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <LucideLoader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
                <p className="text-sm text-gray-400">Buscando conversación de WhatsApp...</p>
            </div>
        )
    }

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
                    <textarea placeholder="Escribe el primer mensaje..." value={newChatText} onChange={e => setNewChatText(e.target.value)} rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                    <button onClick={handleStartConversation} disabled={!newChatText.trim() || createMutation.isPending}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSend className="w-4 h-4" />}
                        Iniciar conversación
                    </button>
                    {createMutation.isSuccess && <p className="text-xs text-green-600 text-center">✓ Mensaje enviado — la conversación aparecerá en segundos</p>}
                    {createMutation.isError && <p className="text-xs text-red-500 text-center">{String((createMutation.error as Error)?.message ?? 'Error')}</p>}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="bg-[#075e54] text-white px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {(chat.name || contactName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-semibold leading-tight">{chat.name || contactName}</p>
                    <p className="text-[11px] text-white/70">{chat.phone}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#f0ebe3' }}>
                {loadingMessages && <div className="flex justify-center py-8"><LucideLoader2 className="w-6 h-6 text-green-500 animate-spin" /></div>}
                {!loadingMessages && (!messages || messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 text-sm">
                        <LucideMessageSquare className="w-8 h-8 text-gray-300" />
                        <span>No hay mensajes en esta conversación</span>
                    </div>
                )}

                {[...(messages ?? [])].reverse().map((msg) => {
                    const isMine = msg.from_me
                    const hasMedia = msg.has_attachment && !!msg.attachment_url
                    return (
                        <div key={msg.uid || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-lg text-sm shadow-sm overflow-hidden ${
                                hasMedia
                                    ? (isMine ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none p-1' : 'bg-white text-gray-800 rounded-tl-none p-1')
                                    : (isMine ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none px-3 py-2' : 'bg-white text-gray-800 rounded-tl-none px-3 py-2')
                            }`}>
                                <MessageContent msg={msg} isMine={isMine} />
                                <p className={`text-[10px] mt-1 ${hasMedia ? 'px-2 pb-1' : ''} ${isMine ? 'text-gray-500 text-right' : 'text-gray-400'}`}>
                                    {formatChatTime(msg.timestamp)}
                                    {isMine && <span className="ml-1 text-blue-500">✓✓</span>}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-[#f0f0f0] px-4 py-3 flex items-center gap-3 shrink-0 border-t border-gray-200">
                <textarea placeholder="Escribe un mensaje..." value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown} rows={1}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                <button onClick={handleSend} disabled={!draft.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-full bg-[#075e54] hover:bg-[#064e46] disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
                >
                    {sendMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSend className="w-4 h-4" />}
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
