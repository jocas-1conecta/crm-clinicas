import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LucideSearch, LucideUserPlus, LucideMoreVertical, LucideMail, LucidePhone } from 'lucide-react'

export const Patients = () => {
    const { patients, importPatients, currentUser } = useStore()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.condition && patient.condition.toLowerCase().includes(searchTerm.toLowerCase()))

        // If currentUser is an admin, show all patients. Otherwise, show only patients assigned to the current user.
        const matchesRole = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica' || patient.assignedTo === currentUser?.id

        return matchesSearch && matchesRole
    })

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative max-w-md w-full">
                    <LucideSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar pacientes..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={importPatients}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Importar Pacientes
                    </button>
                    <button className="flex items-center space-x-2 px-6 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 transition-all shadow-lg shadow-clinical-200">
                        <LucideUserPlus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Paciente</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Edad</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Última Visita</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Condición</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {patients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-clinical-100 rounded-full flex items-center justify-center text-clinical-600 font-bold">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{patient.name}</p>
                                            <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                                <LucidePhone className="w-4 h-4 mr-1" />
                                                <span>+57 300 123 4567</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{patient.age} años</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{patient.lastVisit}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-clinical-50 text-clinical-600 text-xs font-bold rounded-lg border border-clinical-100">
                                        {patient.condition}
                                    </span>
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
        </div>
    )
}
