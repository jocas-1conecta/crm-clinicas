import React from 'react'
import { TacticalKPIs } from './components/TacticalKPIs'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const AsesorSucursalDashboard: React.FC = () => {
    const { currentUser } = useStore()

    // Filter by branch
    const branchId = currentUser?.sucursal_id || ''

    const { data: leads = [] } = useQuery({
        queryKey: ['leads', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('leads').select('id, name, status, phone, assigned_to, sucursal_id, created_at').eq('sucursal_id', branchId).limit(500);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('appointments').select('id, status, sucursal_id, assigned_to').eq('sucursal_id', branchId).limit(500);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Operativo</h1>
                <p className="text-gray-500">Resumen de actividad para la sucursal {branchId}.</p>
            </div>

            <TacticalKPIs leads={leads} appointments={appointments} />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Próximos Pasos</h3>
                <p className="text-gray-500">Revisa tu pipeline de leads para gestionar los nuevos prospectos o confirma las citas de mañana.</p>
            </div>
        </div>
    )
}
