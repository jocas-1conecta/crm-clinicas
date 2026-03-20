import React from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { DashboardKPIs } from './components/DashboardKPIs'
import { LeadsByServiceChart } from './components/LeadsByServiceChart'
import { RecentActivityFeed } from './components/RecentActivityFeed'

export const AdminClinicaDashboard: React.FC = () => {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id

    const { data: leads = [] } = useQuery({
        queryKey: ['leads-admin', clinicaId],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('leads').select('id, name, status, phone, email, assigned_to, service, source, sucursal_id, created_at').eq('clinica_id', clinicaId).order('created_at', { ascending: false }).limit(500);
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages', clinicaId],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data } = await supabase.from('pipeline_stages').select('*').eq('clinica_id', clinicaId);
            return data || [];
        },
        enabled: !!clinicaId
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments-admin', clinicaId],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('appointments').select('id, patientName, doctorName, date, time, status, sucursal_id, assigned_to').eq('clinica_id', clinicaId).limit(500);
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: services = [] } = useQuery({
        queryKey: ['services', clinicaId],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('services').select('*').eq('clinica_id', clinicaId);
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                 <h1 className="text-3xl font-bold text-gray-900">Dashboard Operativo de Clínica</h1>
                 <p className="text-gray-500">Rendimiento consolidado y métricas de todas tus sucursales activas.</p>
            </div>

            <DashboardKPIs 
                leads={leads} 
                stages={stages} 
                appointments={appointments} 
                services={services} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LeadsByServiceChart leads={leads} services={services} />
                <RecentActivityFeed leads={leads} />
            </div>
        </div>
    )
}
