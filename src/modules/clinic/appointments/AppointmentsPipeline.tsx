import React, { useState, useMemo } from 'react'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { UniversalPipelineBoard } from '../../../components/pipeline/UniversalPipelineBoard'
import { AddAppointmentModal } from './AddAppointmentModal'
import { LucideCalendar, LucideSearch, LucideFilter, LucideX } from 'lucide-react'

export const AppointmentsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id
    const clinicaId = currentUser?.clinica_id
    const [showAddAppointment, setShowAddAppointment] = useState(false)

    // Toolbar state
    const [search, setSearch] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [filterAdvisor, setFilterAdvisor] = useState('all')

    const { data: dbAppointments = [], isLoading: loadingAppointments } = useQuery({
        queryKey: ['appointments', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('appointments').select('id, patient_name, name, phone, email, service, service_name, doctor_name, stage_id, assigned_to, sucursal_id, date, appointment_date, appointment_time, status, created_at').eq('sucursal_id', branchId).limit(2000);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const { data: team = [] } = useQuery({
        queryKey: ['team_members', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId,
    })

    const filteredAppointments = useMemo(() => {
        let list = [...dbAppointments]
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(a => a.patient_name?.toLowerCase().includes(q) || a.phone?.toLowerCase().includes(q) || a.service_name?.toLowerCase().includes(q) || a.doctor_name?.toLowerCase().includes(q))
        }
        if (filterAdvisor !== 'all') list = list.filter(a => a.assigned_to === filterAdvisor)
        return list
    }, [dbAppointments, search, filterAdvisor])

    const activeFilters = filterAdvisor !== 'all' ? 1 : 0

    if (loadingAppointments) {
        return <div className="p-8 text-center text-gray-500">Cargando citas centralizadas...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <AddAppointmentModal open={showAddAppointment} onClose={() => setShowAddAppointment(false)} />
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative flex-1 max-w-sm">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar cita..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5"><LucideX className="w-4 h-4 text-gray-400" /></button>}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative p-2 rounded-xl border transition-colors ${showFilters || activeFilters > 0 ? 'bg-clinical-50 border-clinical-200 text-clinical-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                    <LucideFilter className="w-5 h-5" />
                    {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-clinical-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilters}</span>}
                </button>
                <span className="text-xs text-gray-400">{filteredAppointments.length} citas</span>
                <button
                    onClick={() => setShowAddAppointment(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm ml-auto"
                >
                    <LucideCalendar className="w-4 h-4" />
                    Agendar Cita
                </button>
            </div>
            {/* Filter bar */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-3 mb-4 px-2 py-3 bg-gray-50 border border-gray-200 rounded-xl mx-2">
                    <select value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none">
                        <option value="all">Todos los asesores</option>
                        {team.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {activeFilters > 0 && (
                        <button onClick={() => setFilterAdvisor('all')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                            <LucideX className="w-3 h-3" /> Limpiar
                        </button>
                    )}
                </div>
            )}
            <UniversalPipelineBoard 
                boardType="appointments" 
                tableName="appointments" 
                records={filteredAppointments} 
                queryKeyToInvalidate={['appointments', branchId]}
                teamMembers={team}
            />
        </div>
    )
}
