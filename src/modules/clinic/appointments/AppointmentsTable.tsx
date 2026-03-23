import React, { useState, useMemo } from 'react'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { LucideSearch, LucideChevronUp, LucideChevronDown, LucideChevronsUpDown, LucidePhone, LucideMail, LucideX, LucideCalendar, LucideSettings2 } from 'lucide-react'
import { PipelineConfig } from '../../../core/organizations/PipelineConfig'

type SortDir = 'asc' | 'desc' | null
type SortKey = 'patient_name' | 'stage' | 'date' | 'created_at'

export const AppointmentsTable = () => {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [filterAdvisor, setFilterAdvisor] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [showConfig, setShowConfig] = useState(false)

    const { data: appointments = [], isLoading } = useQuery({
        queryKey: ['appointments-admin-table', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5000)
            if (error) throw error
            return data
        },
        enabled: !!clinicaId,
    })

    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages_appointments', clinicaId],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipeline_stages')
                .select('*')
                .eq('clinica_id', clinicaId!)
                .eq('board_type', 'appointments')
                .order('sort_order')
            return data || []
        },
        enabled: !!clinicaId,
    })

    const { data: advisors = [] } = useQuery({
        queryKey: ['advisors-list', clinicaId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, name, role').eq('clinica_id', clinicaId!)
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

    const filtered = useMemo(() => {
        let list = [...appointments]
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(a =>
                a.patient_name?.toLowerCase().includes(q) ||
                a.phone?.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q) ||
                a.service?.toLowerCase().includes(q)
            )
        }
        if (filterStatus !== 'all') list = list.filter(a => a.stage_id === filterStatus)
        if (filterAdvisor !== 'all') list = list.filter(a => a.assigned_to === filterAdvisor)
        return list
    }, [appointments, search, filterStatus, filterAdvisor])

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

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
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

    const activeFilters = (filterStatus !== 'all' ? 1 : 0) + (filterAdvisor !== 'all' ? 1 : 0)

    if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando citas...</div>

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por paciente, teléfono, servicio..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5"><LucideX className="w-4 h-4 text-gray-400" /></button>}
                </div>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm">
                    <option value="all">Todos los estados</option>
                    {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select value={filterAdvisor} onChange={(e) => setFilterAdvisor(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm">
                    <option value="all">Todos los asesores</option>
                    {advisors.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                {activeFilters > 0 && (
                    <button onClick={() => { setFilterStatus('all'); setFilterAdvisor('all') }}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100">
                        <LucideX className="w-3 h-3" /> Limpiar ({activeFilters})
                    </button>
                )}

                <span className="text-xs text-gray-400 ml-auto">{sorted.length} citas</span>
                <button onClick={() => setShowConfig(true)} className="p-2 text-gray-400 hover:text-clinical-600 hover:bg-clinical-50 rounded-xl transition-colors" title="Configurar embudo de citas">
                    <LucideSettings2 className="w-5 h-5" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('patient_name')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Paciente <SortIcon col="patient_name" />
                                    </button>
                                </th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Servicio</th>
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
                            {sorted.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No se encontraron citas.</td></tr>
                            ) : sorted.map((appt) => {
                                const stage = stageMap[appt.stage_id]
                                return (
                                    <tr key={appt.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer">
                                        <td className="px-5 py-3">
                                            <span className="text-[13px] font-semibold text-gray-900">{appt.patient_name || appt.name || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                {appt.phone && <span className="flex items-center gap-1 text-[12px] text-gray-600"><LucidePhone className="w-3 h-3 text-gray-400" />{appt.phone}</span>}
                                                {appt.email && <span className="flex items-center gap-1 text-[12px] text-gray-500"><LucideMail className="w-3 h-3 text-gray-400" />{appt.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-gray-600">{appt.service || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {stage && (
                                                <span className="text-[11px] font-bold px-2 py-1 rounded-lg"
                                                    style={{ backgroundColor: stage.color + '18', color: stage.color }}>
                                                    {stage.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-gray-600">{advisorMap[appt.assigned_to] || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-gray-500">
                                                {appt.date ? new Date(appt.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : new Date(appt.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showConfig && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfig(false)} />
                    <div className="relative w-full max-w-2xl bg-gray-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <LucideSettings2 className="w-5 h-5 text-clinical-600" />
                                Configuración del Embudo de Citas
                            </h2>
                            <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <LucideX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <PipelineConfig boardType="appointments" embedded />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
