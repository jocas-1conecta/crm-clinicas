import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { LucideSearch, LucideChevronUp, LucideChevronDown, LucideChevronsUpDown, LucidePhone, LucideMail, LucideX, LucideSettings2, LucideUserPlus } from 'lucide-react'
import { PipelineConfig } from '../../../core/organizations/PipelineConfig'
import { AddPatientModal } from './AddPatientModal'

type SortDir = 'asc' | 'desc' | null
type SortKey = 'name' | 'status' | 'created_at'

export const PatientsTable = () => {
    const { currentUser } = useStore()
    const navigate = useNavigate()
    const clinicaId = currentUser?.clinica_id

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [showConfig, setShowConfig] = useState(false)
    const [showAddPatient, setShowAddPatient] = useState(false)

    const { data: patients = [], isLoading } = useQuery({
        queryKey: ['patients-admin-table', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5000)
            if (error) throw error
            return data
        },
        enabled: !!clinicaId,
    })

    // Extract unique statuses for filter
    const uniqueStatuses = useMemo(() => {
        const set = new Set<string>()
        patients.forEach(p => { if (p.status) set.add(p.status) })
        return Array.from(set).sort()
    }, [patients])

    const filtered = useMemo(() => {
        let list = [...patients]
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.phone?.toLowerCase().includes(q) ||
                p.email?.toLowerCase().includes(q)
            )
        }
        if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus)
        return list
    }, [patients, search, filterStatus])

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return filtered
        return [...filtered].sort((a, b) => {
            let valA = (a[sortKey] || '').toString().toLowerCase()
            let valB = (b[sortKey] || '').toString().toLowerCase()
            if (valA < valB) return sortDir === 'asc' ? -1 : 1
            if (valA > valB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [filtered, sortKey, sortDir])

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

    if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando pacientes...</div>

    return (
        <div className="h-full flex flex-col">
            <AddPatientModal open={showAddPatient} onClose={() => setShowAddPatient(false)} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <LucideSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono, email..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5"><LucideX className="w-4 h-4 text-gray-400" /></button>}
                </div>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none shadow-sm">
                    <option value="all">Todos los estados</option>
                    {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {filterStatus !== 'all' && (
                    <button onClick={() => setFilterStatus('all')}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100">
                        <LucideX className="w-3 h-3" /> Limpiar filtro
                    </button>
                )}

                <span className="text-xs text-gray-400 ml-auto">{sorted.length} pacientes</span>
                <button
                    onClick={() => setShowAddPatient(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm"
                >
                    <LucideUserPlus className="w-4 h-4" />
                    Nuevo Paciente
                </button>
                <button onClick={() => setShowConfig(true)} className="p-2 text-gray-400 hover:text-clinical-600 hover:bg-clinical-50 rounded-xl transition-colors" title="Configurar embudo de pacientes">
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
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Nombre <SortIcon col="name" />
                                    </button>
                                </th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Estado <SortIcon col="status" />
                                    </button>
                                </th>
                                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Etiquetas</th>
                                <th className="px-5 py-3">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                        Registro <SortIcon col="created_at" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sorted.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No se encontraron pacientes.</td></tr>
                            ) : sorted.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/pacientes/${patient.id}`)}
                                >
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-clinical-100 rounded-full flex items-center justify-center text-clinical-600 text-[11px] font-bold shrink-0">
                                                {patient.name?.charAt(0)}
                                            </div>
                                            <span className="text-[13px] font-semibold text-gray-900">{patient.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            {patient.phone && <span className="flex items-center gap-1 text-[12px] text-gray-600"><LucidePhone className="w-3 h-3 text-gray-400" />{patient.phone}</span>}
                                            {patient.email && <span className="flex items-center gap-1 text-[12px] text-gray-500"><LucideMail className="w-3 h-3 text-gray-400" />{patient.email}</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="px-2 py-0.5 bg-clinical-50 text-clinical-600 text-[11px] font-bold rounded-lg border border-clinical-100">
                                            {patient.status || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {patient.tags?.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-lg">{tag}</span>
                                            ))}
                                            {patient.tags?.length > 3 && <span className="text-[10px] text-gray-400">+{patient.tags.length - 3}</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-[12px] text-gray-500">
                                            {new Date(patient.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
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
                                Configuración del Embudo de Pacientes
                            </h2>
                            <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <LucideX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <PipelineConfig boardType="deals" embedded />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
