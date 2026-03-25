import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LucideSparkles,
  LucideSave,
  LucideCheckCircle2,
  LucideBot,
  LucideMessageCircle,
  LucideAlertTriangle,
  LucideLoader2,
} from 'lucide-react'
import { getChatbotConfig, upsertChatbotConfig, type ChatbotConfig } from '../../services/chatbotService'

interface Props {
  clinicaId: string
}

const PERSONALITY_PRESETS = [
  {
    name: 'Profesional y Cálido',
    icon: '🏥',
    prompt: 'Eres un asistente de atención al cliente profesional, amable y empático para una clínica médica. Tu tono es cálido pero respetuoso. Usas un lenguaje formal pero accesible. Siempre muestras interés genuino en ayudar al paciente.',
  },
  {
    name: 'Casual y Cercano',
    icon: '😊',
    prompt: 'Eres un asistente de atención al cliente casual, amigable y cercano. Usas emojis moderadamente, un tono informal pero respetuoso. Haces que la persona se sienta como si hablara con un amigo que conoce la clínica perfectamente.',
  },
  {
    name: 'Ejecutivo y Conciso',
    icon: '💼',
    prompt: 'Eres un asistente de atención al cliente ejecutivo y eficiente. Respondes de forma directa, concisa y profesional. No usas emojis excesivos. Priorizas dar la información clave rápidamente sin rodeos.',
  },
  {
    name: 'Empático y Detallado',
    icon: '💜',
    prompt: 'Eres un asistente de atención al cliente muy empático y detallado. Te tomas el tiempo de explicar las cosas claramente, anticipas las dudas del paciente y ofreces información adicional que podría ser útil. Muestras comprensión ante sus preocupaciones médicas.',
  },
]

export const ChatbotPersonality: React.FC<Props> = ({ clinicaId }) => {
  const queryClient = useQueryClient()
  const [successMsg, setSuccessMsg] = useState('')

  // Form state
  const [botName, setBotName] = useState('Asistente AI')
  const [personality, setPersonality] = useState(PERSONALITY_PRESETS[0].prompt)
  const [greeting, setGreeting] = useState('¡Hola! 👋 Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?')
  const [fallback, setFallback] = useState('Disculpa, no tengo información suficiente para responder eso. Te recomiendo contactar directamente a nuestro equipo.')

  // Fetch existing config
  const { data: config, isLoading } = useQuery({
    queryKey: ['chatbot_config', clinicaId],
    queryFn: () => getChatbotConfig(clinicaId),
  })

  useEffect(() => {
    if (config) {
      setBotName(config.bot_name || 'Asistente AI')
      setPersonality(config.personality_prompt || PERSONALITY_PRESETS[0].prompt)
      setGreeting(config.greeting_message || greeting)
      setFallback(config.fallback_message || fallback)
    }
  }, [config])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return upsertChatbotConfig({
        clinica_id: clinicaId,
        bot_name: botName,
        personality_prompt: personality,
        greeting_message: greeting,
        fallback_message: fallback,
        is_active: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot_config', clinicaId] })
      setSuccessMsg('Personalidad guardada correctamente')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LucideLoader2 className="w-6 h-6 text-clinical-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Success */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in">
          <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Bot Identity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <LucideBot className="w-4 h-4 text-clinical-500" />
          Identidad del Bot
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Bot</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
              placeholder="Ej: Asistente Rangel"
            />
            <p className="text-xs text-gray-400 mt-1">Este nombre se mostrará en el encabezado del chat.</p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Vista Previa</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clinical-500 to-clinical-700 flex items-center justify-center shadow-md">
                <LucideBot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{botName || 'Asistente AI'}</h3>
                <p className="text-xs text-clinical-600 font-medium flex items-center gap-1">
                  <LucideSparkles className="w-3 h-3" />
                  En línea · Powered by Gemini
                </p>
              </div>
            </div>
            <div className="mt-3 bg-white rounded-xl px-4 py-3 border border-gray-150 text-sm text-gray-700 max-w-xs">
              {greeting || 'Tu mensaje de saludo aparecerá aquí...'}
            </div>
          </div>
        </div>
      </div>

      {/* Personality Prompt */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <LucideSparkles className="w-4 h-4 text-amber-500" />
          Tono y Personalidad
        </h2>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PERSONALITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setPersonality(preset.prompt)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                personality === preset.prompt
                  ? 'bg-clinical-50 text-clinical-700 border-clinical-200 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>

        <textarea
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
          placeholder="Describe la personalidad y tono del bot..."
        />
        <p className="text-xs text-gray-400 mt-1">
          Estas instrucciones definen cómo el bot se comunica con los clientes. Sé específico sobre el tono, nivel de formalidad y estilo de respuesta.
        </p>
      </div>

      {/* Greeting & Fallback */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <LucideMessageCircle className="w-4 h-4 text-blue-500" />
          Mensajes Clave
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje de Saludo</label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
              placeholder="Primer mensaje que el bot envía al inicio..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Este es el primer mensaje que verá el usuario al iniciar una conversación.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <LucideAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Mensaje de Respaldo
            </label>
            <textarea
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
              placeholder="Mensaje cuando el bot no sabe responder..."
            />
            <p className="text-xs text-gray-400 mt-1">
              El bot usará este mensaje cuando no tenga información suficiente para responder.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-clinical-500 to-clinical-700 text-white rounded-xl text-sm font-medium hover:from-clinical-600 hover:to-clinical-800 transition-all disabled:opacity-50 shadow-md shadow-clinical-200 hover:shadow-lg"
        >
          {saveMutation.isPending ? (
            <LucideLoader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LucideSave className="w-4 h-4" />
          )}
          {saveMutation.isPending ? 'Guardando...' : 'Guardar Personalidad'}
        </button>
      </div>
    </div>
  )
}
