import { useState } from 'react'
import { useStore, Patient } from '../store/useStore'
import { LucideSearch, LucideCalendarPlus, LucideUser, LucideFileText } from 'lucide-react'

export const PatientsDirectory = () => {
    const { currentUser, patients } = useStore()
    const [searchTerm, setSearchTerm] = useState('')

    const branchId = currentUser?.sucursal_id

    const filteredPatients = patients.filter(p =>
        p.sucursal_id === branchId &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Directorio de Pacientes</h1>
                    <p className="text-gray-500">Base de datos de pacientes de la sucursal.</p>
                </div>
                <div className="relative">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar paciente..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-clinical-500 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium tracking-wider">
                            <th className="p-6">Paciente</th>
                            <th className="p-6">Contacto</th>
                            <th className="p-6">Condición</th>
                            <th className="p-6">Última Visita</th>
                            <th className="p-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPatients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-clinical-50 p-2 rounded-full text-clinical-600">
                                            <LucideUser className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{patient.name}</p>
                                            <p className="text-xs text-gray-400">{patient.age} años</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-sm text-gray-500">
                                    <p>{patient.email}</p>
                                    <p>{patient.phone}</p>
                                </td>
                                <td className="p-6">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                        {patient.condition}
                                    </span>
                                </td>
                                <td className="p-6 text-sm text-gray-500">
                                    {patient.lastVisit}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                                            <LucideFileText className="w-5 h-5" />
                                        </button>
                                        <button className="flex items-center space-x-1 bg-clinical-600 hover:bg-clinical-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                            <LucideCalendarPlus className="w-4 h-4" />
                                            <span>Cita</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredPatients.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No se encontraron pacientes.
                    </div>
                )}
            </div>
        </div>
    )
}
