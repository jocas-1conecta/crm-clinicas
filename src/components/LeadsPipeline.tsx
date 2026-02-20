import { useStore, Lead } from '../store/useStore'
import { LucidePhone, LucideMessageCircle, LucideArrowRight, LucideCheck } from 'lucide-react'

export const LeadsPipeline = () => {
    const { currentUser, leads, moveLead, convertLeadToPatient } = useStore()
    const branchId = currentUser?.sucursal_id

    // Columns configuration
    const columns: { id: Lead['status'], label: string, color: string }[] = [
        { id: 'Nuevo', label: 'Nuevos', color: 'blue' },
        { id: 'Contactado', label: 'Contactados', color: 'amber' },
        { id: 'Cita Agendada', label: 'Cita Agendada', color: 'purple' },
        { id: 'Perdido', label: 'Perdidos', color: 'gray' },
    ]

    const handleMove = (id: string, currentStatus: Lead['status']) => {
        // Simple logic to move to next status for demo
        const statusOrder: Lead['status'][] = ['Nuevo', 'Contactado', 'Cita Agendada']
        const currentIndex = statusOrder.indexOf(currentStatus)
        if (currentIndex !== -1 && currentIndex < statusOrder.length - 1) {
            moveLead(id, statusOrder[currentIndex + 1])
        }
    }

    return (
        <div className="h-[calc(100vh-12rem)] overflow-x-auto pb-4">
            <div className="flex gap-6 h-full min-w-[1000px]">
                {columns.map(col => (
                    <div key={col.id} className="flex-1 flex flex-col bg-gray-100/50 rounded-2xl border border-gray-200">
                        {/* Header */}
                        <div className={`p-4 border-b border-gray-100 bg-${col.color}-50 rounded-t-2xl`}>
                            <h3 className={`font-bold text-${col.color}-700 flex justify-between items-center`}>
                                {col.label}
                                <span className={`bg-white px-2 py-0.5 rounded-full text-xs shadow-sm`}>
                                    {leads.filter(l => l.sucursal_id === branchId && l.status === col.id).length}
                                </span>
                            </h3>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {leads
                                .filter(l => l.sucursal_id === branchId && l.status === col.id)
                                .map(lead => (
                                    <div key={lead.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900">{lead.name}</h4>
                                            <span className="text-[10px] uppercase font-bold text-gray-400">{lead.service}</span>
                                        </div>

                                        <div className="space-y-1 mb-4">
                                            <div className="flex items-center text-xs text-gray-500">
                                                <LucidePhone className="w-3 h-3 mr-1" />
                                                {lead.phone}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <LucideMessageCircle className="w-3 h-3 mr-1" />
                                                {lead.email}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                                            {col.id !== 'Cita Agendada' && col.id !== 'Perdido' && (
                                                <button
                                                    onClick={() => handleMove(lead.id, lead.status)}
                                                    className="flex-1 py-1.5 bg-gray-50 hover:bg-clinical-50 text-gray-600 hover:text-clinical-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <span>Avanzar</span>
                                                    <LucideArrowRight className="w-3 h-3" />
                                                </button>
                                            )}

                                            {col.id === 'Cita Agendada' && (
                                                <button
                                                    onClick={() => convertLeadToPatient(lead.id)}
                                                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <LucideCheck className="w-3 h-3" />
                                                    <span>Convertir a Paciente</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
