import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideSettings2, LucidePlus, LucideTrash2, LucideEdit2, LucideGripVertical, LucideArrowUp, LucideArrowDown, LucideAlertTriangle, LucideCheckCircle2, LucideArchive, LucideArchiveRestore, LucideShieldCheck } from 'lucide-react'

interface PipelineConfigProps {
    boardType?: 'leads' | 'deals' | 'appointments'
    embedded?: boolean
}

export const PipelineConfig = ({ boardType: fixedBoard, embedded = false }: PipelineConfigProps = {}) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    // Component states
    const [activeBoard, setActiveBoard] = useState<'leads'|'deals'|'appointments'>(fixedBoard || 'leads')
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
             if (!clinicaId) return [];
             const { data, error } = await supabase.from('stage_transition_rules').select('*').eq('clinica_id', clinicaId);
             if (error) throw error;
             return data;
        },
        enabled: !!clinicaId
    })

    // Mutations for Stages
    const saveStageMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { id, rules, ...rest } = payload;
            const dbPayload = { name: rest.name, color: rest.color, is_default: rest.is_default, resolution_type: rest.resolution_type };
            if (payload.is_default) {
                await supabase.from('pipeline_stages').update({ is_default: false }).eq('clinica_id', clinicaId).eq('board_type', activeBoard)
            }
            if (id) {
                const { data, error } = await supabase.from('pipeline_stages').update(dbPayload).eq('id', id).select()
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('pipeline_stages').insert([{ ...dbPayload, clinica_id: clinicaId, board_type: activeBoard, sort_order: stages.length }]).select()
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
                    await supabase.from('stage_transition_rules').insert([{ target_stage_id: targetId, required_fields: variables.rules, clinica_id: clinicaId }]);
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
                    await supabase.from('stage_transition_rules').insert([{ target_substage_id: targetId, required_fields: variables.rules, clinica_id: clinicaId }]);
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
        <div className={`${embedded ? 'space-y-3' : 'space-y-4 animate-in fade-in duration-500 max-w-5xl mx-auto'}`}>
            {!embedded && (
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LucideSettings2 className="w-5 h-5 text-clinical-600" />
                        Configuración de Embudos
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Personaliza etapas, SLA y comportamientos.</p>
                </div>
                <button
                    onClick={() => {
                        setStageForm({ id: null as any, name: '', color: 'blue', is_default: false, resolution_type: 'open', rules: [] })
                        setIsStageModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 bg-clinical-600 hover:bg-clinical-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                    <LucidePlus className="w-3.5 h-3.5" /> Nuevo Estado
                </button>
            </div>
            )}

            {embedded && (
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Etapas</span>
                    <button
                        onClick={() => {
                            setStageForm({ id: null as any, name: '', color: 'blue', is_default: false, resolution_type: 'open', rules: [] })
                            setIsStageModalOpen(true)
                        }}
                        className="flex items-center gap-1 text-clinical-600 hover:text-clinical-700 text-[11px] font-medium"
                    >
                        <LucidePlus className="w-3 h-3" /> Añadir
                    </button>
                </div>
            )}

            <div className={`${embedded ? '' : 'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'}`}>
                {!fixedBoard && !embedded && (
                <div className="flex border-b border-gray-100">
                    {(['leads','deals','appointments'] as const).map(bt => (
                        <button key={bt} onClick={() => setActiveBoard(bt)}
                            className={`flex-1 px-4 py-2 text-xs font-bold border-b-2 ${activeBoard === bt ? 'border-clinical-600 text-clinical-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            {bt === 'leads' ? 'Prospectos' : bt === 'deals' ? 'Pacientes' : 'Citas'}
                        </button>
                    ))}
                </div>
                )}
                
                <div className={`${embedded ? 'space-y-1.5' : 'p-3 space-y-1.5'}`}>
                    {stages.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-xs">No hay estados configurados.</div>
                    )}
                    {stages.map((stage: any, index: number) => {
                        const stageSubstages = substages.filter((s:any) => s.stage_id === stage.id).sort((a:any, b:any) => a.sort_order - b.sort_order);
                        
                        return (
                            <div key={stage.id} className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
                                <div className="px-3 py-2 bg-gray-50/60 flex items-center justify-between group">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="flex flex-col opacity-0 group-hover:opacity-60 transition-opacity">
                                            <button onClick={() => moveStage(index, 'up')} disabled={index === 0}><LucideArrowUp className="w-3 h-3" /></button>
                                            <button onClick={() => moveStage(index, 'down')} disabled={index === stages.length - 1}><LucideArrowDown className="w-3 h-3" /></button>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full bg-${stage.color}-500 shrink-0`} />
                                        <span className="text-[13px] font-semibold text-gray-800 truncate">{stage.name}</span>
                                        {stage.is_default && (
                                            <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wider shrink-0">Default</span>
                                        )}
                                        <span className={`text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wider shrink-0
                                            ${stage.resolution_type === 'won' ? 'bg-emerald-100 text-emerald-600' : 
                                              stage.resolution_type === 'lost' ? 'bg-red-100 text-red-600' : 
                                              'bg-gray-100 text-gray-500'}`}>
                                            {stage.resolution_type === 'open' ? 'Progreso' : stage.resolution_type === 'won' ? 'Ganado' : 'Perdido'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button 
                                            onClick={() => { setSubstageForm({ id: null as any, name: '', stage_id: stage.id, sla_hours: '', rules: [] }); setIsSubstageModalOpen(true) }}
                                            className="text-[10px] font-medium text-clinical-600 hover:bg-clinical-50 px-2 py-1 rounded flex items-center gap-0.5"
                                        >
                                            <LucidePlus className="w-3 h-3" /> Sub
                                        </button>
                                        <button 
                                            onClick={() => { const r = rules.find((r:any) => r.target_stage_id === stage.id); setStageForm({ ...stage, rules: r?.required_fields || [] }); setIsStageModalOpen(true) }}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                            <LucideEdit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => archiveMutation.mutate({ type: 'stage', id: stage.id, is_archived: true })}
                                            className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded" title="Archivar">
                                            <LucideArchive className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setDeleteWarning({ type: 'stage', item: stage })}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                                            <LucideTrash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {stageSubstages.length > 0 && (
                                    <div className="bg-white divide-y divide-gray-50">
                                        {stageSubstages.map((sub:any, subIdx: number) => (
                                            <div key={sub.id} className="flex items-center justify-between pl-8 pr-3 py-1.5 hover:bg-gray-50/50 transition-colors group/sub">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex flex-col opacity-0 group-hover/sub:opacity-60 transition-opacity">
                                                        <button onClick={() => moveSubstage(stage.id, subIdx, 'up')} disabled={subIdx === 0}><LucideArrowUp className="w-2.5 h-2.5 text-gray-400" /></button>
                                                        <button onClick={() => moveSubstage(stage.id, subIdx, 'down')} disabled={subIdx === stageSubstages.length - 1}><LucideArrowDown className="w-2.5 h-2.5 text-gray-400" /></button>
                                                    </div>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                                                    <span className="text-[12px] text-gray-600">{sub.name}</span>
                                                    {sub.sla_hours && <span className="text-[9px] font-medium text-orange-500 bg-orange-50 px-1.5 py-px rounded shrink-0">{sub.sla_hours}h</span>}
                                                </div>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => { const r = rules.find((r:any) => r.target_substage_id === sub.id); setSubstageForm({ ...sub, rules: r?.required_fields || [] }); setIsSubstageModalOpen(true) }} className="p-1 text-gray-400 hover:text-gray-600"><LucideEdit2 className="w-2.5 h-2.5" /></button>
                                                    <button onClick={() => archiveMutation.mutate({ type: 'substage', id: sub.id, is_archived: true })} className="p-1 text-gray-400 hover:text-orange-500"><LucideArchive className="w-2.5 h-2.5" /></button>
                                                    <button onClick={() => setDeleteWarning({ type: 'substage', item: sub })} className="p-1 text-gray-400 hover:text-red-500"><LucideTrash2 className="w-2.5 h-2.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {stageSubstages.length === 0 && (
                                    <div className="px-8 py-1.5 text-[11px] text-gray-300 italic bg-white">Sin sub-estados</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modals will go here, currently omitted for brevity but standard logic applies */}
            {isStageModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">{stageForm.id ? 'Editar' : 'Nuevo'} Estado</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Nombre</label>
                                <input type="text" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-clinical-500 outline-none" value={stageForm.name} onChange={e => setStageForm({...stageForm, name: e.target.value})} placeholder="Ej. Nuevo, Calificado..." />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Color</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { value: 'blue', bg: 'bg-blue-500' },
                                        { value: 'sky', bg: 'bg-sky-500' },
                                        { value: 'cyan', bg: 'bg-cyan-500' },
                                        { value: 'teal', bg: 'bg-teal-500' },
                                        { value: 'emerald', bg: 'bg-emerald-500' },
                                        { value: 'lime', bg: 'bg-lime-500' },
                                        { value: 'amber', bg: 'bg-amber-500' },
                                        { value: 'orange', bg: 'bg-orange-500' },
                                        { value: 'red', bg: 'bg-red-500' },
                                        { value: 'pink', bg: 'bg-pink-500' },
                                        { value: 'purple', bg: 'bg-purple-500' },
                                        { value: 'gray', bg: 'bg-gray-500' },
                                    ].map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setStageForm({...stageForm, color: c.value})}
                                            className={`w-6 h-6 rounded-full ${c.bg} transition-all flex items-center justify-center ${stageForm.color === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                        >
                                            {stageForm.color === c.value && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Tipo</label>
                                <select className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs" value={stageForm.resolution_type} onChange={e => setStageForm({...stageForm, resolution_type: e.target.value})}>
                                    <option value="open">En Progreso</option>
                                    <option value="won">Ganado</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-gray-600 bg-amber-50/60 px-3 py-2 rounded-lg cursor-pointer">
                                <input type="checkbox" id="is_default" checked={stageForm.is_default} onChange={e => setStageForm({...stageForm, is_default: e.target.checked})} className="w-3.5 h-3.5 text-clinical-600 rounded" />
                                Estado por defecto (entrada inicial)
                            </label>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsStageModalOpen(false)} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                            <div className="flex-1 flex flex-col gap-0.5">
                                <button 
                                    onClick={() => saveStageMutation.mutate(stageForm)} 
                                    disabled={!stageForm.name.trim() || stages.some((s:any) => s.name.toLowerCase() === stageForm.name.trim().toLowerCase() && s.id !== stageForm.id) || saveStageMutation.isPending}
                                    className="w-full px-3 py-1.5 bg-clinical-600 text-white rounded-lg text-xs hover:bg-clinical-700 disabled:opacity-50"
                                >
                                    {saveStageMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                                {stages.some((s:any) => s.name.toLowerCase() === stageForm.name.trim().toLowerCase() && s.id !== stageForm.id) && (
                                    <span className="text-red-500 text-[10px] text-center">Nombre duplicado</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isSubstageModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">{substageForm.id ? 'Editar' : 'Nuevo'} Sub-estado</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Nombre</label>
                                <input type="text" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-clinical-500 outline-none" value={substageForm.name} onChange={e => setSubstageForm({...substageForm, name: e.target.value})} placeholder="Ej. Esperando respuesta" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">SLA máximo (horas)</label>
                                <input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-clinical-500 outline-none" value={substageForm.sla_hours} onChange={e => setSubstageForm({...substageForm, sla_hours: e.target.value})} placeholder="Ej: 24" />
                                <p className="text-[10px] text-gray-400 mt-0.5">Se marcará en rojo si excede este tiempo.</p>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1">
                                    <LucideShieldCheck className="w-3 h-3 text-clinical-600" />
                                    Reglas de Transición
                                </h4>
                                <div className="space-y-1">
                                    {ALL_AVAILABLE_FIELDS.map(field => (
                                        <label key={field.id} className="flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={substageForm.rules?.includes(field.id) || false}
                                                onChange={(e) => {
                                                    const newRules = e.target.checked 
                                                        ? [...(substageForm.rules || []), field.id]
                                                        : (substageForm.rules || []).filter(r => r !== field.id);
                                                    setSubstageForm({...substageForm, rules: newRules});
                                                }}
                                                className="w-3 h-3 text-clinical-600 rounded border-gray-300" 
                                            />
                                            {field.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsSubstageModalOpen(false)} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                            <div className="flex-1 flex flex-col gap-0.5">
                                <button 
                                    onClick={() => saveSubstageMutation.mutate(substageForm)} 
                                    disabled={
                                        !substageForm.name.trim() || 
                                        substages.some((s:any) => s.name.toLowerCase() === substageForm.name.trim().toLowerCase() && s.stage_id === substageForm.stage_id && s.id !== substageForm.id) || 
                                        saveSubstageMutation.isPending
                                    }
                                    className="w-full px-3 py-1.5 bg-clinical-600 text-white rounded-lg text-xs hover:bg-clinical-700 disabled:opacity-50"
                                >
                                    {saveSubstageMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </button>
                                {substages.some((s:any) => s.name.toLowerCase() === substageForm.name.trim().toLowerCase() && s.stage_id === substageForm.stage_id && s.id !== substageForm.id) && (
                                    <span className="text-red-500 text-[10px] text-center">Sub-estado duplicado</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {deleteWarning && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
                        <div className="w-9 h-9 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3 mx-auto">
                            <LucideAlertTriangle className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-center text-gray-900 mb-1">
                            Eliminar {deleteWarning.type === 'stage' ? 'Estado' : 'Sub-estado'}
                        </h3>
                        <p className="text-center text-xs text-gray-500 mb-4">
                            <span className="font-semibold text-gray-700">{deleteWarning.item.name}</span> será eliminado.
                        </p>

                        {recordsCount !== undefined && recordsCount > 0 ? (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                                <p className="text-[11px] text-orange-800 font-medium mb-2">
                                    ⚠️ {recordsCount} registros deben reasignarse.
                                </p>
                                <select 
                                    className="w-full px-2 py-1.5 border border-orange-200 rounded-lg text-xs bg-white"
                                    value={reassignDestination}
                                    onChange={e => setReassignDestination(e.target.value)}
                                >
                                    <option value="">Seleccionar destino...</option>
                                    {deleteWarning.type === 'stage' ? 
                                        stages.filter((s:any) => s.id !== deleteWarning.item.id).map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>) :
                                        substages.filter((s:any) => s.id !== deleteWarning.item.id).map((s:any) => <option key={s.id} value={s.id}>{s.name} (Sub-estado)</option>)
                                    }
                                </select>
                            </div>
                        ) : (
                            <p className="text-center text-[11px] text-gray-400 mb-4">Etapa vacía — se puede eliminar.</p>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => { setDeleteWarning(null); setReassignDestination('') }} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                            <button 
                                onClick={() => deleteMutation.mutate()} 
                                disabled={recordsCount !== undefined && recordsCount > 0 && !reassignDestination}
                                className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-50"
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
