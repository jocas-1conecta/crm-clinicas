import React, { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { UniversalPipelineBoard } from '../../components/pipeline/UniversalPipelineBoard'
import { AddLeadModal } from './AddLeadModal'
import { LucideUserPlus, LucideSearch, LucideFilter, LucideX } from 'lucide-react'
import { useClinicTags, useAllEntityTags } from '../../hooks/useClinicTags'

export const LeadsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id
    const clinicaId = currentUser?.clinica_id
    const [showAddLead, setShowAddLead] = useState(false)

    // Toolbar state
    const [search, setSearch] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [filterAdvisor, setFilterAdvisor] = useState('all')
    const [filterSource, setFilterSource] = useState('all')
    const [filterTag, setFilterTag] = useState('all')

    // Tags
    const { data: clinicTags = [] } = useClinicTags()
    const { data: allLeadTags = [] } = useAllEntityTags('lead')
    const leadTagMap = useMemo(() => {
        const map: Record<string, string[]> = {}
        allLeadTags.forEach((et: any) => {
            if (!map[et.entity_id]) map[et.entity_id] = []
            map[et.entity_id].push(et.tag_id)
        })
        return map
    }, [allLeadTags])

    const { data: dbLeads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ['leads', branchId || clinicaId, currentUser?.role],
        queryFn: async () => {
            let query = supabase.from('leads').select('*')
                .order('created_at', { ascending: false })
                .limit(2000);
            
            if (currentUser?.role === 'Asesor_Sucursal') {
                query = query.eq('assigned_to', currentUser.id);
            } else if (currentUser?.role !== 'Super_Admin' && branchId) {
                query = query.eq('sucursal_id', branchId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!(branchId || clinicaId),
    })

    const { data: team = [] } = useQuery({
        queryKey: ['team_members', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name').eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId,
    })

    // Filter records
    const filteredLeads = useMemo(() => {
        let list = [...dbLeads]
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(l => l.name?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q))
        }
        if (filterAdvisor !== 'all') list = list.filter(l => l.assigned_to === filterAdvisor)
        if (filterSource !== 'all') list = list.filter(l => l.source === filterSource)
        if (filterTag !== 'all') list = list.filter(l => (leadTagMap[l.id] || []).includes(filterTag))
        return list
    }, [dbLeads, search, filterAdvisor, filterSource, filterTag, leadTagMap])

    const sources = useMemo(() => [...new Set(dbLeads.map(l => l.source).filter(Boolean))], [dbLeads])
    const activeFilters = (filterAdvisor !== 'all' ? 1 : 0) + (filterSource !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0)

    if (loadingLeads) {
        return <div className="p-8 text-center text-gray-500">Cargando leads desde el servidor...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="relative flex-1 max-w-sm">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar lead..."
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
                <span className="text-xs text-gray-400">{filteredLeads.length} leads</span>
                <button
                    onClick={() => setShowAddLead(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm ml-auto"
                >
                    <LucideUserPlus className="w-4 h-4" />
                    Nuevo Lead
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
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none">
                        <option value="all">Todas las fuentes</option>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {clinicTags.length > 0 && (
                        <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-clinical-500 outline-none">
                            <option value="all">Todas las etiquetas</option>
                            {clinicTags.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                    {activeFilters > 0 && (
                        <button onClick={() => { setFilterAdvisor('all'); setFilterSource('all'); setFilterTag('all') }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                            <LucideX className="w-3 h-3" /> Limpiar ({activeFilters})
                        </button>
                    )}
                </div>
            )}
            <UniversalPipelineBoard 
                boardType="leads" 
                tableName="leads" 
                records={filteredLeads} 
                queryKeyToInvalidate={['leads', branchId || clinicaId]}
                teamMembers={team}
            />
        </div>
    )
}
