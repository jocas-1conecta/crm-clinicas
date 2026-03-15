import React, { useMemo } from 'react'
import { LucideUsers, LucideTrendingUp, LucideClock, LucideDollarSign } from 'lucide-react'

interface DashboardKPIsProps {
    leads: any[]
    stages: any[]
    appointments: any[]
    services: any[]
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ leads, stages, appointments, services }) => {
    // Pipeline KPIs Calculation via useMemo for performance
    const stats = useMemo(() => {
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

        // Simulated Revenue: Sum of prices of 'Atendida' appointments
        const revenue = appointments
            .filter(a => a.status === 'Atendida')
            .reduce((acc, curr) => {
                const service = services.find((s: any) => s.name === curr.service_name || s.name === curr.serviceName)
                return acc + (service ? Number(service.price) : 0)
            }, 0)

        return [
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
    }, [leads, stages, appointments, services])

    return (
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
    )
}
