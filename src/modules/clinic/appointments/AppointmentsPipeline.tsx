import React, { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { Appointment } from '../../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { UniversalPipelineBoard } from '../../../components/pipeline/UniversalPipelineBoard'
import { AddAppointmentModal } from './AddAppointmentModal'
import { LucideCalendar } from 'lucide-react'

export const AppointmentsPipeline = () => {
    const { currentUser } = useStore()
    const branchId = currentUser?.sucursal_id
    const [showAddAppointment, setShowAddAppointment] = useState(false)

    const { data: dbAppointments = [], isLoading: loadingAppointments } = useQuery({
        queryKey: ['appointments', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            // Assuming appointments have their own 'status' legacy, but now uses 'stage_id' and 'substage_id' for pipelines
            const { data, error } = await supabase.from('appointments').select('*').eq('sucursal_id', branchId).limit(2000);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    if (loadingAppointments) {
        return <div className="p-8 text-center text-gray-500">Cargando citas centralizadas...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <AddAppointmentModal open={showAddAppointment} onClose={() => setShowAddAppointment(false)} />
            <div className="flex items-center justify-end mb-4 pr-2">
                <button
                    onClick={() => setShowAddAppointment(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all shadow-sm"
                >
                    <LucideCalendar className="w-4 h-4" />
                    Agendar Cita
                </button>
            </div>
            <UniversalPipelineBoard 
                boardType="appointments" 
                tableName="appointments" 
                records={dbAppointments} 
                queryKeyToInvalidate={['appointments', branchId]} 
            />
        </div>
    )
}
