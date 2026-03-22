import React from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { UniversalPipelineBoard } from '../../components/pipeline/UniversalPipelineBoard'

export const LeadsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id
    const clinicaId = currentUser?.clinica_id

    const { data: dbLeads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ['leads', branchId || clinicaId],
        queryFn: async () => {
            // Only load leads with open stages (not won/lost) for the active Kanban board.
            // Closed leads belong in reports, not on the board. This keeps queries fast.
            let query = supabase.from('leads').select('*')
                .order('created_at', { ascending: false })
                .limit(2000);
            
            if (branchId) {
                query = query.eq('sucursal_id', branchId);
            }
            // If no branchId, RLS already scopes to clinic

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!(branchId || clinicaId),
    })

    if (loadingLeads) {
        return <div className="p-8 text-center text-gray-500">Cargando leads desde el servidor...</div>;
    }

    return (
        <UniversalPipelineBoard 
            boardType="leads" 
            tableName="leads" 
            records={dbLeads} 
            queryKeyToInvalidate={['leads', branchId || clinicaId]} 
        />
    )
}
