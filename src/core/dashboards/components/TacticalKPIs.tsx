import React, { useMemo } from 'react'
import { LucideCalendar, LucideCheckCircle, LucideUsers } from 'lucide-react'

interface TacticalKPIsProps {
    leads: any[]
    appointments: any[]
}

export const TacticalKPIs: React.FC<TacticalKPIsProps> = ({ leads, appointments }) => {
    // Pipeline KPIs Calculation via useMemo for performance
    const statCards = useMemo(() => {
        const newLeadsToday = leads.filter(l =>
            l.status === 'Nuevo' &&
            new Date(l.created_at).toDateString() === new Date().toDateString()
        ).length

        const confirmedAppointments = appointments.filter(a =>
            a.status === 'Confirmada'
        ).length

        const patientsAttended = appointments.filter(a =>
            a.status === 'Atendida'
        ).length

        return [
            { title: 'Nuevos Leads Hoy', value: newLeadsToday, icon: LucideUsers, color: 'blue' },
            { title: 'Citas Confirmadas', value: confirmedAppointments, icon: LucideCalendar, color: 'purple' },
            { title: 'Pacientes Atendidos', value: patientsAttended, icon: LucideCheckCircle, color: 'emerald' },
        ]
    }, [leads, appointments])

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map((stat) => (
                <div key={stat.title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                        <stat.icon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    )
}
