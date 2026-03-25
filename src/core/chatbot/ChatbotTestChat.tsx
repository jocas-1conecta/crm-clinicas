import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  LucideSend,
  LucideBot,
  LucideUser,
  LucideLoader2,
  LucideRotateCcw,
  LucideSparkles,
} from 'lucide-react'
import {
  getChatbotConfig,
  createConversation,
  getConversationMessages,
  sendChatMessage,
  type ChatbotConfig,
  type ChatMessage,
} from '../../services/chatbotService'

interface Props {
  clinicaId: string
}

export const ChatbotTestChat: React.FC<Props> = ({ clinicaId }) => {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['chatbot_config', clinicaId],
    queryFn: () => getChatbotConfig(clinicaId),
  })

  const botName = config?.bot_name || 'Asistente AI'
  const greeting = config?.greeting_message || '¡Hola! 👋 ¿En qué puedo ayudarte?'

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Start a new conversation
  const startNewConversation = async () => {
    const conv = await createConversation(clinicaId)
    setConversationId(conv.id)
    setMessages([
      {
        conversation_id: conv.id,
        role: 'assistant',
        content: greeting,
      },
    ])
  }

  // Auto-start on mount
  useEffect(() => {
    if (!isLoadingConfig) {
      startNewConversation()
    }
  }, [isLoadingConfig])

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      if (!conversationId || !config) throw new Error('No conversation')
      return sendChatMessage(clinicaId, conversationId, userMessage, config as ChatbotConfig)
    },
    onMutate: (userMessage) => {
      setMessages(prev => [
        ...prev,
        { conversation_id: conversationId!, role: 'user', content: userMessage },
      ])
      setInput('')
      setIsTyping(true)
    },
    onSuccess: (botReply) => {
      setMessages(prev => [
        ...prev,
        { conversation_id: conversationId!, role: 'assistant', content: botReply },
      ])
      setIsTyping(false)
      inputRef.current?.focus()
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          conversation_id: conversationId!,
          role: 'assistant',
          content: '⚠️ Hubo un error al procesar tu mensaje. Intenta de nuevo.',
        },
      ])
      setIsTyping(false)
    },
  })

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || sendMutation.isPending) return
    sendMutation.mutate(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = async () => {
    setIsTyping(false)
    await startNewConversation()
  }

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <LucideLoader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <LucideBot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{botName}</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <LucideSparkles className="w-3 h-3" />
              En línea · Powered by Gemini
            </p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Nueva conversación"
        >
          <LucideRotateCcw className="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <LucideBot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-clinical-600 text-white rounded-br-md shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-150 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center shrink-0 text-xs font-bold">
                <LucideUser className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-end gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
              <LucideBot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-md border border-gray-150 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={sendMutation.isPending}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="p-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300"
          >
            {sendMutation.isPending ? (
              <LucideLoader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LucideSend className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Este es un chat de prueba. Las respuestas son generadas por IA y pueden no ser 100% precisas.
        </p>
      </div>
    </div>
  )
}
