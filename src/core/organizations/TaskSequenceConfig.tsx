import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { MEXICO_HOLIDAYS_2026 } from '../../services/taskSequenceExecution'
import {
    LucidePlus, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown,
    LucideZap, LucidePhone, LucideMessageSquare, LucideUsers, LucideFileText, LucidePin,
    LucidePower, LucidePowerOff, LucideEdit3, LucideSave
} from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    llamada: { label: 'Llamada', icon: LucidePhone, color: 'text-blue-600 bg-blue-50' },
    mensaje: { label: 'Mensaje', icon: LucideMessageSquare, color: 'text-emerald-600 bg-emerald-50' },
    reunion: { label: 'Reunión', icon: LucideUsers, color: 'text-violet-600 bg-violet-50' },
    cotizacion: { label: 'Cotización', icon: LucideFileText, color: 'text-amber-600 bg-amber-50' },
    otro: { label: 'Otro', icon: LucidePin, color: 'text-gray-600 bg-gray-100' },
}

interface Step {
    id?: string
    step_order: number
    title: string
    description: string
    task_type: string
    delay_days: number
    delay_hours: number
    priority: string
}

export const TaskSequenceConfig = () => {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id
    const queryClient = useQueryClient()

    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [steps, setSteps] = useState<Step[]>([])
    const [showForm, setShowForm] = useState(false)

    // ─── Fetch sequences ──────────────────────────────────────
    const { data: sequences = [] } = useQuery({
        queryKey: ['task_sequences', clinicaId],
        queryFn: async () => {
            if (!clinicaId) return []
            const { data, error } = await supabase
                .from('task_sequences')
                .select('*, task_sequence_steps(*)')
                .eq('clinica_id', clinicaId)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!clinicaId
    })

    // ─── Toggle active ────────────────────────────────────────
    const toggleMut = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase.from('task_sequences').update({ is_active: active }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task_sequences'] })
    })

    // ─── Save sequence ────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: async () => {
            if (!clinicaId || !name.trim()) return

            let seqId = editingId

            if (editingId) {
                // Update header
                const { error } = await supabase.from('task_sequences')
                    .update({ name, description, holidays: MEXICO_HOLIDAYS_2026, updated_at: new Date().toISOString() })
                    .eq('id', editingId)
                if (error) throw error
                // Delete old steps and re-insert
                await supabase.from('task_sequence_steps').delete().eq('sequence_id', editingId)
            } else {
                // Insert new
                const { data, error } = await supabase.from('task_sequences')
                    .insert([{ clinica_id: clinicaId, name, description, holidays: MEXICO_HOLIDAYS_2026 }])
                    .select('id')
                    .single()
                if (error) throw error
                seqId = data.id
            }

            // Insert steps
            if (seqId && steps.length > 0) {
                const stepsPayload = steps.map((s, i) => ({
                    sequence_id: seqId,
                    step_order: i,
                    title: s.title,
                    description: s.description || null,
                    task_type: s.task_type,
                    delay_days: s.delay_days,
                    delay_hours: s.delay_hours,
                    priority: s.priority,
                }))
                const { error } = await supabase.from('task_sequence_steps').insert(stepsPayload)
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task_sequences'] })
            resetForm()
        }
    })

    // ─── Delete sequence ──────────────────────────────────────
    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('task_sequences').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task_sequences'] })
    })

    const resetForm = () => {
        setShowForm(false); setEditingId(null); setName(''); setDescription(''); setSteps([])
    }

    const openEdit = (seq: any) => {
        setEditingId(seq.id)
        setName(seq.name)
        setDescription(seq.description || '')
        setSteps(
            (seq.task_sequence_steps || [])
                .sort((a: any, b: any) => a.step_order - b.step_order)
                .map((s: any) => ({
                    id: s.id, step_order: s.step_order, title: s.title,
                    description: s.description || '', task_type: s.task_type,
                    delay_days: s.delay_days, delay_hours: s.delay_hours, priority: s.priority
                }))
        )
        setShowForm(true)
    }

    const addStep = () => {
        setSteps([...steps, {
            step_order: steps.length, title: '', description: '', task_type: 'otro',
            delay_days: 0, delay_hours: 12, priority: 'normal'
        }])
    }

    const updateStep = (idx: number, field: string, value: any) => {
        const updated = [...steps]
        ;(updated[idx] as any)[field] = value
        setSteps(updated)
    }

    const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx))

    const moveStep = (idx: number, dir: -1 | 1) => {
        const newIdx = idx + dir
        if (newIdx < 0 || newIdx >= steps.length) return
        const updated = [...steps]
        ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
        setSteps(updated)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <LucideZap className="w-6 h-6 text-amber-500" />
                        <span>Secuencias de Tareas</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Automatiza tareas cuando se asigna un lead a un asesor.</p>
                </div>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true) }}
                        className="bg-clinical-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-clinical-700 transition-colors shadow-sm">
                        <LucidePlus className="w-4 h-4" /> <span>Nueva Secuencia</span>
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">{editingId ? 'Editar' : 'Nueva'} Secuencia</h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><LucideX className="w-5 h-5" /></button>
                        </div>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="Nombre de la secuencia (ej: Seguimiento Inicial)"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-clinical-500" />
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Descripción (opcional)" rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 resize-none" />
                    </div>

                    {/* Steps */}
                    <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-gray-700">Pasos ({steps.length})</h4>
                            <button onClick={addStep}
                                className="text-clinical-600 text-xs font-bold flex items-center space-x-1 hover:bg-clinical-50 px-2 py-1 rounded-lg transition-colors">
                                <LucidePlus className="w-3.5 h-3.5" /> <span>Agregar Paso</span>
                            </button>
                        </div>

                        {steps.map((step, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400">Paso {idx + 1}</span>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><LucideChevronUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><LucideChevronDown className="w-4 h-4" /></button>
                                        <button onClick={() => removeStep(idx)}
                                            className="p-1 text-red-400 hover:text-red-600"><LucideTrash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <input type="text" value={step.title} onChange={e => updateStep(idx, 'title', e.target.value)}
                                    placeholder="Título de la tarea" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500" />

                                <textarea value={step.description} onChange={e => updateStep(idx, 'description', e.target.value)}
                                    placeholder="Guión / Descripción" rows={2}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 resize-none" />

                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo</label>
                                        <select value={step.task_type} onChange={e => updateStep(idx, 'task_type', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none cursor-pointer">
                                            {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Día hábil</label>
                                        <input type="number" min={0} value={step.delay_days} onChange={e => updateStep(idx, 'delay_days', Number(e.target.value))}
                                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Hora (UTC)</label>
                                        <input type="number" min={0} max={23} value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', Number(e.target.value))}
                                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Prioridad</label>
                                        <select value={step.priority} onChange={e => updateStep(idx, 'priority', e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none cursor-pointer">
                                            <option value="alta">🔴 Alta</option>
                                            <option value="normal">⚪ Normal</option>
                                            <option value="baja">🔵 Baja</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {steps.length === 0 && (
                            <p className="text-center text-sm text-gray-400 py-6">Agrega pasos para construir tu secuencia.</p>
                        )}
                    </div>

                    {/* Save */}
                    <div className="p-6 flex justify-end space-x-3">
                        <button onClick={resetForm} className="px-4 py-2 text-gray-500 font-bold text-sm">Cancelar</button>
                        <button onClick={() => saveMut.mutate()} disabled={!name.trim() || steps.length === 0 || saveMut.isPending}
                            className="px-5 py-2 bg-clinical-600 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-clinical-700 transition-colors disabled:opacity-50 flex items-center space-x-2">
                            <LucideSave className="w-4 h-4" />
                            <span>{editingId ? 'Actualizar' : 'Guardar'} Secuencia</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Sequence List */}
            <div className="space-y-4">
                {sequences.length === 0 && !showForm && (
                    <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <LucideZap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay secuencias configuradas.</p>
                        <p className="text-xs text-gray-400 mt-1">Crea una secuencia de tareas que se genere automáticamente.</p>
                    </div>
                )}
                {sequences.map((seq: any) => {
                    const stepsSorted = (seq.task_sequence_steps || []).sort((a: any, b: any) => a.step_order - b.step_order)
                    return (
                        <div key={seq.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-xl ${seq.is_active ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                                        <LucideZap className={`w-5 h-5 ${seq.is_active ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{seq.name}</h4>
                                        <p className="text-xs text-gray-500">{stepsSorted.length} pasos · {seq.is_active ? '🟢 Activa' : '⚪ Inactiva'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => toggleMut.mutate({ id: seq.id, active: !seq.is_active })}
                                        className={`p-2 rounded-lg transition-colors ${seq.is_active ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}>
                                        {seq.is_active ? <LucidePower className="w-4 h-4" /> : <LucidePowerOff className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => openEdit(seq)}
                                        className="p-2 text-clinical-600 bg-clinical-50 rounded-lg hover:bg-clinical-100 transition-colors">
                                        <LucideEdit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { if (confirm('¿Eliminar esta secuencia?')) deleteMut.mutate(seq.id) }}
                                        className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                        <LucideTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Steps timeline preview */}
                            {stepsSorted.length > 0 && (
                                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                                    <div className="space-y-2">
                                        {stepsSorted.map((step: any, i: number) => {
                                            const tc = TYPE_CONFIG[step.task_type] || TYPE_CONFIG.otro
                                            const TypeIcon = tc.icon
                                            return (
                                                <div key={step.id || i} className="flex items-center space-x-3 text-xs">
                                                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span>
                                                    <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md ${tc.color} text-[10px] font-bold`}>
                                                        <TypeIcon className="w-3 h-3" /><span>{tc.label}</span>
                                                    </span>
                                                    <span className="text-gray-700 font-medium truncate">{step.title}</span>
                                                    <span className="text-gray-400 shrink-0">Día {step.delay_days}</span>
                                                    {step.priority === 'alta' && <span className="text-[10px] font-bold text-red-600">🔴</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
