import React from 'react'
import { GlobalKPIs } from './components/GlobalKPIs'
import { AdminActivityFeed } from './components/AdminActivityFeed'
import { SystemStatus } from './components/SystemStatus'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const SuperAdminDashboard = () => {
    const { data: clinics = [] } = useQuery({
        queryKey: ['clinicas-dashboard'],
        queryFn: async () => {
            const { data, error } = await supabase.from('clinicas').select('*');
            if (error) throw error;
            return data;
        }
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Global</h1>
                <p className="text-gray-500">Vista general de la plataforma SaaS.</p>
            </div>

            {/* KPI Cards */}
            <GlobalKPIs clinics={clinics} />

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <AdminActivityFeed clinics={clinics} />
                <SystemStatus />
            </div>
        </div>
    )
}
