import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '../../store/useStore'
import { supabase } from '../../services/supabase'
import { useChats, useChatMessages, useSendMessage, useApiKey, useUpdateChat, useWorkspaceMembers, useUploadAndSendFile, useTemplates, useChatRealtime, useCreateNewConversation, useMarkChatAsRead, useChatLabels, useAddChatNote } from './useTimelinesAI'
import { useChatContactMap } from './useChatContactMap'
import { TimelinesChat, TimelinesMessage, ChatViewFilter } from '../../services/timelinesAIService'
import {
    LucideSearch,
    LucideSend,
    LucidePhone,
    LucideUser,
    LucideRefreshCw,
    LucideMessageSquare,
    LucidePlugZap,
    LucideChevronRight,
    LucideLoader2,
    LucideAlertTriangle,
    LucideInfo,
    LucideX,
    LucideArchive,
    LucideInbox,
    LucideUserCheck,
    LucidePaperclip,
    LucideZap,
    LucideFileText,
    LucidePlus,
    LucideDownload,
    LucidePlay,
} from 'lucide-react'

// ─── Util ────────────────────────────────────────────────────────────────────

function formatTime(isoOrTimestamp: string | number | undefined): string {
    if (!isoOrTimestamp) return ''
    const d = new Date(
        typeof isoOrTimestamp === 'number' ? isoOrTimestamp * 1000 : isoOrTimestamp
    )
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Ayer'
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

/** Detect file type from URL or filename */
function getAttachmentType(url: string, filename?: string): 'image' | 'audio' | 'video' | 'document' {
    const ext = (filename || url).split('.').pop()?.toLowerCase()?.split('?')[0] || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
    if (['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'oga'].includes(ext)) return 'audio'
    if (['mp4', 'webm', 'mov', 'avi', '3gp'].includes(ext)) return 'video'
    return 'document'
}

/** Format WhatsApp-style text: *bold*, _italic_, ~strikethrough~, and auto-link URLs */
function formatWhatsAppText(text: string, isMine: boolean): React.ReactNode[] {
    if (!text) return []
    // Split by URL pattern first
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, i) => {
        // If this part is a URL
        if (urlRegex.test(part)) {
            urlRegex.lastIndex = 0 // Reset regex
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline break-all ${isMine ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                >
                    {part.length > 50 ? part.slice(0, 50) + '…' : part}
                </a>
            )
        }
        // Apply WhatsApp formatting: *bold*, _italic_, ~strikethrough~
        const formatted = part
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
            .replace(/_((?!\s)[^_]+(?!\s))_/g, '<em>$1</em>')
            .replace(/~([^~]+)~/g, '<del>$1</del>')
        
        return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
    })
}

/** Rich message content renderer — handles images, audio, video, documents, URLs, formatting */
const MessageContent = ({ msg, isMine }: { msg: TimelinesMessage; isMine: boolean }) => {
    const [imgExpanded, setImgExpanded] = useState(false)
    const attachUrl = msg.attachment_url
    const attachName = msg.attachment_filename
    const hasAttach = msg.has_attachment && !!attachUrl

    if (hasAttach && attachUrl) {
        const type = getAttachmentType(attachUrl, attachName)

        if (type === 'image') {
            return (
                <div>
                    <img
                        src={attachUrl}
                        alt={attachName || 'Imagen'}
                        className="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setImgExpanded(true)}
                        loading="lazy"
                    />
                    {msg.text && <p className="mt-1.5 text-sm">{formatWhatsAppText(msg.text, isMine)}</p>}
                    {imgExpanded && (
                        <div
                            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
                            onClick={() => setImgExpanded(false)}
                        >
                            <img src={attachUrl} alt={attachName || 'Imagen'} className="max-w-full max-h-full rounded-lg" />
                        </div>
                    )}
                </div>
            )
        }

        if (type === 'audio') {
            return (
                <div className="min-w-[240px]">
                    <audio controls className="w-full h-10" preload="none">
                        <source src={attachUrl} />
                    </audio>
                    {msg.text && <p className="mt-1 text-sm">{formatWhatsAppText(msg.text, isMine)}</p>}
                </div>
            )
        }

        if (type === 'video') {
            return (
                <div>
                    <video
                        controls
                        className="rounded-lg max-w-full max-h-64"
                        preload="none"
                    >
                        <source src={attachUrl} />
                    </video>
                    {msg.text && <p className="mt-1.5 text-sm">{formatWhatsAppText(msg.text, isMine)}</p>}
                </div>
            )
        }

        // Document/file
        return (
            <div>
                <a
                    href={attachUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        isMine
                            ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                >
                    <LucideFileText className="w-5 h-5 shrink-0" />
                    <span className="text-sm truncate flex-1">{attachName || 'Archivo'}</span>
                    <LucideDownload className="w-4 h-4 shrink-0" />
                </a>
                {msg.text && <p className="mt-1.5 text-sm">{formatWhatsAppText(msg.text, isMine)}</p>}
            </div>
        )
    }

    // Text-only message with formatting + auto-links
    return <>{formatWhatsAppText(msg.text, isMine)}</>
}


const EmptyState = ({ icon: Icon, title, subtitle, action }: {
    icon: React.ElementType
    title: string
    subtitle: string
    action?: React.ReactNode
}) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <div>
            <p className="text-base font-semibold text-gray-700">{title}</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>
        </div>
        {action}
    </div>
)

// ─── Chat List Panel ─────────────────────────────────────────────────────────

const VIEW_TABS = [
    { key: 'open' as const,   label: 'Abiertos', icon: LucideInbox },
    { key: 'unread' as const, label: 'No leídos', icon: LucideMessageSquare },
]

const ChatListPanel = ({
    chats,
    selectedId,
    onSelect,
    isLoading,
    isError,
    onRefresh,
    hasMore,
    onLoadMore,
    viewFilter,
    onViewChange,
}: {
    chats: TimelinesChat[]
    selectedId: string | null
    onSelect: (chat: TimelinesChat) => void
    isLoading: boolean
    isError: boolean
    onRefresh: () => void
    hasMore: boolean
    onLoadMore: () => void
    viewFilter: ChatViewFilter
    onViewChange: (v: ChatViewFilter) => void
}) => {
    const [search, setSearch] = useState('')
    const [showNewChat, setShowNewChat] = useState(false)
    const [newPhone, setNewPhone] = useState('')
    const [newText, setNewText] = useState('')
    const createMutation = useCreateNewConversation()

    const handleCreateChat = () => {
        if (!newPhone.trim() || !newText.trim()) return
        createMutation.mutate(
            { phone: newPhone.trim(), text: newText.trim() },
            {
                onSuccess: () => {
                    setShowNewChat(false)
                    setNewPhone('')
                    setNewText('')
                    setTimeout(onRefresh, 2500)
                },
            }
        )
    }

    const filtered = chats.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    )

    return (
        <div className="w-80 flex flex-col bg-[#1a1f2e] text-white border-r border-white/5 shrink-0">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                            <LucideMessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold">Chat</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowNewChat(v => !v)}
                            className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors text-green-400 hover:text-green-300"
                            title="Nueva conversación"
                        >
                            <LucidePlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onRefresh}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                            title="Actualizar"
                        >
                            <LucideRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* New conversation form */}
                {showNewChat && (
                    <div className="mb-3 p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                        <p className="text-xs font-semibold text-green-400 mb-1">Nueva conversación</p>
                        <input
                            type="tel"
                            placeholder="Número (+51987654321)"
                            value={newPhone}
                            onChange={e => setNewPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <textarea
                            placeholder="Mensaje inicial..."
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateChat}
                                disabled={!newPhone.trim() || !newText.trim() || createMutation.isPending}
                                className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                {createMutation.isPending
                                    ? <LucideLoader2 className="w-3 h-3 animate-spin" />
                                    : <LucideSend className="w-3 h-3" />
                                }
                                Enviar
                            </button>
                            <button
                                onClick={() => { setShowNewChat(false); setNewPhone(''); setNewText('') }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                        {createMutation.isError && (
                            <p className="text-xs text-red-400">{String((createMutation.error as Error)?.message ?? 'Error al crear conversación')}</p>
                        )}
                        {createMutation.isSuccess && (
                            <p className="text-xs text-green-400">✓ Mensaje enviado — la conversación aparecerá en segundos</p>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-3">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar contacto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                    />
                </div>

                {/* View tabs: Abiertos / No leídos */}
                <div className="flex gap-1 mb-2">
                    {VIEW_TABS.map(tab => {
                        const Icon = tab.icon
                        const isActive = viewFilter === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => onViewChange(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'bg-green-500 text-white shadow-md shadow-green-500/25'
                                        : 'text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && !chats.length && (
                    <div className="flex items-center justify-center h-32">
                        <LucideLoader2 className="w-6 h-6 text-gray-500 animate-spin" />
                    </div>
                )}

                {isError && (
                    <div className="m-4 bg-red-900/30 text-red-300 p-3 rounded-xl text-xs border border-red-800/40 flex items-start gap-2">
                        <LucideAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Error al cargar chats. Verifica tu API Key en <Link to="/configuracion/integraciones" className="underline">Configuración → Integraciones</Link>.</span>
                    </div>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500 text-sm px-4 text-center">
                        {search ? (
                            <>
                                <LucideSearch className="w-8 h-8 text-gray-600" />
                                <span>Sin resultados para "{search}"</span>
                            </>
                        ) : viewFilter === 'unread' ? (
                            <>
                                <LucideInbox className="w-8 h-8 text-green-500/50" />
                                <span className="text-green-400/70">¡Todo atendido! 🎉</span>
                                <span className="text-xs text-gray-600">No tienes chats sin leer</span>
                            </>
                        ) : (
                            <>
                                <LucideMessageSquare className="w-8 h-8 text-gray-600" />
                                <span>No hay chats abiertos</span>
                                <span className="text-xs text-gray-600">Prueba en "No leídos"</span>
                            </>
                        )}
                    </div>
                )}

                {filtered.map(chat => {
                    const isUnread = (chat.unread_count ?? 0) > 0
                    const isUnassigned = !chat.chat_assignee

                    return (
                    <button
                        key={chat.id}
                        onClick={() => onSelect(chat)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors text-left relative ${selectedId === chat.id ? 'bg-white/10' : ''} ${isUnread ? 'chat-unread-glow' : ''} ${isUnassigned ? 'chat-unassigned-glow' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base ${isUnassigned ? 'bg-gradient-to-br from-lime-400 to-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
                                {(chat.name || chat.phone || '?').charAt(0).toUpperCase()}
                            </div>
                            {(chat.unread_count ?? 0) > 0 && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
                            )}
                            {isUnassigned && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-lime-400 rounded-full border-2 border-[#1a1f2e] flex items-center justify-center animate-pulse">
                                    <span className="text-[7px] font-black text-gray-900">✦</span>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{chat.name || chat.phone}</p>
                                    {isUnassigned && (
                                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-lime-400/20 text-lime-300 rounded-full border border-lime-400/30">
                                            Nuevo
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-500 ml-2 shrink-0">
                                    {formatTime(chat.last_message_time)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{chat.last_message || 'Sin mensajes'}</p>
                        </div>
                    </button>
                    )
                })}

                {/* Load more button */}
                {hasMore && (
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="w-full py-3 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 border-t border-white/5"
                    >
                        {isLoading
                            ? <><LucideLoader2 className="w-3 h-3 animate-spin" /> Cargando...</>
                            : 'Cargar más conversaciones'
                        }
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Conversation Panel ───────────────────────────────────────────────────────

const ConversationPanel = ({
    chat,
    onShowInfo,
    showInfo,
}: {
    chat: TimelinesChat | null
    onShowInfo: () => void
    showInfo: boolean
}) => {
    const { currentUser } = useStore()
    const [draft, setDraft] = useState('')
    const [showAssign, setShowAssign] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [pendingPreview, setPendingPreview] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { data: messages, isLoading } = useChatMessages(chat?.id ?? null)
    const sendMutation = useSendMessage()
    const updateMutation = useUpdateChat()
    const { data: members = [] } = useWorkspaceMembers()
    const uploadMutation = useUploadAndSendFile()
    const { data: templates = [] } = useTemplates()

    // Fetch clinic name for template variable resolution
    const { data: clinicName } = useQuery({
        queryKey: ['clinic_name_for_templates', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase
                .from('clinicas')
                .select('name')
                .eq('id', currentUser!.clinica_id!)
                .single()
            return data?.name ?? ''
        },
        enabled: !!currentUser?.clinica_id,
        staleTime: 1000 * 60 * 30, // 30 min cache
    })

    /** Replace template variables with real contact/clinic data */
    const resolveTemplateVariables = useCallback((body: string): string => {
        const now = new Date()
        return body
            .replace(/\{\{nombre\}\}/g, chat?.name || 'cliente')
            .replace(/\{\{telefono\}\}/g, chat?.phone || '')
            .replace(/\{\{clinica\}\}/g, clinicName || '')
            .replace(/\{\{fecha\}\}/g, now.toLocaleDateString('es-CO'))
            .replace(/\{\{hora\}\}/g, now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
            .replace(/\{\{asesor\}\}/g, currentUser?.name || '')
    }, [chat?.name, chat?.phone, clinicName, currentUser?.name])

    // Real-time: instantly reload messages when a webhook event arrives
    useChatRealtime(chat?.id ?? null)

    useEffect(() => {
        setDraft('')
        setPendingFile(null)
        setPendingPreview(null)
        setUploadError(null)
    }, [chat?.id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const lastFailedText = useRef<string>('')

    const handleFileSelected = (file: File) => {
        setPendingFile(file)
        setUploadError(null)
        // Generate image preview if it's an image
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setPendingPreview(url)
        } else {
            setPendingPreview(null)
        }
    }

    const clearPendingFile = () => {
        setPendingFile(null)
        if (pendingPreview) {
            URL.revokeObjectURL(pendingPreview)
            setPendingPreview(null)
        }
        setUploadError(null)
    }

    const handleSendFile = () => {
        if (!pendingFile || !chat) return
        setUploadError(null)
        uploadMutation.mutate(
            { chatId: chat.id, file: pendingFile, caption: draft || undefined },
            {
                onSuccess: () => {
                    clearPendingFile()
                    setDraft('')
                },
                onError: (err) => {
                    setUploadError(err instanceof Error ? err.message : 'Error al enviar archivo')
                }
            }
        )
    }

    const handleSend = () => {
        if (pendingFile) {
            handleSendFile()
            return
        }
        if (!draft.trim() || !chat) return
        const textToSend = draft.trim()
        lastFailedText.current = textToSend
        setDraft('')
        sendMutation.mutate({ chatId: chat.id, text: textToSend })
    }

    const handleRetry = () => {
        if (!chat || !lastFailedText.current) return
        sendMutation.mutate({ chatId: chat.id, text: lastFailedText.current })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Audio recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
            audioChunksRef.current = []
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg' })
                const audioFile = new File([blob], `audio_${Date.now()}.ogg`, { type: 'audio/ogg' })
                handleFileSelected(audioFile)
            }
            recorder.start()
            mediaRecorderRef.current = recorder
            setIsRecording(true)
        } catch {
            setUploadError('No se pudo acceder al micrófono')
        }
    }

    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
        mediaRecorderRef.current = null
        setIsRecording(false)
    }

    if (!chat) {
        return (
            <div className="flex-1 bg-gray-50 flex flex-col">
                <EmptyState
                    icon={LucideMessageSquare}
                    title="Selecciona una conversación"
                    subtitle="Elige un chat de la lista para ver los mensajes."
                />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
            {/* Conversation Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={onShowInfo}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold">
                        {(chat.name || chat.phone || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{chat.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            <LucidePhone className="w-3 h-3" />
                            {chat.phone}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    {/* Close / Reopen */}
                    <button
                        onClick={() => {
                            const isClosed = chat.chat_status?.includes('closed')
                            updateMutation.mutate(
                                { chatId: chat.id, payload: { closed: !isClosed } },
                                {
                                    onSuccess: () => {
                                        // If we just closed the chat, deselect it so user sees it disappear
                                        if (!isClosed) {
                                            // Will be removed on next query refetch
                                        }
                                    }
                                }
                            )
                        }}
                        disabled={updateMutation.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            chat.chat_status === 'closed'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={chat.chat_status === 'closed' ? 'Reabrir chat' : 'Cerrar chat'}
                    >
                        {updateMutation.isPending
                            ? <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
                            : chat.chat_status === 'closed'
                                ? <><LucideInbox className="w-3.5 h-3.5" /> Reabrir</>
                                : <><LucideArchive className="w-3.5 h-3.5" /> Cerrar</>
                        }
                    </button>

                    {/* Assign to member */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAssign(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Asignar asesor"
                        >
                            <LucideUserCheck className="w-3.5 h-3.5" />
                            {chat.chat_assignee ? chat.chat_assignee.split('@')[0] : 'Asignar'}
                        </button>
                        {showAssign && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            updateMutation.mutate({ chatId: chat.id, payload: { responsible: '' } })
                                            setShowAssign(false)
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                                    >
                                        Sin asignar
                                    </button>
                                    {members.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                updateMutation.mutate({ chatId: chat.id, payload: { responsible: m.email } })
                                                setShowAssign(false)
                                            }}
                                            className="w-full px-4 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="truncate">{m.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <button
                        onClick={onShowInfo}
                        className={`p-2 rounded-xl transition-colors ${showInfo ? 'bg-clinical-50 text-clinical-600' : 'text-gray-400 hover:bg-gray-100'}`}
                        title="Info del contacto"
                    >
                        <LucideInfo className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <LucideLoader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                )}

                {!isLoading && (!messages || messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 text-sm">
                        <LucideMessageSquare className="w-8 h-8 text-gray-300" />
                        <span>No hay mensajes en esta conversación</span>
                    </div>
                )}

                {[...(messages ?? [])].reverse().map((msg) => {
                    const isMine = msg.from_me
                    const isTemp = msg.uid?.startsWith('temp-')
                    const isFailed = isTemp && sendMutation.isError
                    const isSending = isTemp && sendMutation.isPending
                    return (
                        <div key={msg.uid || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-sm lg:max-w-md group`}>
                                <div className={`rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${
                                    msg.has_attachment && msg.attachment_url
                                        ? (isMine
                                            ? 'bg-clinical-600 text-white rounded-br-sm p-1'
                                            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 p-1')
                                        : (isMine
                                            ? isFailed
                                                ? 'bg-red-100 text-red-800 rounded-br-sm border border-red-200 px-4 py-2.5'
                                                : 'bg-clinical-600 text-white rounded-br-sm px-4 py-2.5'
                                            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 px-4 py-2.5')
                                }`}>
                                    <MessageContent msg={msg} isMine={isMine} />
                                </div>
                                {/* Per-message status indicator */}
                                <div className={`text-[10px] mt-1 px-1 flex items-center gap-1 ${
                                    isMine ? 'justify-end' : 'justify-start'
                                } ${
                                    isFailed ? 'text-red-500' : 'text-gray-400'
                                }`}>
                                    {isSending && (
                                        <>
                                            <LucideLoader2 className="w-3 h-3 animate-spin" />
                                            <span>Enviando...</span>
                                        </>
                                    )}
                                    {isFailed && (
                                        <>
                                            <LucideAlertTriangle className="w-3 h-3" />
                                            <span>Error al enviar</span>
                                            <button
                                                onClick={handleRetry}
                                                className="underline font-medium hover:text-red-700 transition-colors ml-1"
                                            >
                                                · Reintentar
                                            </button>
                                        </>
                                    )}
                                    {!isTemp && isMine && (
                                        <>
                                            <span>{formatTime(msg.timestamp)}</span>
                                            <span className="text-clinical-400">✓✓</span>
                                        </>
                                    )}
                                    {!isMine && (
                                        <span>{formatTime(msg.timestamp)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-3 shrink-0">
                {/* File/Image preview */}
                {pendingFile && (
                    <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                        {/* Preview: image thumbnail, audio player, or file icon */}
                        {pendingPreview ? (
                            <img src={pendingPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : pendingFile.type.startsWith('audio/') ? (
                            <audio controls className="h-8 w-40 shrink-0" src={URL.createObjectURL(pendingFile)} preload="auto" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                <LucideFileText className="w-5 h-5 text-gray-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">
                                {pendingFile.type.startsWith('audio/') ? '🎤 Audio grabado' : pendingFile.name}
                            </p>
                            <p className="text-[10px] text-gray-400">{(pendingFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        {uploadMutation.isPending ? (
                            <LucideLoader2 className="w-4 h-4 text-clinical-600 animate-spin shrink-0" />
                        ) : (
                            <button onClick={clearPendingFile} className="text-gray-400 hover:text-gray-600 shrink-0">
                                <LucideX className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Upload error */}
                {uploadError && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                        <LucideAlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">{uploadError}</span>
                        <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
                            <LucideX className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Recording indicator */}
                {isRecording && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="flex-1 font-medium">Grabando audio...</span>
                        <button
                            onClick={stopRecording}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                            Detener
                        </button>
                    </div>
                )}

                {/* Templates dropdown */}
                {showTemplates && templates.length > 0 && (
                    <div className="mb-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setDraft(resolveTemplateVariables(t.body))
                                    setShowTemplates(false)
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                                <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{t.body}</p>
                            </button>
                        ))}
                    </div>
                )}
                {showTemplates && templates.length === 0 && (
                    <p className="mb-2 text-xs text-gray-400 text-center py-2">No hay plantillas configuradas</p>
                )}

                <div className="flex items-end gap-1.5">
                    {/* Hidden file inputs */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) handleFileSelected(f)
                            e.target.value = ''
                        }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="*/*"
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) handleFileSelected(f)
                            e.target.value = ''
                        }}
                    />

                    {/* Image button (camera) */}
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isRecording || uploadMutation.isPending}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-clinical-600 transition-colors shrink-0 disabled:opacity-40"
                        title="Enviar imagen o video"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </button>

                    {/* File button (paperclip) */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isRecording || uploadMutation.isPending}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-clinical-600 transition-colors shrink-0 disabled:opacity-40"
                        title="Adjuntar archivo"
                    >
                        <LucidePaperclip className="w-4 h-4" />
                    </button>

                    {/* Mic button (audio recording) */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={uploadMutation.isPending}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                            isRecording
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-clinical-600'
                        }`}
                        title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    </button>

                    {/* Templates button */}
                    <button
                        onClick={() => setShowTemplates(v => !v)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                            showTemplates ? 'bg-clinical-50 text-clinical-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                        title="Plantillas"
                    >
                        <LucideZap className="w-4 h-4" />
                    </button>

                    {/* Text input */}
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pendingFile ? 'Pie de foto (opcional)...' : 'Escribe un mensaje...'}
                        rows={1}
                        disabled={isRecording || uploadMutation.isPending}
                        className="flex-1 resize-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-clinical-400 focus:border-transparent transition-all placeholder-gray-400"
                        style={{ minHeight: '42px', maxHeight: '120px' }}
                    />

                    {/* Send button */}
                    <button
                        onClick={handleSend}
                        disabled={(!draft.trim() && !pendingFile) || sendMutation.isPending || uploadMutation.isPending || isRecording}
                        className="w-10 h-10 bg-clinical-600 hover:bg-clinical-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {(sendMutation.isPending || uploadMutation.isPending)
                            ? <LucideLoader2 className="w-4 h-4 animate-spin" />
                            : <LucideSend className="w-4 h-4" />
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Contact Info Panel ───────────────────────────────────────────────────────

const ContactInfoPanel = ({ chat, onClose }: { chat: TimelinesChat; onClose: () => void }) => {
    const { labels, addLabel, removeLabel } = useChatLabels(chat.id)
    const addNoteMutation = useAddChatNote()
    const [newLabel, setNewLabel] = useState('')
    const [noteText, setNoteText] = useState('')
    const [noteSuccess, setNoteSuccess] = useState(false)

    const handleAddLabel = () => {
        const label = newLabel.trim()
        if (!label) return
        addLabel.mutate(label)
        setNewLabel('')
    }

    const handleAddNote = () => {
        const text = noteText.trim()
        if (!text) return
        addNoteMutation.mutate({ chatId: chat.id, text }, {
            onSuccess: () => {
                setNoteText('')
                setNoteSuccess(true)
                setTimeout(() => setNoteSuccess(false), 3000)
            },
        })
    }

    return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Info del Contacto</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <LucideX className="w-4 h-4" />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                    {(chat.name || chat.phone || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                    <p className="font-bold text-gray-900">{chat.name || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-500">{chat.phone}</p>
                </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
                <InfoRow icon={LucideUser} label="Nombre" value={chat.name || '—'} />
                <InfoRow icon={LucidePhone} label="Teléfono" value={chat.phone || '—'} />
                
                {chat.chat_assignee && (
                    <InfoRow icon={LucideUser} label="Asignado a" value={chat.chat_assignee} />
                )}
            </div>

            {/* Labels */}
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {labels.map(label => (
                        <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 bg-clinical-50 text-clinical-700 rounded-full text-xs font-medium group">
                            {label}
                            <button
                                onClick={() => removeLabel.mutate(label)}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                title="Quitar etiqueta"
                            >
                                <LucideX className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {labels.length === 0 && <span className="text-xs text-gray-400 italic">Sin etiquetas</span>}
                </div>
                <div className="flex gap-1.5">
                    <input
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
                        placeholder="Agregar etiqueta..."
                        className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-clinical-400"
                    />
                    <button
                        onClick={handleAddLabel}
                        disabled={!newLabel.trim() || addLabel.isPending}
                        className="px-2.5 py-1.5 bg-clinical-500 text-white rounded-lg text-xs font-medium hover:bg-clinical-600 transition-colors disabled:opacity-40"
                    >
                        <LucidePlus className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Internal Notes */}
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas Internas</p>
                <p className="text-[10px] text-gray-400 mb-1.5">Solo visible para el equipo</p>
                <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Escribir una nota..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-clinical-400"
                />
                <div className="flex items-center gap-2 mt-1.5">
                    <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                        {addNoteMutation.isPending
                            ? <LucideLoader2 className="w-3 h-3 animate-spin" />
                            : <LucideFileText className="w-3 h-3" />
                        }
                        Agregar Nota
                    </button>
                    {noteSuccess && <span className="text-xs text-green-600 font-medium">✓ Nota guardada</span>}
                </div>
            </div>
        </div>
    </div>
    )
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-gray-800 truncate">{value}</p>
        </div>
    </div>
)

// ─── No API Key Banner ────────────────────────────────────────────────────────

const NoApiKeyBanner = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shadow-sm">
            <LucidePlugZap className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="text-center max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Conecta Timelines AI</h2>
            <p className="text-gray-500 text-sm">
                Para usar el módulo de Chat necesitas configurar tu API Key de Timelines AI.
                Ve a <strong>Configuración → Integraciones</strong> y pega tu API Key.
            </p>
        </div>
        <Link
            to="/configuracion/integraciones"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md shadow-green-100"
        >
            <LucidePlugZap className="w-4 h-4" />
            Configurar Integración
            <LucideChevronRight className="w-4 h-4" />
        </Link>
    </div>
)

// ─── Main Module ──────────────────────────────────────────────────────────────

export const ChatModule: React.FC = () => {
    const { currentUser } = useStore()
    const markAsRead = useMarkChatAsRead()

    // Admin/Director roles should NOT mark chats as read when viewing
    const isAdmin = ['Platform_Owner', 'Super_Admin', 'Admin_Clinica'].includes(currentUser?.role ?? '')

    const { data: apiKey, isLoading: keyLoading } = useApiKey()

    // Filter state — simplified to 2 views
    const [viewFilter, setViewFilter] = useState<ChatViewFilter>('open')

    const {
        data: chats,
        isLoading: chatsLoading,
        isError,
        refetch,
        hasMore,
        loadMore,
        resetAndRefetch,
    } = useChats({ view: viewFilter })

    // Bidirectional mapping: auto-link chats to leads/patients, filter by assignment
    const { visibleChatIds } = useChatContactMap(chats)

    // Apply visibility filter: admins see all (visibleChatIds=null), asesores see only their mapped chats
    const filteredChats = React.useMemo(() => {
        if (visibleChatIds === null) return chats
        return chats.filter(c => visibleChatIds.has(c.id))
    }, [chats, visibleChatIds])

    const [selectedChat, setSelectedChat] = useState<TimelinesChat | null>(null)
    const [showInfo, setShowInfo] = useState(false)

    const handleViewChange = (v: ChatViewFilter) => {
        setViewFilter(v)
        setSelectedChat(null)
        resetAndRefetch()
    }

    if (keyLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        )
    }

    if (!apiKey) {
        return (
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <NoApiKeyBanner />
            </div>
        )
    }

    return (
        <div
            className="flex bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            style={{ height: 'calc(100vh - 128px)' }}
        >
            <ChatListPanel
                chats={filteredChats}
                selectedId={selectedChat?.id ?? null}
                onSelect={(chat) => {
                    setSelectedChat(chat)
                    setShowInfo(false)
                    // Mark as read only for non-admin roles
                    if (!isAdmin && (chat.unread_count ?? 0) > 0) {
                        markAsRead(chat.id)
                    }
                }}
                isLoading={chatsLoading}
                isError={isError}
                onRefresh={refetch}

                hasMore={hasMore}
                onLoadMore={loadMore}
                viewFilter={viewFilter}
                onViewChange={handleViewChange}
            />
            <ConversationPanel
                chat={selectedChat}
                onShowInfo={() => setShowInfo(v => !v)}
                showInfo={showInfo}
            />
            {showInfo && selectedChat && (
                <ContactInfoPanel chat={selectedChat} onClose={() => setShowInfo(false)} />
            )}
        </div>
    )
}
