import React from 'react'
import { useStore } from '../store/useStore'
import {
    LucideUsers,
    LucideTrendingUp,
    LucideCalendar,
    LucideDollarSign,
    LucideActivity,
    LucidePieChart
} from 'lucide-react'

export const Dashboard = () => {
    const { leads, appointments, config } = useStore()

    // KPIs Calculation
    const totalLeads = leads.length
    const qualifiedLeads = leads.filter(l => l.status === 'Cita Agendada').length
    const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0'

    const activeAppointments = appointments.filter(a =>
        ['Solicitada', 'Por Confirmar', 'Confirmada'].includes(a.status)
    ).length

    // Simulated Revenue: Sum of prices of 'Atendida' appointments
    // We match service name from appointment to service price in config
    const revenue = appointments
        .filter(a => a.status === 'Atendida')
        .reduce((acc, curr) => {
            const service = config.services.find((s: any) => s.name === curr.serviceName)
            return acc + (service ? service.price : 0)
        }, 0)

    const stats = [
        {
            label: 'Total Leads Mensuales',
            value: totalLeads,
            change: '+12%',
            icon: LucideUsers,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            label: 'Tasa de Conversión',
            value: `${conversionRate}%`,
            change: '+2.5%',
            icon: LucideTrendingUp,
            color: 'bg-green-50 text-green-600'
        },
        {
            label: 'Citas Activas',
            value: activeAppointments,
            change: '+5',
            icon: LucideCalendar,
            color: 'bg-purple-50 text-purple-600'
        },
        {
            label: 'Ingresos Estimados',
            value: `$${revenue.toLocaleString()}`,
            change: '+8%',
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
                        {config.services.map((service: any) => {
                            const count = leads.filter(l => l.service === service.name.split(' ')[0]).length + Math.floor(Math.random() * 5) // Mock logic to match loose names
                            const percentage = Math.min(100, Math.round((count / totalLeads) * 100))

                            return (
                                <div key={service.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700">{service.name}</span>
                                        <span className="text-gray-500">{count} leads</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-clinical-500 h-2 rounded-full transition-all duration-1000"
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
