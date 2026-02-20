import { LucideSearch, LucideMoreVertical, LucideCheckCircle, LucideXCircle, LucidePauseCircle } from 'lucide-react'
import { useStore, Clinic } from '../store/useStore'

export const ClinicsManagement = () => {
    const { clinics, updateClinicStatus } = useStore()

    const getStatusBadge = (status: Clinic['status']) => {
        switch (status) {
            case 'activa': return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">Activa</span>
            case 'pendiente': return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">Pendiente</span>
            case 'suspendida': return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">Suspendida</span>
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Clínicas</h1>
                    <p className="text-gray-500">Administra las suscripciones y accesos.</p>
                </div>
                <div className="relative">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar clínica..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium tracking-wider">
                                <th className="p-6">Clínica</th>
                                <th className="p-6">Plan</th>
                                <th className="p-6">Estado</th>
                                <th className="p-6">Fecha Registro</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {clinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-6">
                                        <div>
                                            <p className="font-semibold text-gray-900">{clinic.name}</p>
                                            <p className="text-sm text-gray-500">{clinic.email_contacto}</p>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                            {clinic.plan}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {getStatusBadge(clinic.status)}
                                    </td>
                                    <td className="p-6 text-sm text-gray-500">
                                        {new Date(clinic.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center justify-end space-x-2">
                                            {clinic.status === 'pendiente' && (
                                                <button
                                                    onClick={() => updateClinicStatus(clinic.id, 'activa')}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors tooltip"
                                                    title="Aprobar"
                                                >
                                                    <LucideCheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {clinic.status === 'activa' && (
                                                <button
                                                    onClick={() => updateClinicStatus(clinic.id, 'suspendida')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Suspender"
                                                >
                                                    <LucidePauseCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {clinic.status === 'suspendida' && (
                                                <button
                                                    onClick={() => updateClinicStatus(clinic.id, 'activa')}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Reactivar"
                                                >
                                                    <LucideCheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                                                <LucideMoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
