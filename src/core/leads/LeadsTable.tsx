import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideSearch, LucideFilter, LucideChevronUp, LucideChevronDown, LucideChevronsUpDown, LucidePhone, LucideMail, LucideX, LucideSettings2, LucideUserPlus, LucideChevronLeft, LucideChevronRight, LucideUsers } from 'lucide-react'
import { AddLeadModal } from './AddLeadModal'
import { PipelineConfig } from '../organizations/PipelineConfig'
import { useClinicTags, useAllEntityTags } from '../../hooks/useClinicTags'

type SortDir = 'asc' | 'desc' | null
type SortKey = 'name' | 'source' | 'stage' | 'created_at'

export const LeadsTable = () => {
    const { currentUser } = useStore()
    const navigate = useNavigate()
    const clinicaId = currentUser?.clinica_id

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [filterAdvisor, setFilterAdvisor] = useState<string>('all')
    const [filterTag, setFilterTag] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [showConfig, setShowConfig] = useState(false)
    const [showAddLead, setShowAddLead] = useState(false)
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 50
    const queryClient = useQueryClient()

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkAssignTo, setBulkAssignTo] = useState<string>('')
    const [bulkAssigning, setBulkAssigning] = useState(false)

    // Fetch leads
    const { data: leads = [], isLoading } = useQuery({
        queryKey: ['leads-admin-table', clinicaId, currentUser?.role, currentUser?.id],
        queryFn: async () => {
            let query = supabase
                .from('leads')
                .select('*')
                .or('is_converted.is.null,is_converted.eq.false')
                .order('created_at', { ascending: false })
                .limit(5000)

            // Asesor_Sucursal: only their assigned leads
            if (currentUser?.role === 'Asesor_Sucursal') {
                query = query.eq('assigned_to', currentUser.id)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        enabled: !!clinicaId,
    })

    // Fetch pipeline stages for status labels
    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages_leads', clinicaId],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipeline_stages')
                .select('*')
                .eq('clinica_id', clinicaId!)
                .eq('board_type', 'leads')
                .order('sort_order')
            return data || []
        },
        enabled: !!clinicaId,
    })

    // Fetch advisors (profiles with role Asesor_Sucursal or Admin_Clinica)
    const { data: advisors = [] } = useQuery({
        queryKey: ['advisors-list', clinicaId],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, name, role')
                .eq('clinica_id', clinicaId!)
            return data || []
        },
        enabled: !!clinicaId,
    })

    const stageMap = useMemo(() => {
        const map: Record<string, { name: string, color: string }> = {}
        stages.forEach((s: any) => { map[s.id] = { name: s.name, color: s.color || '#6b7280' } })
        return map
    }, [stages])

    const advisorMap = useMemo(() => {
        const map: Record<string, string> = {}
        advisors.forEach((a: any) => { map[a.id] = a.name })
        return map
    }, [advisors])

    // Tags for filtering
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

    // Filter + search
    const filtered = useMemo(() => {
        let list = [...leads]
        
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.phone?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.source?.toLowerCase().includes(q)
            )
        }
        if (filterStatus !== 'all') {
            list = list.filter(l => l.stage_id === filterStatus)
        }
        if (filterAdvisor === 'unassigned') {
            list = list.filter(l => !l.assigned_to)
        } else if (filterAdvisor !== 'all') {
            list = list.filter(l => l.assigned_to === filterAdvisor)
        }
        if (filterTag !== 'all') {
            list = list.filter(l => (leadTagMap[l.id] || []).includes(filterTag))
        }
        return list
    }, [leads, search, filterStatus, filterAdvisor, filterTag, leadTagMap])

    // Sort
    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return filtered
        return [...filtered].sort((a, b) => {
            let valA: any, valB: any
            if (sortKey === 'stage') {
                valA = stageMap[a.stage_id]?.name || ''
                valB = stageMap[b.stage_id]?.name || ''
            } else {
                valA = a[sortKey] || ''
                valB = b[sortKey] || ''
            }
            if (typeof valA === 'string') valA = valA.toLowerCase()
            if (typeof valB === 'string') valB = valB.toLowerCase()
            if (valA < valB) return sortDir === 'asc' ? -1 : 1
            if (valA > valB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortKey, sortDir, stageMap])

    // Pagination
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
    const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page])

    // Reset page when filters change
    useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [search, filterStatus, filterAdvisor, filterTag])

    // Toggle selection helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const toggleSelectAll = () => {
        if (selectedIds.size === paginated.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(paginated.map(l => l.id)))
        }
    }

    // Bulk assign mutation
    const handleBulkAssign = async () => {
        if (!bulkAssignTo || selectedIds.size === 0) return
        setBulkAssigning(true)
        try {
            const assignValue = bulkAssignTo === 'none' ? null : bulkAssignTo
            const ids = Array.from(selectedIds)
            const { error } = await supabase
                .from('leads')
                .update({ assigned_to: assignValue })
                .in('id', ids)
            if (error) throw error
            queryClient.invalidateQueries({ queryKey: ['leads-admin-table'] })
            setSelectedIds(new Set())
            setBulkAssignTo('')
        } catch (err: any) {
            alert('Error: ' + (err.message || err))
        } finally {
            setBulkAssigning(false)
        }
    }

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
            if (sortDir === null) setSortKey(key)
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col || !sortDir) return <LucideChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        return sortDir === 'asc'
            ? <LucideChevronUp className="w-3.5 h-3.5 text-clinical-600" />
            : <LucideChevronDown className="w-3.5 h-3.5 text-clinical-600" />
    }

    const activeFilters = (filterStatus !== 'all' ? 1 : 0) + (filterAdvisor !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0)

    if (isLoading) {
        return <div className="p-8 text-center text-gray-400 text-sm">Cargando leads...</div>
    }

    return (
        <div className="h-full flex flex-col">
            <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono, email, origen..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-2.5">
                            <LucideX className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm"
                >
                    <option value="all">Todos los estados</option>
                    {stages.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                {/* Advisor Filter */}
                <select
                    value={filterAdvisor}
                    onChange={(e) => setFilterAdvisor(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm"
                >
                    <option value="all">Todos los asesores</option>
                    <option value="unassigned">⚠ Sin asignar</option>
                    {advisors.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>

                {/* Tag Filter */}
                {clinicTags.length > 0 && (
                    <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm"
                    >
                        <option value="all">Todas las etiquetas</option>
                        {clinicTags.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}

                {activeFilters > 0 && (
                    <button
                        onClick={() => { setFilterStatus('all'); setFilterAdvisor('all'); setFilterTag('all') }}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                        <LucideX className="w-3 h-3" />
                        Limpiar filtros ({activeFilters})
                    </button>
                )}

                <span className="text-xs text-gray-400 ml-auto">{sorted.length} leads</span>
                <button
                    onClick={() => setShowAddLead(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm"
                >
                    <LucideUserPlus className="w-4 h-4" />
                    Nuevo Lead
                </button>
                <button
                    onClick={() => setShowConfig(true)}
                    className="p-2 text-gray-400 hover:text-clinical-600 hover:bg-clinical-50 rounded-xl transition-colors"
                    title="Configurar embudo de leads"
                >
                    <LucideSettings2 className="w-5 h-5" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-3 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={paginated.length > 0 && selectedIds.size === paginated.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-clinical-600 focus:ring-clinical-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Nombre <SortIcon col="name" />
                                    </button>
                                </th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('source')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Origen <SortIcon col="source" />
                                    </button>
                                </th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('stage')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Estado <SortIcon col="stage" />
                                    </button>
                                </th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Asesor</th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Fecha <SortIcon col="created_at" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginated.length === 0 ? (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No se encontraron leads con los filtros actuales.</td></tr>
                            ) : paginated.map((lead) => {
                                const stage = stageMap[lead.stage_id]
                                return (
                                    <tr
                                        key={lead.id}
                                        className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${selectedIds.has(lead.id) ? 'bg-clinical-50/40' : ''}`}
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                    >
                                        <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(lead.id)}
                                                onChange={() => toggleSelect(lead.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-clinical-600 focus:ring-clinical-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[13px] font-semibold text-gray-900">{lead.name}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                {lead.phone && (
                                                    <span className="flex items-center gap-1 text-[12px] text-gray-600">
                                                        <LucidePhone className="w-3 h-3 text-gray-400" />{lead.phone}
                                                    </span>
                                                )}
                                                {lead.email && (
                                                    <span className="flex items-center gap-1 text-[12px] text-gray-500">
                                                        <LucideMail className="w-3 h-3 text-gray-400" />{lead.email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {lead.source && (
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                    lead.source.includes('Bot') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {lead.source}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            {stage && (
                                                <span
                                                    className="text-[11px] font-bold px-2 py-1 rounded-lg"
                                                    style={{ backgroundColor: stage.color + '18', color: stage.color }}
                                                >
                                                    {stage.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-gray-600">
                                                {advisorMap[lead.assigned_to] || (lead.assigned_to ? 'Sin nombre' : '—')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-gray-500">
                                                {new Date(lead.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 mt-2">
                    <span className="text-xs text-gray-400">{sorted.length} leads · Página {page} de {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <LucideChevronLeft className="w-4 h-4" /> Anterior
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            Siguiente <LucideChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <span className="text-sm font-medium">
                        {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                    </span>
                    <div className="w-px h-5 bg-gray-600" />
                    <div className="flex items-center gap-2">
                        <LucideUsers className="w-4 h-4 text-gray-400" />
                        <select
                            value={bulkAssignTo}
                            onChange={e => setBulkAssignTo(e.target.value)}
                            className="bg-gray-800 text-white text-sm rounded-lg border border-gray-600 px-3 py-1.5 focus:ring-2 focus:ring-clinical-500 outline-none"
                        >
                            <option value="">Asignar a...</option>
                            <option value="none">❌ Quitar asignación</option>
                            {advisors.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkAssign}
                            disabled={!bulkAssignTo || bulkAssigning}
                            className="px-4 py-1.5 bg-clinical-600 text-white text-sm font-bold rounded-lg hover:bg-clinical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {bulkAssigning ? 'Asignando...' : 'Aplicar'}
                        </button>
                    </div>
                    <button
                        onClick={() => { setSelectedIds(new Set()); setBulkAssignTo('') }}
                        className="ml-2 p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <LucideX className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Pipeline Config Drawer */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfig(false)} />
                    <div className="relative w-full max-w-2xl bg-gray-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <LucideSettings2 className="w-5 h-5 text-clinical-600" />
                                Configuración del Embudo de Leads
                            </h2>
                            <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <LucideX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <PipelineConfig boardType="leads" embedded />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
