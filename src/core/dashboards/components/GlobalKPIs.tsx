import React, { useMemo } from 'react'
import { LucideBuilding, LucideActivity, LucideAlertCircle } from 'lucide-react'

interface GlobalKPIsProps {
    clinics: any[]
}

export const GlobalKPIs: React.FC<GlobalKPIsProps> = ({ clinics }) => {
    const stats = useMemo(() => {
        const totalClinics = clinics.length
        const activeClinics = clinics.filter(c => c.status === 'activa').length
        const pendingClinics = clinics.filter(c => c.status === 'pendiente').length
        return { totalClinics, activeClinics, pendingClinics }
    }, [clinics])

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <LucideBuilding className="w-6 h-6" />
                    </div>
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
        </div>
    )
}
