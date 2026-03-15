import React, { useMemo } from 'react'
import { LucidePieChart } from 'lucide-react'

interface LeadsByServiceChartProps {
    leads: any[]
    services: any[]
}

export const LeadsByServiceChart: React.FC<LeadsByServiceChartProps> = ({ leads, services }) => {
    const totalLeads = leads.length

    return (
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
    )
}
