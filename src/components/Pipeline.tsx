import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LucidePlus, LucideSearch, LucideFilter, LucideMoreVertical } from 'lucide-react'
import { LeadDetail } from './LeadDetail'

const STAGES = ['Nuevo', 'Contactado', 'En validación', 'Calificado', 'No viable', 'Sin respuesta']

export const Pipeline = () => {
    const { leads, updateLeadStatus, currentUser } = useStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    const filteredLeads = leads.filter(lead => {
        const isAdmin = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica'
        const isAssigned = lead.assignedTo === currentUser?.id
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.service.toLowerCase().includes(searchTerm.toLowerCase())

        return (isAdmin || isAssigned) && matchesSearch
    })

    return (
        <div className="h-full flex flex-col space-y-6">
            {selectedLeadId && (
                <LeadDetail
                    leadId={selectedLeadId}
                    onClose={() => setSelectedLeadId(null)}
                />
            )}
            {/* Search and Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                        <LucideSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o servicio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm transition-all"
                        />
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <LucideFilter className="w-5 h-5" />
                        <span className="font-medium">Filtros</span>
                    </button>
                </div>

                <button className="flex items-center space-x-2 px-6 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 transition-all shadow-lg shadow-clinical-200">
                    <LucidePlus className="w-5 h-5" />
                    <span className="font-bold">Nuevo Lead</span>
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex space-x-6 h-full min-w-max">
                    {STAGES.map((stage) => (
                        <div
                            key={stage}
                            className="w-80 flex flex-col bg-gray-100/50 rounded-2xl p-4 space-y-4"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const leadId = e.dataTransfer.getData('leadId');
                                if (leadId) {
                                    updateLeadStatus(leadId, stage);
                                }
                            }}
                        >
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center space-x-2">
                                    <h3 className="font-bold text-gray-700">{stage}</h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-400 shadow-sm border border-gray-100">
                                        {filteredLeads.filter(l => l.status === stage).length}
                                    </span>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <LucideMoreVertical className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                {filteredLeads.filter(l => l.status === stage).map(lead => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                                        onClick={() => setSelectedLeadId(lead.id)}
                                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded">
                                                {lead.service}
                                            </span>
                                            <select
                                                value={lead.status}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateLeadStatus(lead.id, e.target.value);
                                                }}
                                                className="text-[10px] border-none bg-transparent font-medium text-gray-400 focus:ring-0 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-clinical-700 transition-colors">
                                            {lead.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                <img
                                                    src={`https://i.pravatar.cc/150?u=${lead.assignedTo}`}
                                                    className="w-6 h-6 rounded-full border-2 border-white"
                                                    alt="Assigned"
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(lead.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
