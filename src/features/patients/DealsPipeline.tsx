import React from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { UniversalPipelineBoard } from '../../components/pipeline/UniversalPipelineBoard'

export const DealsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id

    const { data: dbDeals = [], isLoading: loadingDeals } = useQuery({
        queryKey: ['deals_board', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            // RLS filters deals implicitly. To get patient details we join with patients table.
            const { data, error } = await supabase
                .from('deals')
                .select('*, patients!inner(name, phone, email, sucursal_id)')
                .eq('patients.sucursal_id', branchId);
            
            if (error) throw error;
            
            // Map the joined data so UniversalPipelineBoard can display it properly
            return data.map((d:any) => ({
                ...d,
                patient_name: d.patients?.name || 'Paciente sin nombre',
                phone: d.patients?.phone,
                email: d.patients?.email
            }));
        },
        enabled: !!branchId,
    })

    if (loadingDeals) {
        return <div className="p-8 text-center text-gray-500">Cargando tablero de oportunidades (Deals)...</div>;
    }

    return (
        <UniversalPipelineBoard 
            boardType="deals" 
            tableName="deals" 
            records={dbDeals} 
            queryKeyToInvalidate={['deals_board', branchId]} 
        />
    )
}
