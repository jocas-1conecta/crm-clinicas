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
            // Super_Admin has no sucursal_id — query all leads for their clinic instead
            if (branchId) {
                const { data, error } = await supabase.from('leads').select('*').eq('sucursal_id', branchId).order('created_at', { ascending: false }).limit(500);
                if (error) throw error;
                return data;
            } else if (clinicaId) {
                const { data, error } = await supabase.from('leads').select('*').eq('clinica_id', clinicaId).order('created_at', { ascending: false }).limit(500);
                if (error) throw error;
                return data;
            }
            return [];
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
