import React, { Suspense } from 'react'
import { useStore } from '../../store/useStore'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import { AdminClinicaDashboard } from './AdminClinicaDashboard'
import { AsesorSucursalDashboard } from './AsesorSucursalDashboard'

// Loading skeleton for dashboard transitions
const DashboardSkeleton = () => (
    <div className="animate-pulse space-y-8 p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-2xl border border-gray-200"></div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="h-96 bg-gray-100 rounded-2xl border border-gray-200 lg:col-span-2"></div>
            <div className="h-96 bg-gray-100 rounded-2xl border border-gray-200"></div>
        </div>
    </div>
)

export const RootDashboard: React.FC = () => {
    const { currentUser } = useStore()

    if (!currentUser) return <DashboardSkeleton />

    return (
        <Suspense fallback={<DashboardSkeleton />}>
            {currentUser.role === 'Super_Admin' && <SuperAdminDashboard />}
            {currentUser.role === 'Admin_Clinica' && <AdminClinicaDashboard />}
            {currentUser.role === 'Asesor_Sucursal' && <AsesorSucursalDashboard />}
        </Suspense>
    )
}
