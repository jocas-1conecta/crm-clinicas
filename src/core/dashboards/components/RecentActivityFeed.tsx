import React from 'react'
import { LucideActivity } from 'lucide-react'

interface RecentActivityFeedProps {
    leads: any[]
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ leads }) => {
    return (
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
                                Interesado en {lead.service} • {new Date(lead.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
