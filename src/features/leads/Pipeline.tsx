import React, { useState, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucidePlus, LucideSearch, LucideFilter, LucideMoreVertical } from 'lucide-react'
import { LeadDetail } from './LeadDetail'

const STAGES = ['Nuevo', 'En validación', 'Calificado', 'Agendado', 'Asistido/Cerrado']

export const Pipeline = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    const { data: dbLeads = [], isLoading } = useQuery({
        queryKey: ['leads-admin'],
        queryFn: async () => {
            const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    })

    const updateLeadMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('leads').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads-admin'] })
        }
    })

    const updateLeadStatus = (id: string, stage: string) => {
        updateLeadMutation.mutate({ id, status: stage });
    }

    const filteredLeads = dbLeads.filter(lead => {
        const isAdmin = currentUser?.role === 'Super_Admin' || currentUser?.role === 'Admin_Clinica'
        const isAssigned = lead.assigned_to === currentUser?.id
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.service?.toLowerCase().includes(searchTerm.toLowerCase())

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

                            <VirtualPipelineColumn 
                                leads={filteredLeads.filter(l => l.status === stage)} 
                                stage={stage}
                                updateLeadStatus={updateLeadStatus}
                                setSelectedLeadId={setSelectedLeadId}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

const VirtualPipelineColumn = ({ leads, stage, updateLeadStatus, setSelectedLeadId }: { leads: any[], stage: string, updateLeadStatus: any, setSelectedLeadId: any }) => {
    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: leads.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 170, // Height of card + gap
        overscan: 5,
    })

    return (
        <div 
            ref={parentRef} 
            className="flex-1 overflow-y-auto pr-1"
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const lead = leads[virtualRow.index]
                    return (
                        <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                            onClick={() => setSelectedLeadId(lead.id)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size - 12}px`, // Subtract gap
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:cursor-grabbing mb-3"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded">
                                        {lead.service}
                                    </span>
                                    {lead.source && (
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${lead.source.includes('Bot') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {lead.source}
                                        </span>
                                    )}
                                </div>
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
                                        src={`https://ui-avatars.com/api/?name=${lead.name}`}
                                        className="w-6 h-6 rounded-full border-2 border-white"
                                        alt="Avatar"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(lead.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
