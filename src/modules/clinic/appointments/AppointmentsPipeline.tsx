import React from 'react'
import { useStore } from '../../../store/useStore'
import { Appointment } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { UniversalPipelineBoard } from '../../../components/pipeline/UniversalPipelineBoard'

export const AppointmentsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id

    const { data: dbAppointments = [], isLoading: loadingAppointments } = useQuery({
        queryKey: ['appointments', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            // Assuming appointments have their own 'status' legacy, but now uses 'stage_id' and 'substage_id' for pipelines
            const { data, error } = await supabase.from('appointments').select('*').eq('sucursal_id', branchId).limit(500);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    if (loadingAppointments) {
        return <div className="p-8 text-center text-gray-500">Cargando citas centralizadas...</div>;
    }

    return (
        <UniversalPipelineBoard 
            boardType="appointments" 
            tableName="appointments" 
            records={dbAppointments} 
            queryKeyToInvalidate={['appointments', branchId]} 
        />
    )
}
