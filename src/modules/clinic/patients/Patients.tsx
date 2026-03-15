import React, { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { LucideSearch, LucideUserPlus, LucideMoreVertical, LucidePhone, LucideKanban, LucideList } from 'lucide-react'
import { PatientDetail } from './PatientDetail'
import { DealsPipeline } from './DealsPipeline'

export const Patients = () => {
    const { currentUser } = useStore()
    const [viewMode, setViewMode] = useState<'board' | 'directory'>('board')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

    const { data: patients = [], isLoading } = useQuery({
        queryKey: ['patients-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    })

    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.status && patient.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (patient.tags && patient.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())))

        return matchesSearch
    })

    return (
        <div className="h-full flex flex-col space-y-6">
            {selectedPatientId && (
                <PatientDetail 
                    patientId={selectedPatientId} 
                    onClose={() => setSelectedPatientId(null)} 
                />
            )}
            <div className="flex items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode('board')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-clinical-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LucideKanban className="w-4 h-4" /> Tablero de Oportunidades
                    </button>
                    <button 
                        onClick={() => setViewMode('directory')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'directory' ? 'bg-white shadow-sm text-clinical-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LucideList className="w-4 h-4" /> Directorio Listado
                    </button>
                </div>
                {viewMode === 'directory' && (
                    <div className="relative max-w-sm w-full ml-4">
                        <LucideSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar pacientes..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex items-center space-x-3 ml-auto">
                    {viewMode === 'directory' && (
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm text-sm">
                            Exportar a CSV
                        </button>
                    )}
                    <button className="flex items-center space-x-2 px-5 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 transition-all shadow-lg shadow-clinical-200 text-sm">
                        <LucideUserPlus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Paciente</span>
                    </button>
                </div>
            </div>

            {viewMode === 'board' ? (
                <DealsPipeline />
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-1">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Edad</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Última Visita</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Etiquetas</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPatients.map((patient) => (
                            <tr 
                                key={patient.id} 
                                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedPatientId(patient.id)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-clinical-100 rounded-full flex items-center justify-center text-clinical-600 font-bold">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{patient.name}</p>
                                            <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                                <LucidePhone className="w-4 h-4 mr-1" />
                                                <span>{patient.phone || 'Sin teléfono'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{patient.age || '--'} años</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{patient.last_visit || 'Sin registros'}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-clinical-50 text-clinical-600 text-xs font-bold rounded-lg border border-clinical-100">
                                        {patient.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {patient.tags?.map((tag: string) => (
                                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-600">
                                        <LucideMoreVertical className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    )
}
