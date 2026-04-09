import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { useStore } from '../../../store/useStore'
import { LucideX, LucideUserPlus, LucideLoader2 } from 'lucide-react'
import { PhoneInput } from '../../../components/PhoneInput'

interface AddPatientModalProps {
    open: boolean
    onClose: () => void
}

export const AddPatientModal = ({ open, onClose }: AddPatientModalProps) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        age: '',
        status: 'Activo',
        tags: '',
    })

    const { data: branches = [] } = useQuery({
        queryKey: ['branches', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('sucursales').select('id, name').eq('clinica_id', clinicaId!)
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

    const [assignedTo, setAssignedTo] = useState('')

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                age: form.age ? parseInt(form.age) : null,
                status: form.status,
                tags: form.tags.trim() ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                assigned_to: assignedTo || null,
                sucursal_id: currentUser?.sucursal_id || (branches.length > 0 ? branches[0].id : null),
            }
            const { error } = await supabase.from('patients').insert(payload)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            queryClient.invalidateQueries({ queryKey: ['patients-admin'] })
            setForm({ name: '', phone: '', email: '', age: '', status: 'Activo', tags: '' })
            setAssignedTo('')
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
                        Nuevo Paciente
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <LucideX className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre Completo <span className="text-red-500">*</span></label>
                        <input
                            type="text" autoFocus
                            placeholder="Ej. Carlos Rodríguez Peña"
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
                            id="add-patient-phone"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input
                            type="email" placeholder="correo@ejemplo.com"
                            value={form.email} onChange={e => update('email', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                        />
                    </div>

                    {/* Age + Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Edad</label>
                            <input
                                type="number" placeholder="Ej. 35" min="0" max="120"
                                value={form.age} onChange={e => update('age', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                            <select
                                value={form.status} onChange={e => update('status', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="Activo">Activo</option>
                                <option value="En tratamiento">En tratamiento</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Etiquetas (separadas por coma)</label>
                        <input
                            type="text"
                            placeholder="Ej. Rinoplastia, Premium, VIP"
                            value={form.tags} onChange={e => update('tags', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                        />
                    </div>

                    {/* Assigned To */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Asignar a</label>
                        <select
                            value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                        >
                            <option value="">Sin asignar</option>
                            {team.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
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
                        Crear Paciente
                    </button>
                </div>

                {createMutation.isError && (
                    <div className="px-6 pb-4">
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{String((createMutation.error as Error)?.message || 'Error creando paciente')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
