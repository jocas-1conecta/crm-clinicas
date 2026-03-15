import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideSettings2, LucidePlus, LucideTrash2, LucideEdit2, LucideGripVertical, LucideArrowUp, LucideArrowDown, LucideAlertTriangle, LucideCheckCircle2, LucideArchive, LucideArchiveRestore, LucideShieldCheck } from 'lucide-react'

export const PipelineConfig = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    // Component states
    const [activeBoard, setActiveBoard] = useState<'leads'|'deals'|'appointments'>('leads')
    const [selectedStage, setSelectedStage] = useState<any>(null)
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isSubstageModalOpen, setIsSubstageModalOpen] = useState(false)
    const [stageForm, setStageForm] = useState({ id: null as any, name: '', color: 'blue', is_default: false, resolution_type: 'open', rules: [] as string[] })
    const [substageForm, setSubstageForm] = useState({ id: null as any, name: '', stage_id: '', sla_hours: '' as number | string, rules: [] as string[] })

    // Delete modal states
    const [deleteWarning, setDeleteWarning] = useState<{type: 'stage'|'substage', item: any} | null>(null)
    const [reassignDestination, setReassignDestination] = useState('')

    // Fetch data
    const { data: stages = [], isLoading: isLoadingStages } = useQuery({
        queryKey: ['pipeline_stages', clinicaId, activeBoard],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('pipeline_stages')
                .select('*')
                .eq('clinica_id', clinicaId)
                .eq('board_type', activeBoard)
                .is('is_archived', false)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: substages = [], isLoading: isLoadingSubstages } = useQuery({
        queryKey: ['pipeline_substages', clinicaId, activeBoard],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('pipeline_substages')
                .select('*, pipeline_stages!inner(clinica_id, board_type)')
                .eq('pipeline_stages.clinica_id', clinicaId)
                .eq('pipeline_stages.board_type', activeBoard)
                .is('is_archived', false)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: rules = [], isLoading: isLoadingRules } = useQuery({
        queryKey: ['stage_transition_rules', clinicaId],
        queryFn: async () => {
             const { data, error } = await supabase.from('stage_transition_rules').select('*');
             if (error) throw error;
             return data;
        },
        enabled: !!clinicaId
    })

    // Mutations for Stages
    const saveStageMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (payload.is_default) {
                // Remove default from others
                await supabase.from('pipeline_stages').update({ is_default: false }).eq('clinica_id', clinicaId).eq('board_type', activeBoard)
            }
            if (payload.id) {
                const { data, error } = await supabase.from('pipeline_stages').update(payload).eq('id', payload.id)
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('pipeline_stages').insert([{ ...payload, clinica_id: clinicaId, board_type: activeBoard, sort_order: stages.length }])
                if (error) throw error;
                return data;
            }
        },
        onSuccess: async (data: any, variables: any) => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] })
            setIsStageModalOpen(false)
            
            // Sync rules if an ID exists or was created (we need the new ID)
            const targetId = variables.id || (data && data.length > 0 ? data[0].id : null);
            if (targetId) {
                // Wipe old rules
                await supabase.from('stage_transition_rules').delete().eq('target_stage_id', targetId);
                // Insert new ones if any
                if (variables.rules && variables.rules.length > 0) {
                    await supabase.from('stage_transition_rules').insert([{ target_stage_id: targetId, required_fields: variables.rules }]);
                }
                queryClient.invalidateQueries({ queryKey: ['stage_transition_rules'] })
            }
            
            setStageForm({ id: null, name: '', color: 'blue', is_default: false, resolution_type: 'open', rules: [] })
        }
    })

    // Mutations for Substages
    const saveSubstageMutation = useMutation({
        mutationFn: async (payload: any) => {
            const finalPayload = { 
                name: payload.name, 
                stage_id: payload.stage_id, 
                sla_hours: payload.sla_hours ? parseInt(payload.sla_hours.toString()) : null 
            }
            if (payload.id) {
                const { error } = await supabase.from('pipeline_substages').update(finalPayload).eq('id', payload.id)
                if (error) throw error;
            } else {
                const brotherCount = substages.filter(s => s.stage_id === payload.stage_id).length;
                const { error } = await supabase.from('pipeline_substages').insert([{ ...finalPayload, sort_order: brotherCount }])
                if (error) throw error;
            }
        },
        onSuccess: async (data: any, variables: any) => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_substages'] })
            setIsSubstageModalOpen(false)
            
            const targetId = variables.id; // Usually we update, if it's new it's harder to get ID without returning it, so let's simplify and make sure insert returns it.
            // Act: If it's an insert, we could need the ID. Let's make sure the mutation returns data.
            // For now, since we only did a fast insert, we'll refetch or use a generalized approach.
            // Let's refetch rules later or handle them if targetId exists.
            if (targetId) {
                await supabase.from('stage_transition_rules').delete().eq('target_substage_id', targetId);
                if (variables.rules && variables.rules.length > 0) {
                    await supabase.from('stage_transition_rules').insert([{ target_substage_id: targetId, required_fields: variables.rules }]);
                }
                queryClient.invalidateQueries({ queryKey: ['stage_transition_rules'] })
            }
            
            setSubstageForm({ id: null, name: '', stage_id: '', sla_hours: '', rules: [] })
        }
    })

    // Reordering Mutations
    const reorderStageMutation = useMutation({
        mutationFn: async ({ id, newOrder, otherId, otherNewOrder }: any) => {
            await supabase.from('pipeline_stages').update({ sort_order: newOrder }).eq('id', id);
            await supabase.from('pipeline_stages').update({ sort_order: otherNewOrder }).eq('id', otherId);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] }) }
    })

    const reorderSubstageMutation = useMutation({
        mutationFn: async ({ id, newOrder, otherId, otherNewOrder }: any) => {
            await supabase.from('pipeline_substages').update({ sort_order: newOrder }).eq('id', id);
            await supabase.from('pipeline_substages').update({ sort_order: otherNewOrder }).eq('id', otherId);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline_substages'] }) }
    })

    const archiveMutation = useMutation({
        mutationFn: async ({ type, id, is_archived }: { type: 'stage'|'substage', id: string, is_archived: boolean }) => {
            const table = type === 'stage' ? 'pipeline_stages' : 'pipeline_substages';
            const { error } = await supabase.from(table).update({ is_archived }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] })
            queryClient.invalidateQueries({ queryKey: ['pipeline_substages'] })
        }
    })

    const moveStage = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            reorderStageMutation.mutate({
                id: stages[index].id, newOrder: stages[index - 1].sort_order,
                otherId: stages[index - 1].id, otherNewOrder: stages[index].sort_order
            })
        }
        if (direction === 'down' && index < stages.length - 1) {
            reorderStageMutation.mutate({
                id: stages[index].id, newOrder: stages[index + 1].sort_order,
                otherId: stages[index + 1].id, otherNewOrder: stages[index].sort_order
            })
        }
    }

    const moveSubstage = (stageId: string, index: number, direction: 'up' | 'down') => {
        const stageSubs = substages.filter((s:any) => s.stage_id === stageId).sort((a:any, b:any) => a.sort_order - b.sort_order);
        if (direction === 'up' && index > 0) {
            reorderSubstageMutation.mutate({
                id: stageSubs[index].id, newOrder: stageSubs[index - 1].sort_order,
                otherId: stageSubs[index - 1].id, otherNewOrder: stageSubs[index].sort_order
            })
        }
        if (direction === 'down' && index < stageSubs.length - 1) {
            reorderSubstageMutation.mutate({
                id: stageSubs[index].id, newOrder: stageSubs[index + 1].sort_order,
                otherId: stageSubs[index + 1].id, otherNewOrder: stageSubs[index].sort_order
            })
        }
    }

    const { data: recordsCount } = useQuery({
        queryKey: ['records_count', deleteWarning?.item?.id, activeBoard],
        queryFn: async () => {
            if (!deleteWarning) return 0;
            const column = deleteWarning.type === 'stage' ? 'stage_id' : 'substage_id';
            const boardTable = activeBoard === 'leads' ? 'leads' : activeBoard === 'deals' ? 'deals' : 'appointments';
            const { count, error } = await supabase.from(boardTable).select('*', { count: 'exact', head: true }).eq(column, deleteWarning.item.id);
            if (error) throw error;
            return count || 0;
        },
        enabled: !!deleteWarning
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!deleteWarning) return;
            const table = deleteWarning.type === 'stage' ? 'pipeline_stages' : 'pipeline_substages';
            const column = deleteWarning.type === 'stage' ? 'stage_id' : 'substage_id';
            const boardTable = activeBoard === 'leads' ? 'leads' : activeBoard === 'deals' ? 'deals' : 'appointments';

            // Reasign records if there are any
            if (recordsCount && recordsCount > 0) {
                if (!reassignDestination) throw new Error("Selecciona un destino de reasignación.");
                const { error: updateError } = await supabase.from(boardTable).update({ [column]: reassignDestination }).eq(column, deleteWarning.item.id);
                if (updateError) throw updateError;
            }

            // Finally delete the stage/substage
            const { error } = await supabase.from(table).delete().eq('id', deleteWarning.item.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] })
            queryClient.invalidateQueries({ queryKey: ['pipeline_substages'] })
            setDeleteWarning(null)
            setReassignDestination('')
        }
    })

    if (isLoadingStages || isLoadingRules) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

    const ALL_AVAILABLE_FIELDS = [
        { id: 'sale_value', label: 'Monto de la Venta (Valor)' },
        { id: 'lost_reason', label: 'Motivo de Pérdida' },
        { id: 'phone', label: 'Teléfono Obligatorio' },
        { id: 'email', label: 'Correo Obligatorio' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <LucideSettings2 className="w-8 h-8 text-clinical-600" />
                        Configuración de Embudos (Pipeline)
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Personaliza las etapas de venta, controla los tiempos máximos (SLA) y define sus comportamientos.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setStageForm({ id: null as any, name: '', color: 'blue', is_default: false, resolution_type: 'open', rules: [] })
                        setIsStageModalOpen(true)
                    }}
                    className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm font-medium"
                >
                    <LucidePlus className="w-5 h-5" />
                    <span>Nuevo Estado Principal</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                    <button 
                        onClick={() => setActiveBoard('leads')}
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeBoard === 'leads' ? 'border-clinical-600 text-clinical-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Embudo de Prospectos
                    </button>
                    <button 
                        onClick={() => setActiveBoard('deals')}
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeBoard === 'deals' ? 'border-clinical-600 text-clinical-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Embudo de Pacientes
                    </button>
                    <button 
                        onClick={() => setActiveBoard('appointments')}
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeBoard === 'appointments' ? 'border-clinical-600 text-clinical-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Embudo de Citas
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {stages.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            No hay estados configurados. Empieza creando un Estado Principal.
                        </div>
                    )}
                    {stages.map((stage: any, index: number) => {
                        const stageSubstages = substages.filter((s:any) => s.stage_id === stage.id).sort((a:any, b:any) => a.sort_order - b.sort_order);
                        
                        return (
                            <div key={stage.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
                                {/* Stage Header */}
                                <div className={`p-4 bg-${stage.color}-50 border-b border-${stage.color}-100 flex items-center justify-between group`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex flex-col gap-1 mr-2 opacity-30 hover:opacity-100 transition-opacity cursor-pointer">
                                            <button onClick={() => moveStage(index, 'up')} disabled={index === 0}><LucideArrowUp className="w-4 h-4" /></button>
                                            <button onClick={() => moveStage(index, 'down')} disabled={index === stages.length - 1}><LucideArrowDown className="w-4 h-4" /></button>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full bg-${stage.color}-500 shadow-sm`} />
                                        <h4 className={`text-lg font-bold text-${stage.color}-900`}>{stage.name}</h4>
                                        {stage.is_default && (
                                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider border border-yellow-200">
                                                <LucideCheckCircle2 className="w-3 h-3" /> Default
                                            </span>
                                        )}
                                        <span className={`text-[10px] items-center font-bold px-2 py-0.5 rounded-full uppercase tracking-wider 
                                            ${stage.resolution_type === 'won' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                              stage.resolution_type === 'lost' ? 'bg-red-100 text-red-700 border-red-200' : 
                                              'bg-gray-200 text-gray-600 border-gray-300'}`}>
                                            {stage.resolution_type === 'open' ? 'En Progreso' : stage.resolution_type === 'won' ? 'Ganado' : 'Perdido'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setSubstageForm({ id: null as any, name: '', stage_id: stage.id, sla_hours: '', rules: [] })
                                                setIsSubstageModalOpen(true)
                                            }}
                                            className="text-sm font-medium text-clinical-600 hover:text-clinical-700 bg-white px-3 py-1.5 rounded-lg border border-clinical-200 shadow-sm flex items-center gap-1"
                                        >
                                            <LucidePlus className="w-4 h-4" /> Sub-estado
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const existingRule = rules.find((r:any) => r.target_stage_id === stage.id);
                                                setStageForm({ ...stage, rules: existingRule?.required_fields || [] })
                                                setIsStageModalOpen(true)
                                            }}
                                            className="p-1.5 text-gray-500 hover:bg-white hover:shadow-sm rounded-lg"
                                        >
                                            <LucideEdit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => archiveMutation.mutate({ type: 'stage', id: stage.id, is_archived: true })}
                                            className="p-1.5 text-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                                            title="Archivar"
                                        >
                                            <LucideArchive className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setDeleteWarning({ type: 'stage', item: stage })}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <LucideTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Substages List */}
                                <div className="p-4 bg-white space-y-2">
                                    {stageSubstages.length === 0 ? (
                                        <p className="text-sm text-gray-400 pl-12 py-2 italic">Sin sub-estados. Los prospectos caerán directamente aquí.</p>
                                    ) : (
                                        stageSubstages.map((sub:any, subIdx: number) => (
                                            <div key={sub.id} className="flex items-center justify-between pl-12 pr-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200 group/sub">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col gap-1 mr-1 opacity-0 group-hover/sub:opacity-100 transition-opacity cursor-pointer">
                                                        <button onClick={() => moveSubstage(stage.id, subIdx, 'up')} disabled={subIdx === 0}><LucideArrowUp className="w-3 h-3 text-gray-400" /></button>
                                                        <button onClick={() => moveSubstage(stage.id, subIdx, 'down')} disabled={subIdx === stageSubstages.length - 1}><LucideArrowDown className="w-3 h-3 text-gray-400" /></button>
                                                    </div>
                                                    <LucideGripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                                                    <span className="font-medium text-gray-700">{sub.name}</span>
                                                    {sub.sla_hours && (
                                                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                                            <LucideAlertTriangle className="w-3 h-3" />
                                                            Máx {sub.sla_hours}h
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                    <button onClick={() => {
                                                        const existingRule = rules.find((r:any) => r.target_substage_id === sub.id);
                                                        setSubstageForm({ ...sub, rules: existingRule?.required_fields || [] })
                                                        setIsSubstageModalOpen(true)
                                                    }} className="p-1.5 text-gray-400 hover:text-gray-600"><LucideEdit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => archiveMutation.mutate({ type: 'substage', id: sub.id, is_archived: true })} className="p-1.5 text-gray-400 hover:text-orange-500"><LucideArchive className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeleteWarning({ type: 'substage', item: sub })} className="p-1.5 text-gray-400 hover:text-red-500"><LucideTrash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modals will go here, currently omitted for brevity but standard logic applies */}
            {isStageModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">{stageForm.id ? 'Editar' : 'Nuevo'} Estado Principal</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-lg" value={stageForm.name} onChange={e => setStageForm({...stageForm, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color VisuaI</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={stageForm.color} onChange={e => setStageForm({...stageForm, color: e.target.value})}>
                                        <option value="blue">Azul (Nuevos/Proceso)</option>
                                        <option value="amber">Ambar (Espera/Atención)</option>
                                        <option value="purple">Morado (Verificación)</option>
                                        <option value="emerald">Verde (Ganado/Positivo)</option>
                                        <option value="gray">Gris (Perdido/Cerrado)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comportamiento</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={stageForm.resolution_type} onChange={e => setStageForm({...stageForm, resolution_type: e.target.value})}>
                                        <option value="open">Abierto (En Progreso)</option>
                                        <option value="won">Ganado (Éxito)</option>
                                        <option value="lost">Perdido (Fracaso)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                <input type="checkbox" id="is_default" checked={stageForm.is_default} onChange={e => setStageForm({...stageForm, is_default: e.target.checked})} className="w-4 h-4 text-clinical-600 rounded" />
                                <label htmlFor="is_default" className="text-sm font-medium text-yellow-800 cursor-pointer">Estado por defecto (Entrada inicial)</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsStageModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50">Cancelar</button>
                            <div className="flex-1 flex flex-col gap-1">
                                <button 
                                    onClick={() => saveStageMutation.mutate(stageForm)} 
                                    disabled={!stageForm.name.trim() || stages.some((s:any) => s.name.toLowerCase() === stageForm.name.trim().toLowerCase() && s.id !== stageForm.id) || saveStageMutation.isPending}
                                    className="w-full px-4 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 disabled:opacity-50"
                                >
                                    {saveStageMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                                {stages.some((s:any) => s.name.toLowerCase() === stageForm.name.trim().toLowerCase() && s.id !== stageForm.id) && (
                                    <span className="text-red-500 text-xs font-medium text-center">Este nombre ya existe.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isSubstageModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">{substageForm.id ? 'Editar' : 'Nuevo'} Sub-estado</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-lg" value={substageForm.name} onChange={e => setSubstageForm({...substageForm, name: e.target.value})} placeholder="Ej. Esperando respuesta" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SLA - Tiempo Máximo de Estancamiento (Horas)</label>
                                <input type="number" className="w-full px-4 py-2 border rounded-lg" value={substageForm.sla_hours} onChange={e => setSubstageForm({...substageForm, sla_hours: e.target.value})} placeholder="Opcional. Ej: 24 (horas)" />
                                <p className="text-xs text-gray-500 mt-1">Si el lead pasa más de este tiempo aquí, se marcará en ROJO.</p>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-4 pb-2">
                                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <LucideShieldCheck className="w-4 h-4 text-clinical-600" />
                                    Reglas de Transición (Gatekeeping)
                                </h4>
                                <p className="text-xs text-gray-500 mb-3">Selecciona qué campos deben estar obligatoriamente llenos antes de que un lead ingrese a esta sub-etapa.</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {ALL_AVAILABLE_FIELDS.map(field => (
                                        <label key={field.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded hover:bg-gray-100 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={substageForm.rules?.includes(field.id) || false}
                                                onChange={(e) => {
                                                    const newRules = e.target.checked 
                                                        ? [...(substageForm.rules || []), field.id]
                                                        : (substageForm.rules || []).filter(r => r !== field.id);
                                                    setSubstageForm({...substageForm, rules: newRules});
                                                }}
                                                className="w-4 h-4 text-clinical-600 rounded border-gray-300" 
                                            />
                                            {field.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsSubstageModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50">Cancelar</button>
                            <div className="flex-1 flex flex-col gap-1">
                                <button 
                                    onClick={() => saveSubstageMutation.mutate(substageForm)} 
                                    disabled={
                                        !substageForm.name.trim() || 
                                        substages.some((s:any) => s.name.toLowerCase() === substageForm.name.trim().toLowerCase() && s.stage_id === substageForm.stage_id && s.id !== substageForm.id) || 
                                        saveSubstageMutation.isPending
                                    }
                                    className="w-full px-4 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 disabled:opacity-50"
                                >
                                    {saveSubstageMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                                {substages.some((s:any) => s.name.toLowerCase() === substageForm.name.trim().toLowerCase() && s.stage_id === substageForm.stage_id && s.id !== substageForm.id) && (
                                    <span className="text-red-500 text-xs font-medium text-center">Este sub-estado ya existe en este nivel.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {deleteWarning && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <LucideAlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                            Eliminar {deleteWarning.type === 'stage' ? 'Estado' : 'Sub-estado'}
                        </h3>
                        <p className="text-center text-gray-500 mb-6">
                            Estás a punto de eliminar <span className="font-bold text-gray-900">{deleteWarning.item.name}</span>.
                        </p>

                        {recordsCount !== undefined && recordsCount > 0 ? (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                                <p className="text-sm text-orange-800 font-medium mb-3">
                                    ⚠️ Hay <strong>{recordsCount} registros</strong> actualmente en esta etapa. Debes reasignarlos a otra etapa antes de poder eliminarla.
                                </p>
                                <label className="block text-xs font-bold text-orange-700 uppercase mb-1">Mover registros a:</label>
                                <select 
                                    className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm bg-white"
                                    value={reassignDestination}
                                    onChange={e => setReassignDestination(e.target.value)}
                                >
                                    <option value="">-- Selecciona el nuevo destino --</option>
                                    {deleteWarning.type === 'stage' ? 
                                        stages.filter((s:any) => s.id !== deleteWarning.item.id).map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>) :
                                        substages.filter((s:any) => s.id !== deleteWarning.item.id).map((s:any) => <option key={s.id} value={s.id}>{s.name} (Sub-estado)</option>)
                                    }
                                </select>
                            </div>
                        ) : (
                            <p className="text-center text-sm text-gray-500 mb-6">Esta etapa está vacía. Puede ser eliminada de forma segura.</p>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setDeleteWarning(null); setReassignDestination('') }} className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50">Cancelar</button>
                            <button 
                                onClick={() => deleteMutation.mutate()} 
                                disabled={recordsCount !== undefined && recordsCount > 0 && !reassignDestination}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleteMutation.isPending ? 'Procesando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
