import { useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LeadDetail } from '../../core/leads/LeadDetail'
import { LucidePhone, LucideMessageCircle, LucideArrowRight, LucideCheck, LucideAlertTriangle, LucideClock, LucideX, LucideUser, LucideCalendar } from 'lucide-react'

export interface UniversalPipelineBoardProps {
    boardType: 'leads' | 'deals' | 'appointments';
    tableName: 'leads' | 'deals' | 'appointments';
    records: any[];
    queryKeyToInvalidate: any[];
}

export const UniversalPipelineBoard = ({ boardType, tableName, records, queryKeyToInvalidate }: UniversalPipelineBoardProps) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const clinicaId = currentUser?.clinica_id

    // Modals
    const [gatekeepingModal, setGatekeepingModal] = useState<{ record: any, nextStage: any, rules: string[] } | null>(null)
    const [gatekeepingForm, setGatekeepingForm] = useState<any>({})
    const [prioritizeSLA, setPrioritizeSLA] = useState(false)
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    const { data: stages = [], isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline_stages', clinicaId, boardType],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('pipeline_stages')
                .select('*').eq('clinica_id', clinicaId).eq('board_type', boardType).is('is_archived', false).order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: substages = [], isLoading: loadingSubstages } = useQuery({
        queryKey: ['pipeline_substages', clinicaId, boardType],
        queryFn: async () => {
            if (!clinicaId) return [];
            const { data, error } = await supabase.from('pipeline_substages')
                .select('*, pipeline_stages!inner(clinica_id, board_type)')
                .eq('pipeline_stages.clinica_id', clinicaId).eq('pipeline_stages.board_type', boardType).is('is_archived', false).order('sort_order', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const { data: rules = [] } = useQuery({
        queryKey: ['stage_transition_rules', clinicaId],
        queryFn: async () => {
            const { data, error } = await supabase.from('stage_transition_rules').select('*');
            if (error) throw error;
            return data;
        },
        enabled: !!clinicaId
    })

    const moveRecordMutation = useMutation({
        mutationFn: async ({ id, stage_id, substage_id, updateFields = {} }: { id: string, stage_id: string, substage_id?: string | null, updateFields?: any }) => {
            const { error } = await supabase.from(tableName).update({ stage_id, substage_id, ...updateFields }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
            setGatekeepingModal(null)
            setGatekeepingForm({})
        }
    })

    const convertLeadMutation = useMutation({
        mutationFn: async (lead: any) => {
            const { error: insertError } = await supabase.from('patients').insert([{
                name: lead.name,
                status: 'Activo',
                assigned_to: lead.assigned_to,
                sucursal_id: lead.sucursal_id,
                email: lead.email,
                phone: lead.phone,
                tags: lead.service ? [lead.service] : []
            }]);
            if (insertError) throw insertError;
            
            const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id);
            if (deleteError) throw deleteError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate })
            queryClient.invalidateQueries({ queryKey: ['patients'] }) // always invalidate patients on conversion
        }
    })

    // Advance to next logical stage/substage
    const handleMove = (record: any) => {
        const currentStageIdx = stages.findIndex((s:any) => s.id === record.stage_id);
        
        let nextStage: any = null;
        let nextSubstage: any = null;

        if (currentStageIdx === -1) {
            nextStage = stages.find((s:any) => s.is_default) || stages[0];
            if (!nextStage) return;
            const stageSubs = substages.filter((sub:any) => sub.stage_id === nextStage.id);
            if (stageSubs.length > 0) nextSubstage = stageSubs[0].id;
        } else {
            const stageSubs = substages.filter((sub:any) => sub.stage_id === record.stage_id);
            const currentSubIdx = stageSubs.findIndex((sub:any) => sub.id === record.substage_id);

            if (currentSubIdx !== -1 && currentSubIdx < stageSubs.length - 1) {
                nextStage = stages[currentStageIdx];
                nextSubstage = stageSubs[currentSubIdx + 1].id;
            } else if (currentStageIdx < stages.length - 1) {
                nextStage = stages[currentStageIdx + 1];
                const nextStageSubs = substages.filter((sub:any) => sub.stage_id === nextStage.id);
                if (nextStageSubs.length > 0) nextSubstage = nextStageSubs[0].id;
            }
        }

        if (!nextStage) return;

        // Gatekeeping Check
        const targetedRules = rules.find((r:any) => r.target_stage_id === nextStage.id || r.target_substage_id === nextSubstage);
        
        if (targetedRules && targetedRules.required_fields.length > 0) {
            const missingFields = targetedRules.required_fields.filter((field: string) => !record[field] && !gatekeepingForm[field]);
            
            if (missingFields.length > 0) {
                setGatekeepingModal({ record, nextStage: { stage_id: nextStage.id, substage_id: nextSubstage }, rules: missingFields });
                return;
            }
        }

        moveRecordMutation.mutate({ 
            id: record.id, 
            stage_id: nextStage.id, 
            substage_id: nextSubstage,
            updateFields: { 
                closed_at: nextStage.resolution_type !== 'open' ? new Date().toISOString() : null 
            } 
        });
    }

    if (loadingStages || loadingSubstages) {
        return <div className="p-8 text-center text-gray-500">Cargando tablero...</div>;
    }

    if (stages.length === 0) {
        return (
            <div className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <LucideAlertTriangle className="w-12 h-12 mb-4 text-orange-400" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No tienes un embudo configurado</h3>
                <p>Tu administrador clínico debe configurar las etapas de este embudo ({boardType}) en el módulo de Configuración.</p>
            </div>
        )
    }

    // Helper: translate legacy records
    const defaultStage = stages.find((s:any) => s.is_default) || stages[0];
    const normalizedRecords = records.map(r => {
        if (!r.stage_id) return { ...r, stage_id: defaultStage.id };
        return r;
    });

    return (
        <div className="h-[calc(100vh-12rem)] overflow-x-auto pb-4 relative">
            <div className="flex justify-end mb-4 pr-6">
                <button 
                    onClick={() => setPrioritizeSLA(!prioritizeSLA)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${prioritizeSLA ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <LucideAlertTriangle className="w-4 h-4" /> 
                    {prioritizeSLA ? 'Priorizando Estancados' : 'Priorizar Estancados (SLAs)'}
                </button>
            </div>
            <div className="flex gap-6 h-full min-w-max">
                {stages.map((col:any) => (
                    <div key={col.id} className="flex flex-col w-[320px] bg-gray-50 rounded-2xl border border-gray-200 shadow-sm shrink-0">
                        {/* Header */}
                        <div className={`p-4 border-b border-gray-100 bg-${col.color}-50 rounded-t-2xl`}>
                            <h3 className={`font-bold text-${col.color}-700 flex justify-between items-center`}>
                                {col.name}
                                <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm font-black">
                                    {normalizedRecords.filter(r => r.stage_id === col.id).length}
                                </span>
                            </h3>
                        </div>

                        {/* Cards Container */}
                        <VirtualColumn 
                            records={normalizedRecords.filter(r => r.stage_id === col.id)} 
                            col={col} 
                            substages={substages}
                            handleMove={handleMove} 
                            convertLeadToPatient={(r: any) => convertLeadMutation.mutate(r)} 
                            prioritizeSLA={prioritizeSLA}
                            boardType={boardType}
                            onCardClick={(id: string) => boardType === 'leads' ? setSelectedLeadId(id) : null}
                        />
                    </div>
                ))}
            </div>

            {/* Gatekeeping Modal */}
            {gatekeepingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Campos Obligatorios Requeridos</h3>
                            <button onClick={() => setGatekeepingModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <LucideX className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800 mb-6">
                            Para avanzar a la siguiente etapa, debes proporcionar la siguiente información.
                        </div>
                        
                        <div className="space-y-4">
                            {gatekeepingModal.rules.map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 capitalize">
                                        {field === 'sale_value' ? 'Monto de Venta (Valor)' : 
                                         field === 'lost_reason' ? 'Motivo de Pérdida' : 
                                         field === 'phone' ? 'Teléfono Contacto' :
                                         field === 'email' ? 'Correo Electrónico' : field} <span className="text-red-500">*</span>
                                    </label>
                                    {field === 'sale_value' ? (
                                        <input 
                                            type="number" 
                                            required 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-clinical-500"
                                            placeholder="Ej. 150000"
                                            value={gatekeepingForm[field] || ''}
                                            onChange={e => setGatekeepingForm({...gatekeepingForm, [field]: e.target.value})}
                                        />
                                    ) : field === 'lost_reason' ? (
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-clinical-500"
                                            placeholder="Ingresa el motivo exacto..."
                                            value={gatekeepingForm[field] || ''}
                                            onChange={e => setGatekeepingForm({...gatekeepingForm, [field]: e.target.value})}
                                        />
                                    ) : (
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-clinical-500"
                                            placeholder={`Ingresa ${field}...`}
                                            value={gatekeepingForm[field] || ''}
                                            onChange={e => setGatekeepingForm({...gatekeepingForm, [field]: e.target.value})}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setGatekeepingModal(null)} className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50 font-bold text-gray-600">Cancelar</button>
                            <button 
                                onClick={() => {
                                    const allFilled = gatekeepingModal.rules.every(f => gatekeepingForm[f]?.trim().length > 0)
                                    if (allFilled) {
                                        moveRecordMutation.mutate({ 
                                            id: gatekeepingModal.record.id, 
                                            stage_id: gatekeepingModal.nextStage.stage_id, 
                                            substage_id: gatekeepingModal.nextStage.substage_id,
                                            updateFields: {
                                                ...gatekeepingForm,
                                                closed_at: stages.find((s:any) => s.id === gatekeepingModal.nextStage.stage_id)?.resolution_type !== 'open' ? new Date().toISOString() : null
                                            }
                                        })
                                    } else {
                                        alert("Por favor completa todos los campos requeridos.");
                                    }
                                }}
                                disabled={moveRecordMutation.isPending}
                                className="flex-1 px-4 py-2 bg-clinical-600 text-white font-bold rounded-xl hover:bg-clinical-700 disabled:opacity-50"
                            >
                                {moveRecordMutation.isPending ? 'Guardando...' : 'Confirmar Avance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Detail Modal */}
            {selectedLeadId && boardType === 'leads' && (
                <LeadDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
            )}
        </div>
    )
}

const VirtualColumn = ({ records, col, substages, handleMove, convertLeadToPatient, prioritizeSLA, boardType, onCardClick }: { records: any[], col: any, substages: any[], handleMove: any, convertLeadToPatient: any, prioritizeSLA: boolean, boardType: string, onCardClick: (id: string) => void }) => {
    const parentRef = useRef<HTMLDivElement>(null)

    const sortedRecords = useMemo(() => {
        if (!prioritizeSLA) return records;
        return [...records].sort((a, b) => {
            const aSubstage = substages.find(s => s.id === a.substage_id);
            const bSubstage = substages.find(s => s.id === b.substage_id);
            const aSla = aSubstage?.sla_hours || 0;
            const bSla = bSubstage?.sla_hours || 0;

            const aHours = a.stage_entered_at ? (new Date().getTime() - new Date(a.stage_entered_at).getTime()) / (1000 * 60 * 60) : 0;
            const bHours = b.stage_entered_at ? (new Date().getTime() - new Date(b.stage_entered_at).getTime()) / (1000 * 60 * 60) : 0;

            const aStagnant = aSla > 0 && aHours >= aSla;
            const bStagnant = bSla > 0 && bHours >= bSla;

            if (aStagnant && !bStagnant) return -1;
            if (!aStagnant && bStagnant) return 1;
            return 0; // maintain original relative order
        });
    }, [records, prioritizeSLA, substages]);

    const rowVirtualizer = useVirtualizer({
        count: sortedRecords.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 160, 
        overscan: 5,
    })

    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const record = sortedRecords[virtualRow.index]
                    
                    const recordSubstage = substages.find(s => s.id === record.substage_id);
                    let isStagnant = false;
                    
                    if (recordSubstage?.sla_hours && record.stage_entered_at) {
                        const entered = new Date(record.stage_entered_at).getTime();
                        const now = new Date().getTime();
                        if ((now - entered) / (1000 * 60 * 60) >= recordSubstage.sla_hours) {
                            isStagnant = true;
                        }
                    }

                    // Card dynamic rendering based on Type
                    const title = boardType === 'appointments' ? `${record.patient_name} - ${record.service_name || 'Cita'}` : (record.name || record.patient_name || 'Paciente');
                    const subtitle1 = boardType === 'appointments' ? record.appointment_date : (record.phone || 'Sin teléfono');
                    const subtitle1Icon = boardType === 'appointments' ? <LucideCalendar className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <LucidePhone className="w-3.5 h-3.5 mr-1.5 shrink-0" />;
                    const subtitle2 = boardType === 'deals' ? `Valor: $${record.value || '0'}` : (boardType === 'appointments' ? record.appointment_time : (record.email || 'Sin correo'));
                    const subtitle2Icon = boardType === 'deals' ? <strong className="mr-1">$</strong> : (boardType === 'appointments' ? <LucideClock className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <LucideMessageCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />);

                    return (
                        <div
                            key={record.id}
                            onClick={() => onCardClick(record.id)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size - 12}px`, 
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className={`bg-white p-4 rounded-xl shadow-sm border ${isStagnant ? 'border-red-400 shadow-red-100/50' : 'border-gray-100'} hover:shadow-md transition-shadow flex flex-col cursor-pointer`}
                        >
                            {isStagnant && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg" title="¡SLA Vencido! Estancado">
                                    <LucideAlertTriangle className="w-4 h-4" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-1 items-start w-full overflow-hidden">
                                    <h4 className="font-bold text-gray-900 truncate w-full">{title}</h4>
                                    <div className="flex items-center justify-between w-full">
                                        {recordSubstage && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 truncate max-w-[120px]">
                                                {recordSubstage.name}
                                            </span>
                                        )}
                                        {record.source && boardType === 'leads' && (
                                            <span className={`text-[9px] ml-auto font-bold uppercase tracking-wider px-2 py-0.5 rounded ${record.source.includes('Bot') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {record.source}
                                            </span>
                                        )}
                                        {record.status && boardType !== 'leads' && (
                                            <span className="text-[9px] ml-auto font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                                {record.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 my-3">
                                <div className="flex items-center text-[11px] text-gray-500">
                                    {subtitle1Icon}
                                    <span className="truncate">{subtitle1}</span>
                                </div>
                                <div className="flex items-center text-[11px] text-gray-500">
                                    {subtitle2Icon}
                                    <span className="truncate">{subtitle2}</span>
                                </div>
                                {record.stage_entered_at && (
                                    <div className="flex items-center text-[10px] text-gray-400 mt-2">
                                        <LucideClock className="w-3 h-3 mr-1" />
                                        <span>Entró: {new Date(record.stage_entered_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-50 mt-auto">
                                {col.resolution_type === 'open' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleMove(record); }}
                                        className="flex-1 py-1.5 bg-gray-50 hover:bg-clinical-50 border border-gray-100 text-gray-600 hover:text-clinical-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <span>Avanzar</span>
                                        <LucideArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {col.resolution_type === 'won' && boardType === 'leads' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); convertLeadToPatient(record); }}
                                        className="flex-1 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <LucideCheck className="w-3.5 h-3.5" />
                                        <span>Convertir a Paciente</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
