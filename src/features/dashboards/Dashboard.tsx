import React from 'react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import {
    LucideUsers,
    LucideTrendingUp,
    LucideCalendar,
    LucideDollarSign,
    LucideActivity,
    LucidePieChart,
    LucideClock
} from 'lucide-react'

export const Dashboard = () => {
    const { currentUser } = useStore()
    const clinicaId = currentUser?.clinica_id

    const { data: leads = [] } = useQuery({
        queryKey: ['leads-admin', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
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
            const { data, error } = await supabase.from('appointments').select('*');
            if (error) throw error;
            return data;
        }
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

    // Pipeline KPIs Calculation
    const totalLeads = leads.length
    
    // Map leads by their stage resolution_type
    const getResolutionType = (stageId: string) => {
        const s = stages.find((st:any) => st.id === stageId);
        return s ? s.resolution_type : 'open';
    }

    const wonLeads = leads.filter(l => getResolutionType(l.stage_id) === 'won');
    const lostLeads = leads.filter(l => getResolutionType(l.stage_id) === 'lost');
    const openLeads = leads.filter(l => getResolutionType(l.stage_id) === 'open');

    // Win Rate Calculation (Won / (Won + Lost))
    const closedContext = wonLeads.length + lostLeads.length;
    const winRate = closedContext > 0 ? ((wonLeads.length / closedContext) * 100).toFixed(1) : '0';

    // Avg Time to Close (Days)
    let avgCloseTimeDays = 0;
    if (wonLeads.length > 0) {
        let totalTimeMs = 0;
        let validWonLeads = 0;
        wonLeads.forEach(l => {
            if (l.closed_at && l.created_at) {
                totalTimeMs += (new Date(l.closed_at).getTime() - new Date(l.created_at).getTime());
                validWonLeads++;
            }
        });
        if (validWonLeads > 0) {
            avgCloseTimeDays = Math.max(1, Math.round((totalTimeMs / validWonLeads) / (1000 * 60 * 60 * 24)));
        }
    }

    const activeAppointments = appointments.filter(a =>
        ['Solicitada', 'Por Confirmar', 'Confirmada'].includes(a.status)
    ).length

    // Simulated Revenue: Sum of prices of 'Atendida' appointments
    const revenue = appointments
        .filter(a => a.status === 'Atendida')
        .reduce((acc, curr) => {
            const service = services.find((s: any) => s.name === curr.service_name || s.name === curr.serviceName)
            return acc + (service ? Number(service.price) : 0)
        }, 0)

    const stats = [
        {
            label: 'Total Leads (Activos)',
            value: openLeads.length,
            change: `${totalLeads} Históricos`,
            icon: LucideUsers,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            label: 'Win Rate (Eficacia)',
            value: `${winRate}%`,
            change: `${wonLeads.length} de ${closedContext} resueltos`,
            icon: LucideTrendingUp,
            color: 'bg-green-50 text-green-600'
        },
        {
            label: 'Tiempo a Cierre',
            value: `${avgCloseTimeDays} Días`,
            change: 'Promedio aprox.',
            icon: LucideClock,
            color: 'bg-purple-50 text-purple-600'
        },
        {
            label: 'Ingresos Estimados (Citas)',
            value: `$${revenue.toLocaleString()}`,
            change: 'Estimado mensual',
            icon: LucideDollarSign,
            color: 'bg-emerald-50 text-emerald-600'
        },
    ]

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads by Service */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <LucidePieChart className="w-5 h-5 text-gray-400" />
                            </div>
                            <h3 className="font-bold text-gray-900">Leads por Especialidad</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {services.map((service: any) => {
                            const count = leads.filter(l => l.service === service.name || (l.service && service.name.includes(l.service))).length
                            const percentage = totalLeads > 0 ? Math.min(100, Math.round((count / totalLeads) * 100)) : 0

                            return (
                                <div key={service.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700">{service.name}</span>
                                        <span className="text-gray-500">{count} leads</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-1000 bg-${service.color || 'blue'}-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <LucideActivity className="w-5 h-5 text-gray-400" />
                            </div>
                            <h3 className="font-bold text-gray-900">Actividad Reciente</h3>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {leads.slice(0, 5).map((lead) => (
                            <div key={lead.id} className="flex items-start space-x-4">
                                <div className="w-2 h-2 mt-2 rounded-full bg-clinical-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        Nuevo lead registrado: <span className="font-bold">{lead.name}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Interesado en {lead.service} • Hace 2 horas
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
