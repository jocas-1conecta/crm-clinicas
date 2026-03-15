import React, { useMemo } from 'react'
import { LucideBuilding, LucideTrendingUp, LucideActivity, LucideAlertCircle } from 'lucide-react'

interface GlobalKPIsProps {
    clinics: any[]
}

export const GlobalKPIs: React.FC<GlobalKPIsProps> = ({ clinics }) => {
    // Calculate KPIs using useMemo for performance
    const stats = useMemo(() => {
        const totalClinics = clinics.length
        const activeClinics = clinics.filter(c => c.status === 'activa').length
        const pendingClinics = clinics.filter(c => c.status === 'pendiente').length
        
        // Calculate MRR projection based on active plans
        const estimatedMRR = clinics.reduce((acc, clinic) => {
            if (clinic.status !== 'activa') return acc;
            if (clinic.plan === 'Enterprise') return acc + 299;
            if (clinic.plan === 'Pro') return acc + 99;
            return acc;
        }, 0);

        return { totalClinics, activeClinics, pendingClinics, estimatedMRR }
    }, [clinics])

    return (
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
                <span className="text-3xl font-bold text-gray-900 mt-1">{stats.totalClinics}</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <LucideActivity className="w-6 h-6" />
                    </div>
                </div>
                <span className="text-gray-500 text-sm font-medium">Clínicas Activas</span>
                <span className="text-3xl font-bold text-gray-900 mt-1">{stats.activeClinics}</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <LucideAlertCircle className="w-6 h-6" />
                    </div>
                    {stats.pendingClinics > 0 && (
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                            Requiere Atención
                        </span>
                    )}
                </div>
                <span className="text-gray-500 text-sm font-medium">Solicitudes Pendientes</span>
                <span className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingClinics}</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <LucideTrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <span className="text-gray-500 text-sm font-medium">MRR Estimado</span>
                <span className="text-3xl font-bold text-gray-900 mt-1">${stats.estimatedMRR}k</span>
            </div>
        </div>
    )
}
