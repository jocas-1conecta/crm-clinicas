import React, { useState } from 'react'
import { useStore } from '../store/useStore'
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
    LucideFileText
} from 'lucide-react'

export const LeadDetail = ({ leadId, onClose }: { leadId: string, onClose: () => void }) => {
    const { leads, chats, addMessage, addDocument, currentUser, config } = useStore()
    const lead = leads.find(l => l.id === leadId)
    const [activeTab, setActiveTab] = useState('whatsapp')
    const [message, setMessage] = useState('')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showQuickResponses, setShowQuickResponses] = useState(false)

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
        { id: 'forum', name: 'Foro', icon: LucideAtSign },
        { id: 'whatsapp', name: 'WhatsApp', icon: LucideMessageSquare },
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
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-clinical-600">{lead.service}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{lead.status}</span>
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
                                    {(chats[leadId] || []).map((msg, i) => (
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
                                                {config.quickResponses?.map((qr: any) => (
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

                        {activeTab === 'forum' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-bold text-blue-600">@LauraAsesora</span> El paciente está muy interesado en el servicio de ortodoncia invisible. Por favor validar si aplica el descuento de convenio.
                                        </p>
                                        <p className="text-[10px] text-blue-400 mt-2">Hace 2 horas • Admin</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-sm text-gray-700">
                                            Entendido, ya estoy revisando con coordinación financiera.
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2">Hace 10 min • Laura Asesora</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 bg-white p-2 border border-gray-200 rounded-2xl shadow-sm">
                                    <input
                                        type="text"
                                        placeholder="Escribe un comentario o usa @ para etiquetar..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4"
                                    />
                                    <button className="px-4 py-2 bg-clinical-600 text-white rounded-xl text-sm font-bold">Comentar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Quick Actions */}
                    <div className="w-80 border-l border-gray-100 bg-gray-50/30 p-8 space-y-8 hidden xl:block">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado del Lead</h4>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-900">Actual: <span className="text-clinical-600">{lead.status}</span></p>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-clinical-500 w-[40%]"></div>
                                </div>
                                <p className="text-[10px] text-gray-500">Última actualización: Hoy, 10:45 AM</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asignado a</h4>
                            <div className="flex items-center space-x-3">
                                <img
                                    src={`https://i.pravatar.cc/150?u=${lead.assignedTo}`}
                                    className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
                                    alt="Assignee"
                                />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {useStore.getState().leads.find(l => l.assignedTo === lead.assignedTo)?.assignedTo === 'u1' ? 'Admin' : 'Laura Asesora'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">Asesora Comercial</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 space-y-3">
                            <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                <span>Agendar Cita</span>
                            </button>
                            <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                                <span>Convertir a Paciente</span>
                            </button>
                            <button className="w-full py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                Marcar No Viable
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
