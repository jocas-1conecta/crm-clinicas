import React, { useState, useMemo } from 'react'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { UniversalPipelineBoard } from '../../../components/pipeline/UniversalPipelineBoard'
import { LucideSearch, LucideFilter, LucideX } from 'lucide-react'

export const DealsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id
    const clinicaId = currentUser?.clinica_id

    // Toolbar state
    const [search, setSearch] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [filterAdvisor, setFilterAdvisor] = useState('all')

    const { data: dbDeals = [], isLoading: loadingDeals } = useQuery({
        queryKey: ['deals_board', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('deals')
                .select('*, patients!inner(name, phone, email, sucursal_id)')
                .eq('patients.sucursal_id', branchId);
            
            if (error) throw error;
            
            return data.map((d:any) => ({
                ...d,
                patient_name: d.patients?.name || 'Paciente sin nombre',
                phone: d.patients?.phone,
                email: d.patients?.email
            }));
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

    const filteredDeals = useMemo(() => {
        let list = [...dbDeals]
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(d => d.patient_name?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || d.title?.toLowerCase().includes(q))
        }
        if (filterAdvisor !== 'all') list = list.filter(d => d.assigned_to === filterAdvisor)
        return list
    }, [dbDeals, search, filterAdvisor])

    const activeFilters = filterAdvisor !== 'all' ? 1 : 0

    if (loadingDeals) {
        return <div className="p-8 text-center text-gray-500">Cargando tablero de oportunidades (Deals)...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-3 px-1">
                <div className="relative flex-1 max-w-sm">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar oportunidad..."
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
                <span className="text-xs text-gray-400">{filteredDeals.length} oportunidades</span>
            </div>
            {/* Filter bar */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-3 mb-3 px-1 py-3 bg-gray-50 border border-gray-200 rounded-xl">
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
                boardType="deals" 
                tableName="deals" 
                records={filteredDeals} 
                queryKeyToInvalidate={['deals_board', branchId]}
                teamMembers={team}
            />
        </div>
    )
}
