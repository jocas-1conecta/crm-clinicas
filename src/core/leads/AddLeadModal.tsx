import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import { LucideX, LucideUserPlus, LucideLoader2 } from 'lucide-react'
import { PhoneInput } from '../../components/PhoneInput'

interface AddLeadModalProps {
    open: boolean
    onClose: () => void
}

export const AddLeadModal = ({ open, onClose }: AddLeadModalProps) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        source: '',
        service: '',
        assigned_to: '',
    })

    // Fetch stages, services, team
    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages_leads', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('*').eq('clinica_id', clinicaId!).eq('board_type', 'leads').eq('is_default', true).is('is_archived', false).limit(1)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    const { data: services = [] } = useQuery({
        queryKey: ['services_list', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('services').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    const { data: team = [] } = useQuery({
        queryKey: ['team_members', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    const { data: branches = [] } = useQuery({
        queryKey: ['branches', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('sucursales').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            const defaultStage = stages[0]
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                source: form.source.trim() || 'Manual',
                service: form.service || null,
                assigned_to: form.assigned_to || (currentUser?.role === 'Asesor_Sucursal' ? currentUser.id : null),
                sucursal_id: currentUser?.sucursal_id || (branches.length > 0 ? branches[0].id : null),
                stage_id: defaultStage?.id || null,
                stage_entered_at: new Date().toISOString(),
            }
            const { error } = await supabase.from('leads').insert(payload)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            setForm({ name: '', phone: '', email: '', source: '', service: '', assigned_to: '' })
            onClose()
        },
    })

    if (!open) return null

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <LucideUserPlus className="w-5 h-5 text-clinical-600" />
                        Nuevo Lead
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <LucideX className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name — required */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre Completo <span className="text-red-500">*</span></label>
                        <input
                            type="text" autoFocus
                            placeholder="Ej. María García López"
                            value={form.name} onChange={e => update('name', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <PhoneInput
                            label="Teléfono"
                            value={form.phone}
                            onChange={(v) => update('phone', v)}
                            size="sm"
                            id="add-lead-phone"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={form.email} onChange={e => update('email', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                        />
                    </div>

                    {/* Source + Service row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fuente / Origen</label>
                            <select
                                value={form.source} onChange={e => update('source', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Referido">Referido</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Facebook">Facebook</option>
                                <option value="TikTok">TikTok</option>
                                <option value="Google">Google</option>
                                <option value="Sitio Web">Sitio Web</option>
                                <option value="Llamada entrante">Llamada entrante</option>
                                <option value="WhatsApp directo">WhatsApp directo</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Servicio de Interés</label>
                            <select
                                value={form.service} onChange={e => update('service', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="">Sin servicio</option>
                                {services.map((s: any) => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Assigned To */}
                    {currentUser?.role !== 'Asesor_Sucursal' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Asignar a</label>
                            <select
                                value={form.assigned_to} onChange={e => update('assigned_to', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="">Sin asignar</option>
                                {team.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={!form.name.trim() || createMutation.isPending}
                        className="px-6 py-2.5 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-colors shadow-sm disabled:opacity-40 flex items-center gap-2"
                    >
                        {createMutation.isPending && <LucideLoader2 className="w-4 h-4 animate-spin" />}
                        Crear Lead
                    </button>
                </div>

                {createMutation.isError && (
                    <div className="px-6 pb-4">
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{String((createMutation.error as Error)?.message || 'Error creando lead')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
