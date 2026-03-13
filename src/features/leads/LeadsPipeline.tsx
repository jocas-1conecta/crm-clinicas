import React from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { UniversalPipelineBoard } from '../../components/pipeline/UniversalPipelineBoard'

export const LeadsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id

    const { data: dbLeads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ['leads', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('leads').select('*').eq('sucursal_id', branchId);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    if (loadingLeads) {
        return <div className="p-8 text-center text-gray-500">Cargando leads desde el servidor...</div>;
    }

    return (
        <UniversalPipelineBoard 
            boardType="leads" 
            tableName="leads" 
            records={dbLeads} 
            queryKeyToInvalidate={['leads', branchId]} 
        />
    )
}
