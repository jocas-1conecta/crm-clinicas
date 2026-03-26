import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { useStore } from '../../../store/useStore'
import { LucideX, LucideCalendar, LucideLoader2 } from 'lucide-react'

interface AddAppointmentModalProps {
    open: boolean
    onClose: () => void
}

export const AddAppointmentModal = ({ open, onClose }: AddAppointmentModalProps) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id
    const sucursalId = currentUser?.sucursal_id

    const [form, setForm] = useState({
        patientName: '',
        patientId: '',
        doctorName: '',
        doctorId: '',
        specialty: '',
        serviceName: '',
        serviceId: '',
        date: '',
        time: '',
    })

    // Fetch patients for dropdown
    const { data: patients = [] } = useQuery({
        queryKey: ['patients-list', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('patients').select('id, name, phone').limit(500)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    // Fetch doctors
    const { data: doctors = [] } = useQuery({
        queryKey: ['doctors', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('doctors').select('id, name, specialty').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    // Fetch services
    const { data: services = [] } = useQuery({
        queryKey: ['services_list', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('services').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId && open,
    })

    // Default stage for appointments pipeline
    const { data: defaultStage } = useQuery({
        queryKey: ['pipeline_default_stage_appointments', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('id')
                .eq('clinica_id', clinicaId!)
                .eq('board_type', 'appointments')
                .eq('is_default', true)
                .is('is_archived', false)
                .limit(1)
                .single()
            return data
        },
        enabled: !!clinicaId && open,
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            const selectedPatient = patients.find((p: any) => p.id === form.patientId)
            const selectedDoctor = doctors.find((d: any) => d.id === form.doctorId)
            const selectedService = services.find((s: any) => s.id === form.serviceId)

            const payload: Record<string, unknown> = {
                patientName: selectedPatient?.name || form.patientName.trim(),
                patientId: form.patientId || null,
                doctorName: selectedDoctor?.name || form.doctorName.trim() || null,
                doctorId: form.doctorId || null,
                specialty: selectedDoctor?.specialty || form.specialty.trim() || null,
                serviceName: selectedService?.name || form.serviceName.trim() || null,
                serviceId: form.serviceId || null,
                date: form.date,
                time: form.time,
                sucursal_id: sucursalId,
                stage_id: defaultStage?.id || null,
                stage_entered_at: new Date().toISOString(),
            }
            const { error } = await supabase.from('appointments').insert(payload)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            setForm({ patientName: '', patientId: '', doctorName: '', doctorId: '', specialty: '', serviceName: '', serviceId: '', date: '', time: '' })
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
                        <LucideCalendar className="w-5 h-5 text-clinical-600" />
                        Agendar Cita
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <LucideX className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Patient Select */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Paciente <span className="text-red-500">*</span></label>
                        <select
                            value={form.patientId} onChange={e => {
                                const p = patients.find((p: any) => p.id === e.target.value)
                                setForm(prev => ({ ...prev, patientId: e.target.value, patientName: p?.name || '' }))
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                        >
                            <option value="">Seleccionar paciente...</option>
                            {patients.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name} {p.phone ? `(${p.phone})` : ''}</option>
                            ))}
                        </select>
                        {/* Manual name if no patient selected */}
                        {!form.patientId && (
                            <input
                                type="text"
                                placeholder="O escribir nombre manualmente"
                                value={form.patientName} onChange={e => update('patientName', e.target.value)}
                                className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                            />
                        )}
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={form.date} onChange={e => update('date', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hora <span className="text-red-500">*</span></label>
                            <input
                                type="time"
                                value={form.time} onChange={e => update('time', e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Doctor + Service */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Doctor</label>
                            <select
                                value={form.doctorId} onChange={e => {
                                    const d = doctors.find((d: any) => d.id === e.target.value)
                                    setForm(prev => ({ ...prev, doctorId: e.target.value, doctorName: d?.name || '', specialty: d?.specialty || '' }))
                                }}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="">Seleccionar doctor...</option>
                                {doctors.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Servicio</label>
                            <select
                                value={form.serviceId} onChange={e => {
                                    const s = services.find((s: any) => s.id === e.target.value)
                                    setForm(prev => ({ ...prev, serviceId: e.target.value, serviceName: s?.name || '' }))
                                }}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {services.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={(!form.patientId && !form.patientName.trim()) || !form.date || !form.time || createMutation.isPending}
                        className="px-6 py-2.5 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-colors shadow-sm disabled:opacity-40 flex items-center gap-2"
                    >
                        {createMutation.isPending && <LucideLoader2 className="w-4 h-4 animate-spin" />}
                        Agendar Cita
                    </button>
                </div>

                {createMutation.isError && (
                    <div className="px-6 pb-4">
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{String((createMutation.error as Error)?.message || 'Error agendando cita')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
