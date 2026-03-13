import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import {
    LucideX,
    LucideUser,
    LucidePhone,
    LucideMail,
    LucideCheckSquare,
    LucideFiles,
    LucideMessageSquare,
    LucideSend,
    LucidePaperclip,
    LucideSmile,
    LucideAtSign,
    LucidePlus,
    LucideZap,
    LucideImage,
    LucideFileText,
    LucideClock,
    LucideArrowRight,
    LucideCheckCircle2
} from 'lucide-react'

export const LeadDetail = ({ leadId, onClose }: { leadId: string, onClose: () => void }) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    
    const { data: lead } = useQuery({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
            if (error) throw error;
            return data;
        }
    })
    const { data: quickResponses = [] } = useQuery({
        queryKey: ['quick_responses', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase.from('quick_responses').select('*').eq('clinica_id', currentUser.clinica_id);
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id
    })

    const { data: stages = [] } = useQuery({
        queryKey: ['pipeline_stages', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_stages').select('*').eq('clinica_id', currentUser!.clinica_id);
            return data || [];
        },
        enabled: !!currentUser?.clinica_id
    });
    
    const { data: substages = [] } = useQuery({
        queryKey: ['pipeline_substages', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase.from('pipeline_substages')
                .select('*, pipeline_stages!inner(clinica_id)')
                .eq('pipeline_stages.clinica_id', currentUser!.clinica_id);
            return data || [];
        },
        enabled: !!currentUser?.clinica_id
    });

    const { data: history = [] } = useQuery({
        queryKey: ['lead_history', leadId],
        queryFn: async () => {
            const { data, error } = await supabase.from('lead_history_log')
                .select(`
                    id, 
                    changed_at,
                    profiles!changed_by (first_name, last_name),
                    from_substage:pipeline_substages!from_substage_id(name),
                    to_substage:pipeline_substages!to_substage_id(name),
                    from_stage:pipeline_stages!from_stage_id(name),
                    to_stage:pipeline_stages!to_stage_id(name)
                `)
                .eq('lead_id', leadId)
                .order('changed_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    })

    const [activeTab, setActiveTab] = useState('info')
    const [message, setMessage] = useState('')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showQuickResponses, setShowQuickResponses] = useState(false)
    const [localChats, setLocalChats] = useState<any[]>([])
    
    // Resolution Modals
    const [showWonModal, setShowWonModal] = useState(false)
    const [showLostModal, setShowLostModal] = useState(false)
    const [resolutionData, setResolutionData] = useState({ sale_value: '', lost_reason: '' })

    const resolveLeadMutation = useMutation({
        mutationFn: async ({ stage_id, data }: { stage_id: string, data: any }) => {
            const { error } = await supabase.from('leads').update({
                stage_id,
                substage_id: null,
                closed_at: new Date().toISOString(),
                ...data
            }).eq('id', lead.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            setShowWonModal(false)
            setShowLostModal(false)
        }
    })

    const addMessage = (id: string, msg: any) => {
        setLocalChats(prev => [...prev, msg])
    }

    const addDocument = (id: string, doc: any) => {
        // Mocked document add for UI purposes
        console.log("Document added", doc)
    }

    if (!lead) return null

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return

        addMessage(leadId, {
            sender: 'asesora',
            text: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
        setMessage('')
    }

    const tabs = [
        { id: 'info', name: 'Info General', icon: LucideUser },
        { id: 'tasks', name: 'Tareas', icon: LucideCheckSquare },
        { id: 'files', name: 'Archivos', icon: LucideFiles },
        { id: 'whatsapp', name: 'WhatsApp', icon: LucideMessageSquare },
        { id: 'history', name: 'Auditoría', icon: LucideClock },
    ]

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-clinical-100 rounded-2xl">
                            <LucideUser className="w-6 h-6 text-clinical-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-bold bg-clinical-50 text-clinical-600 px-2 py-0.5 rounded">{lead.service}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {stages.find((s:any) => s.id === lead.stage_id)?.name || lead.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-all">
                        <LucideX className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="px-8 border-b border-gray-100 flex space-x-8 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 flex items-center space-x-2 border-b-2 transition-all font-medium ${activeTab === tab.id
                                ? 'border-clinical-600 text-clinical-700'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex bg-white">
                    {/* Main Tab Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'info' && (
                            <div className="space-y-8 max-w-2xl">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <LucidePhone className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-700">{lead.phone}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                                            <LucideMail className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-700">{lead.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-900">Formulario de Interés</h3>
                                    <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/30 space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">¿Cómo nos conoció?</span>
                                            <span className="font-medium">Instagram Ads</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Motivo de consulta</span>
                                            <span className="font-medium">Limpieza dental y revisión general</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Presupuesto estimado</span>
                                            <span className="font-medium text-clinical-600 font-bold">$150,000 - $300,000</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'whatsapp' && (
                            <div className="h-full flex flex-col bg-[#e5ddd5] rounded-3xl overflow-hidden border border-gray-200">
                                {/* Chat History */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat relative">
                                    {localChats.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.sender === 'asesora' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm ${msg.sender === 'asesora'
                                                ? 'bg-[#dcf8c6] rounded-tr-none'
                                                : 'bg-white rounded-tl-none'
                                                }`}>
                                                {msg.type === 'file' || msg.type === 'image' ? (
                                                    <div className="flex items-center space-x-3 p-2 bg-black/5 rounded-lg">
                                                        <div className="p-2 bg-white rounded-lg">
                                                            {msg.type === 'image' ? (
                                                                <LucideImage className="w-5 h-5 text-purple-500" />
                                                            ) : (
                                                                <LucideFileText className="w-5 h-5 text-red-500" />
                                                            )}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-gray-800 text-xs truncate">{msg.attachment?.name}</p>
                                                            <p className="text-[10px] text-gray-500">{msg.attachment?.size}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-800 whitespace-pre-line">{msg.text}</p>
                                                )}
                                                <p className="text-[10px] text-gray-400 text-right mt-1">{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Quick Responses Popover */}
                                    {showQuickResponses && (
                                        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-10 animate-fade-in-up">
                                            <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-gray-50">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Respuestas Rápidas</span>
                                                <button onClick={() => setShowQuickResponses(false)}><LucideX className="w-4 h-4 text-gray-400" /></button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                                                {quickResponses?.map((qr: any) => (
                                                    <button
                                                        key={qr.id}
                                                        onClick={() => {
                                                            setMessage(qr.text);
                                                            setShowQuickResponses(false);
                                                        }}
                                                        className="text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                                                    >
                                                        <span className="font-bold block text-clinical-600 text-xs">{qr.title}</span>
                                                        <span className="truncate block">{qr.text}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Emoji Picker Popover */}
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-4 left-4 bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-10 grid grid-cols-6 gap-1 w-64">
                                            {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '👋', '🙏', '🔥', '🎉', '🏥', '💊', '🦷', '🗓️', '✅', '❌'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => {
                                                        setMessage(prev => prev + emoji);
                                                        setShowEmojiPicker(false);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-xl transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <form onSubmit={handleSendMessage} className="p-4 bg-gray-100 flex items-center space-x-2 shrink-0">
                                    <div className="flex items-center space-x-1 text-gray-500">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 hover:bg-gray-200 rounded-full transition-colors relative"
                                        >
                                            <LucideSmile className="w-6 h-6 text-gray-500" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.onchange = (e: any) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        addMessage(leadId, {
                                                            sender: 'asesora',
                                                            text: '',
                                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                            type: file.type.startsWith('image/') ? 'image' : 'file',
                                                            attachment: {
                                                                name: file.name,
                                                                size: `${(file.size / 1024).toFixed(1)} KB`,
                                                                url: '#'
                                                            }
                                                        });
                                                    }
                                                };
                                                input.click();
                                            }}
                                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                        >
                                            <LucidePaperclip className="w-6 h-6 text-gray-500" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickResponses(!showQuickResponses)}
                                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                            title="Respuestas Rápidas"
                                        >
                                            <LucideZap className="w-6 h-6 text-yellow-500" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 py-3 px-4 bg-white rounded-xl focus:ring-0 outline-none text-sm shadow-sm"
                                    />
                                    <button
                                        type="submit"
                                        className="p-3 bg-clinical-600 text-white rounded-full hover:bg-clinical-700 transition-all shadow-md active:scale-95"
                                    >
                                        <LucideSend className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-gray-900">Tareas Pendientes</h3>
                                    <button className="text-clinical-600 text-sm font-bold flex items-center space-x-1 hover:underline">
                                        <LucidePlus className="w-4 h-4" /> <span>Nueva Tarea</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {['Llamar para confirmar presupuesto', 'Enviar folleto de servicios', 'Validar disponibilidad de Dr. Smith'].map((task, i) => (
                                        <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-100 group cursor-pointer hover:bg-white transition-all">
                                            <div className="w-6 h-6 border-2 border-gray-300 rounded-md group-hover:border-clinical-500"></div>
                                            <span className="flex-1 text-gray-700 font-medium">{task}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'files' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900">Documentos y Archivos</h3>
                                    <button
                                        onClick={() => {
                                            const date = new Date().toLocaleDateString();
                                            const name = window.prompt('Nombre del archivo:', 'Nuevo Documento.pdf');
                                            if (name) {
                                                addDocument(lead.id, {
                                                    id: `doc-${Date.now()}`,
                                                    name,
                                                    type: 'PDF',
                                                    url: '#',
                                                    date
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-clinical-50 text-clinical-600 rounded-lg text-sm font-medium hover:bg-clinical-100 transition-colors"
                                    >
                                        + Subir Archivo
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {lead.documents && lead.documents.length > 0 ? (
                                        lead.documents.map((doc: any) => (
                                            <div key={doc.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer group">
                                                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <LucideFileText className="w-5 h-5" />
                                                </div>
                                                <p className="font-medium text-gray-900 text-sm truncate" title={doc.name}>{doc.name}</p>
                                                <p className="text-xs text-gray-400 mt-1">{doc.date}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                            <LucideFileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No hay documentos adjuntos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6 max-w-2xl px-4 py-2">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        <LucideClock className="w-5 h-5 text-clinical-600" />
                                        Bitácora Inmutable de Transiciones
                                    </h3>
                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">Registros protegidos</span>
                                </div>

                                <div className="relative pl-6 space-y-8 border-l-2 border-gray-100 ml-4">
                                    {history.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-sm text-gray-500 italic">No hay historial de movimientos recientes en la base de datos.</p>
                                        </div>
                                    ) : (
                                        history.map((log: any) => (
                                            <div key={log.id} className="relative group">
                                                <div className="absolute -left-[33px] top-1 w-4 h-4 bg-white border-[3px] border-clinical-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-gray-200">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <p className="text-sm text-gray-700">
                                                            <strong className="text-gray-900">{log.profiles?.first_name} {log.profiles?.last_name}</strong> trasladó este prospecto a una nueva fase:
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mt-1 text-xs font-bold font-mono bg-white p-3 rounded-lg border border-gray-100 shadow-inner w-full">
                                                        <div className="flex-1 truncate text-gray-500 line-through decoration-gray-300">
                                                            {log.from_stage?.name || 'Recién Creado'} {log.from_substage?.name ? `(${log.from_substage.name})` : ''}
                                                        </div>
                                                        <LucideArrowRight className="w-4 h-4 text-clinical-400 shrink-0 hidden md:block" />
                                                        <div className="flex-1 truncate text-clinical-700 bg-clinical-50 px-2 py-1 rounded">
                                                            {log.to_stage?.name} {log.to_substage?.name ? `(${log.to_substage.name})` : ''}
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-4 flex justify-between items-center">
                                                        <span>{new Date(log.changed_at).toLocaleDateString()} a las {new Date(log.changed_at).toLocaleTimeString()}</span>
                                                        <LucideCheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Quick Actions */}
                    <div className="w-80 border-l border-gray-100 bg-gray-50/30 p-8 space-y-8 hidden xl:block">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Embudo de Vida</h4>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-900">Estado: <span className="text-clinical-600">{stages.find((s:any) => s.id === lead.stage_id)?.name || lead.status}</span></p>
                                {lead.substage_id && (
                                    <p className="text-xs text-gray-500 font-medium">Sub-estado: <span className="text-gray-800">{substages.find((s:any) => s.id === lead.substage_id)?.name}</span></p>
                                )}
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                                    <div className="h-full bg-clinical-500 w-[50%]"></div>
                                </div>
                                {lead.stage_entered_at && (
                                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                        <LucideClock className="w-3 h-3" />
                                        Tiempo en etapa: {Math.floor((new Date().getTime() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60))} horas
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asignado a</h4>
                            <div className="flex items-center space-x-3">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${lead.assigned_to}`}
                                    className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
                                    alt="Assignee"
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Asignado
                                    </p>
                                    <p className="text-[10px] text-gray-500">ID: {lead.assigned_to?.substring(0,8)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 space-y-3">
                            {stages.filter((s:any) => s.resolution_type === 'won').map((s:any) => (
                                <button key={s.id} onClick={() => setShowWonModal(true)} className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm">
                                    <LucideCheckCircle2 className="w-4 h-4" />
                                    <span>Ganar ({s.name})</span>
                                </button>
                            ))}
                            {stages.filter((s:any) => s.resolution_type === 'lost').map((s:any) => (
                                <button key={s.id} onClick={() => setShowLostModal(true)} className="w-full py-3 text-sm font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all">
                                    Descartar ({s.name})
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {showWonModal && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <LucideCheckCircle2 className="w-6 h-6 text-emerald-500" /> Convertir a Ganado
                            </h3>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Monto de Venta (Opcional)</label>
                                <input type="number" placeholder="Ej. 150000" className="w-full px-4 py-2 border rounded-xl" value={resolutionData.sale_value} onChange={e => setResolutionData({...resolutionData, sale_value: e.target.value})} />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowWonModal(false)} className="flex-1 px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">Cancelar</button>
                                <button onClick={() => resolveLeadMutation.mutate({ stage_id: stages.find((s:any) => s.resolution_type === 'won')?.id || '', data: { sale_value: resolutionData.sale_value ? parseFloat(resolutionData.sale_value) : null } })} className="flex-1 px-4 py-2 bg-emerald-600 font-bold text-white rounded-xl hover:bg-emerald-700">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                {showLostModal && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <LucideX className="w-6 h-6 text-red-500" /> Marcar como Perdido
                            </h3>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo de Descarte</label>
                                <select className="w-full px-4 py-2 border rounded-xl bg-white" value={resolutionData.lost_reason} onChange={e => setResolutionData({...resolutionData, lost_reason: e.target.value})}>
                                    <option value="">-- Selecciona un motivo --</option>
                                    <option value="Muy Caro">Muy Caro (Precio)</option>
                                    <option value="No Responde">No responde / Inubicable</option>
                                    <option value="Ya se opero">Ya se operó / Trató en otro sitio</option>
                                    <option value="Baja prioridad">Baja Prioridad / Solo curioseaba</option>
                                    <option value="Otro">Otro Motivo</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLostModal(false)} className="flex-1 px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-600">Cancelar</button>
                                <button onClick={() => resolveLeadMutation.mutate({ stage_id: stages.find((s:any) => s.resolution_type === 'lost')?.id || '', data: { lost_reason: resolutionData.lost_reason } })} disabled={!resolutionData.lost_reason} className="flex-1 px-4 py-2 bg-red-600 font-bold text-white rounded-xl hover:bg-red-700 disabled:opacity-50">Descartar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
