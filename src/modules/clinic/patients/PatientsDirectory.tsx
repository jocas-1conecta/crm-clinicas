import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { LucideSearch, LucideCalendarPlus, LucideUser, LucideFileText, LucideKanban, LucideList, LucideUserPlus } from 'lucide-react'
import { DealsPipeline } from './DealsPipeline'
import { AddPatientModal } from './AddPatientModal'

export const PatientsDirectory = () => {
    const { currentUser } = useStore()
    const navigate = useNavigate()
    const [viewMode, setViewMode] = useState<'board' | 'directory'>('board')
    const [searchTerm, setSearchTerm] = useState('')
    const [showAddPatient, setShowAddPatient] = useState(false)

    const branchId = currentUser?.sucursal_id
    const isAdvisor = currentUser?.role === 'Asesor_Sucursal'

    const { data: dbPatients = [], isLoading } = useQuery({
        queryKey: ['patients', branchId, currentUser?.id, currentUser?.role],
        queryFn: async () => {
            if (!branchId) return [];
            let query = supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });

            if (isAdvisor) {
                // Advisors only see patients assigned to them
                query = query.eq('assigned_to', currentUser!.id)
            } else {
                query = query.eq('sucursal_id', branchId)
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const filteredPatients = dbPatients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: filteredPatients.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80, // Estimated row height in pixels
        overscan: 5,
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pacientes y Oportunidades</h1>
                    <p className="text-gray-500">Base de datos de la cartera y negocios.</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl mx-4">
                    <button 
                        onClick={() => setViewMode('board')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-clinical-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LucideKanban className="w-4 h-4" /> Oportunidades
                    </button>
                    <button 
                        onClick={() => setViewMode('directory')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'directory' ? 'bg-white shadow-sm text-clinical-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LucideList className="w-4 h-4" /> Directorio
                    </button>
                </div>
                
                {viewMode === 'directory' && (
                    <div className="relative">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-clinical-500 w-64 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddPatient(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm"
                    >
                        <LucideUserPlus className="w-4 h-4" />
                        Nuevo Paciente
                    </button>
                </div>
            </div>
            <AddPatientModal open={showAddPatient} onClose={() => setShowAddPatient(false)} />

            {viewMode === 'board' ? (
                <DealsPipeline />
            ) : (
                <div
                    ref={parentRef}
                    className="bg-white border border-gray-200 rounded-2xl overflow-auto shadow-sm"
                    style={{ height: '500px' }} // Fixed height for the scroll container
                >
                <table className="w-full text-left border-collapse" style={{ display: 'grid' }}>
                    <thead style={{
                        display: 'grid',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: '#f9fafb'
                    }}>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium tracking-wider" style={{ display: 'flex', width: '100%' }}>
                            <th className="p-4 flex-1">Paciente</th>
                            <th className="p-4 flex-1">Contacto</th>
                            <th className="p-4 flex-1">Estado</th>
                            <th className="p-4 flex-1">Última Visita</th>
                            <th className="p-4 flex-1 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody
                        className="divide-y divide-gray-100 relative"
                        style={{
                            display: 'block',
                            height: `${rowVirtualizer.getTotalSize()}px`,
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const patient = filteredPatients[virtualRow.index]
                            return (
                                <tr
                                    key={patient.id}
                                    className="hover:bg-gray-50 transition-colors absolute w-full cursor-pointer"
                                    onClick={() => navigate(`/pacientes/${patient.id}`)}
                                    style={{
                                        display: 'flex',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                <td className="p-4 flex-1 flex items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-clinical-50 p-2 rounded-full text-clinical-600">
                                            <LucideUser className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{patient.name}</p>
                                            <p className="text-xs text-gray-400">{patient.age} años</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 flex-1 flex flex-col justify-center text-xs text-gray-500">
                                    <p className="truncate">{patient.email}</p>
                                    <p>{patient.phone}</p>
                                </td>
                                <td className="p-4 flex-1 flex items-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700">
                                        {patient.status}
                                    </span>
                                </td>
                                <td className="p-4 flex-1 flex items-center text-xs text-gray-500">
                                    {patient.last_visit || 'Sin registros'}
                                </td>
                                <td className="p-4 flex-1 flex items-center justify-end">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg">
                                            <LucideFileText className="w-4 h-4" />
                                        </button>
                                        <button className="flex items-center space-x-1 bg-clinical-600 hover:bg-clinical-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                            <LucideCalendarPlus className="w-4 h-4" />
                                            <span>Cita</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>

                {isLoading && (
                    <div className="p-12 text-center text-gray-500">
                        Cargando pacientes desde la base de datos...
                    </div>
                )}
                {!isLoading && filteredPatients.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No se encontraron pacientes.
                    </div>
                )}
                </div>
            )}
        </div>
    )
}
