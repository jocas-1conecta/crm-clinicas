import { LucideBuilding, LucideTrendingUp, LucideUsers, LucideActivity, LucideAlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'

export const SuperAdminDashboard = () => {
    const { clinics } = useStore()

    // Calculate KPIs
    const totalClinics = clinics.length
    const activeClinics = clinics.filter(c => c.status === 'activa').length
    const pendingClinics = clinics.filter(c => c.status === 'pendiente').length
    // Mocked MRR calculation based on plan
    const estimatedMRR = clinics.reduce((acc, clinic) => {
        if (clinic.status !== 'activa') return acc;
        if (clinic.plan === 'Enterprise') return acc + 299;
        if (clinic.plan === 'Pro') return acc + 99;
        return acc;
    }, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Global</h1>
                <p className="text-gray-500">Vista general de la plataforma SaaS.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <LucideBuilding className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                            +12% mes
                        </span>
                    </div>
                    <span className="text-gray-500 text-sm font-medium">Total Clínicas</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">{totalClinics}</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <LucideActivity className="w-6 h-6" />
                        </div>
                    </div>
                    <span className="text-gray-500 text-sm font-medium">Clínicas Activas</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">{activeClinics}</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <LucideAlertCircle className="w-6 h-6" />
                        </div>
                        {pendingClinics > 0 && (
                            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                                Requiere Atención
                            </span>
                        )}
                    </div>
                    <span className="text-gray-500 text-sm font-medium">Solicitudes Pendientes</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">{pendingClinics}</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <LucideTrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <span className="text-gray-500 text-sm font-medium">MRR Estimado</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">${estimatedMRR}k</span>
                </div>
            </div>

            {/* Recent Activity Section (Mocked) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente de la Plataforma</h3>
                    <div className="space-y-6">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-start space-x-4">
                                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-900 font-medium">Nueva clínica registrada: "Dental Plus"</p>
                                    <p className="text-xs text-gray-500 mt-1">Hace {i + 2} horas • Plan Pro</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-bold mb-2">Estado del Sistema</h3>
                    <p className="text-indigo-100 text-sm mb-6">Todos los servicios operando normalmente.</p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span>Base de Datos</span>
                            <span className="flex items-center text-emerald-300">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                                Online
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>API Gateway</span>
                            <span className="flex items-center text-emerald-300">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                                Online
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Storage</span>
                            <span className="flex items-center text-emerald-300">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                                Online
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
