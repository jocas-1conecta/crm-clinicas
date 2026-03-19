import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useChats, useChatMessages, useSendMessage, useApiKey } from './useTimelinesAI'
import { TimelinesChat } from '../../services/timelinesAIService'
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

// ─── Sub-components ──────────────────────────────────────────────────────────

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

const ChatListPanel = ({
    chats,
    selectedId,
    onSelect,
    isLoading,
    isError,
    onRefresh,
    slugPrefix,
}: {
    chats: TimelinesChat[]
    selectedId: string | null
    onSelect: (chat: TimelinesChat) => void
    isLoading: boolean
    isError: boolean
    onRefresh: () => void
    slugPrefix: string
}) => {
    const [search, setSearch] = useState('')

    const filtered = chats.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    )

    return (
        <div className="w-80 flex flex-col bg-[#1a1f2e] text-white border-r border-white/5 shrink-0">
            {/* Header */}
            <div className="px-5 py-5 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                            <LucideMessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold">Chat</h2>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        title="Actualizar"
                    >
                        <LucideRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar contacto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                    />
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
                        <span>Error al cargar chats. Verifica tu API Key en <Link to={`${slugPrefix}/configuracion/integraciones`} className="underline">Configuración → Integraciones</Link>.</span>
                    </div>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500 text-sm">
                        <LucideMessageSquare className="w-8 h-8 text-gray-600" />
                        <span>{search ? 'Sin resultados' : 'No hay chats'}</span>
                    </div>
                )}

                {filtered.map(chat => (
                    <button
                        key={chat.id}
                        onClick={() => onSelect(chat)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${selectedId === chat.id ? 'bg-white/10' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-base">
                                {(chat.name || chat.phone || '?').charAt(0).toUpperCase()}
                            </div>
                            {(chat.unread_count ?? 0) > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {chat.unread_count}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-white truncate">{chat.name || chat.phone}</p>
                                <span className="text-[10px] text-gray-500 ml-2 shrink-0">
                                    {formatTime(chat.last_message_time)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{chat.last_message || 'Sin mensajes'}</p>
                        </div>
                    </button>
                ))}
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
    const [draft, setDraft] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { data: messages, isLoading, refetch } = useChatMessages(chat?.id ?? null)
    const sendMutation = useSendMessage()

    useEffect(() => {
        setDraft('')
    }, [chat?.id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (!draft.trim() || !chat) return
        sendMutation.mutate({
            phone: chat.phone,
            whatsappAccountPhone: chat.whatsapp_account_phone || '',
            text: draft.trim(),
        }, {
            onSuccess: () => {
                setDraft('')
                refetch()
            },
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
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
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
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
                <button
                    onClick={onShowInfo}
                    className={`p-2 rounded-xl transition-colors ${showInfo ? 'bg-clinical-50 text-clinical-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="Info del contacto"
                >
                    <LucideInfo className="w-5 h-5" />
                </button>
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

                {messages?.map((msg) => {
                    const isMine = msg.from_me
                    return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-sm lg:max-w-md group`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    isMine
                                        ? 'bg-clinical-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                                }`}>
                                    {msg.text}
                                </div>
                                <div className={`text-[10px] text-gray-400 mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                                    {formatTime(msg.timestamp)}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4 shrink-0">
                {sendMutation.isError && (
                    <div className="mb-2 text-xs text-red-500 flex items-center gap-1">
                        <LucideAlertTriangle className="w-3 h-3" />
                        {(sendMutation.error as Error)?.message}
                    </div>
                )}
                <div className="flex items-end gap-3">
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje... (Enter para enviar)"
                        rows={1}
                        className="flex-1 resize-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-clinical-400 focus:border-transparent transition-all placeholder-gray-400"
                        style={{ minHeight: '42px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!draft.trim() || sendMutation.isPending}
                        className="w-10 h-10 bg-clinical-600 hover:bg-clinical-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {sendMutation.isPending
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

const ContactInfoPanel = ({ chat, onClose }: { chat: TimelinesChat; onClose: () => void }) => (
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
                {chat.whatsapp_account_phone && (
                    <InfoRow icon={LucidePhone} label="Cuenta WA" value={chat.whatsapp_account_phone} />
                )}
                {chat.chat_assignee && (
                    <InfoRow icon={LucideUser} label="Asignado a" value={chat.chat_assignee} />
                )}
            </div>

            {/* Labels */}
            {chat.labels && chat.labels.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-2">
                        {chat.labels.map(label => (
                            <span key={label} className="px-2.5 py-1 bg-clinical-50 text-clinical-700 rounded-full text-xs font-medium">
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
)

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

const NoApiKeyBanner = ({ slugPrefix }: { slugPrefix: string }) => (
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
            to={`${slugPrefix}/configuracion/integraciones`}
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
    const slugPrefix = currentUser?.clinica_slug ? `/${currentUser.clinica_slug}` : ''

    const { data: apiKey, isLoading: keyLoading } = useApiKey()
    const { data: chats = [], isLoading: chatsLoading, isError, refetch } = useChats()

    const [selectedChat, setSelectedChat] = useState<TimelinesChat | null>(null)
    const [showInfo, setShowInfo] = useState(false)

    // Loading state while fetching the API key
    if (keyLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LucideLoader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        )
    }

    // No API key configured — show setup CTA
    if (!apiKey) {
        return (
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <NoApiKeyBanner slugPrefix={slugPrefix} />
            </div>
        )
    }

    return (
        <div
            className="flex bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            style={{ height: 'calc(100vh - 128px)' }}
        >
            {/* Left: Chat List */}
            <ChatListPanel
                chats={chats}
                selectedId={selectedChat?.id ?? null}
                onSelect={(chat) => {
                    setSelectedChat(chat)
                    setShowInfo(false)
                }}
                isLoading={chatsLoading}
                isError={isError}
                onRefresh={refetch}
                slugPrefix={slugPrefix}
            />

            {/* Center: Conversation */}
            <ConversationPanel
                chat={selectedChat}
                onShowInfo={() => setShowInfo(v => !v)}
                showInfo={showInfo}
            />

            {/* Right: Contact Info (toggleable) */}
            {showInfo && selectedChat && (
                <ContactInfoPanel chat={selectedChat} onClose={() => setShowInfo(false)} />
            )}
        </div>
    )
}
