import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import { verifyApiKey } from '../../services/timelinesAIService'
import {
    LucidePlugZap,
    LucideSave,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideEye,
    LucideEyeOff,
    LucideLoader2,
    LucideExternalLink,
    LucideCopy,
    LucideCheck,
    LucideWebhook,
    LucideInfo,
    LucideSearch,
    LucideCreditCard,
    LucideCalendar,
    LucideMessageCircle,
    LucideMail,
    LucideCode2,
    LucideArrowRight,
    LucideSettings2,
    LucideSparkles,
    LucideLock,
    LucideArrowLeft,
    LucidePlay,
} from 'lucide-react'

/* ─────────────────── Types ─────────────────── */

interface TenantKeyStatus {
    hasKey: boolean
    currentKey: string | null
}

type IntegrationCategory = 'all' | 'messaging' | 'payments' | 'calendar' | 'marketing' | 'developer'

interface IntegrationItem {
    id: string
    name: string
    description: string
    category: IntegrationCategory
    icon: React.ReactNode
    gradient: string
    comingSoon: boolean
}

type WebhookTestStatus = 'idle' | 'loading' | 'success' | 'error'

/* ─────────────────── Constants ─────────────────── */

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timelines-webhook`

const CATEGORIES: { key: IntegrationCategory; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'messaging', label: 'Mensajería' },
    { key: 'payments', label: 'Pagos' },
    { key: 'calendar', label: 'Agenda' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'developer', label: 'Desarrolladores' },
]

/* ─────────────────── Timelines AI Logo ─────────────────── */

const TimelinesLogo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => (
    <img
        src="/logos/timelines-ai.png"
        alt="Timelines AI"
        className={size === 'lg' ? 'w-9 h-9 object-contain' : 'w-7 h-7 object-contain'}
    />
)

/* ─────────────────── Integration Card ─────────────────── */

const IntegrationCard: React.FC<{
    item: IntegrationItem
    isConnected: boolean
    onAction: (id: string) => void
}> = ({ item, isConnected, onAction }) => (
    <div
        id={`integration-card-${item.id}`}
        className={`
            group relative bg-white rounded-2xl border overflow-hidden
            transition-all duration-300 ease-out
            hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5
            ${isConnected ? 'border-clinical-200' : 'border-gray-200'}
        `}
    >
        {isConnected && (
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-clinical-400 via-emerald-400 to-clinical-500" />
        )}

        <div className="p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${item.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                    {item.icon}
                </div>
                <span
                    className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase
                        ${isConnected
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                            : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200/60'
                        }
                    `}
                >
                    {isConnected ? (
                        <><LucideCheckCircle2 className="w-3 h-3" /> Conectado</>
                    ) : (
                        'No configurado'
                    )}
                </span>
            </div>

            <h3 className="text-[15px] font-bold text-gray-900 mb-1 leading-snug">{item.name}</h3>
            <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-5">{item.description}</p>

            {item.comingSoon ? (
                <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                    <LucideLock className="w-3.5 h-3.5" />
                    Próximamente
                </button>
            ) : (
                <button
                    onClick={() => onAction(item.id)}
                    className={`
                        w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                        ${isConnected
                            ? 'bg-clinical-50 text-clinical-700 border border-clinical-200 hover:bg-clinical-100 hover:border-clinical-300'
                            : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                        }
                    `}
                >
                    {isConnected ? (
                        <><LucideSettings2 className="w-3.5 h-3.5" /> Gestionar Conexión</>
                    ) : (
                        <><LucideArrowRight className="w-3.5 h-3.5" /> Conectar</>
                    )}
                </button>
            )}
        </div>
    </div>
)

/* ─────────────────── Webhook Event Test Data ─────────────────── */

const WEBHOOK_EVENTS = [
    {
        id: 'message.received.new',
        name: 'Mensaje Recibido',
        payload: {
            event: 'message.received.new',
            data: {
                id: 'test_msg_' + Date.now(),
                chat_id: 'test_chat_001',
                text: '¡Hola! Quisiera agendar una cita para la próxima semana.',
                from_me: false,
                timestamp: Math.floor(Date.now() / 1000),
                chat_name: 'Paciente de Prueba',
                account_id: 'test_account',
            }
        },
    },
    {
        id: 'message.sent.new',
        name: 'Mensaje Enviado',
        payload: {
            event: 'message.sent.new',
            data: {
                id: 'test_msg_sent_' + Date.now(),
                chat_id: 'test_chat_001',
                text: 'Perfecto, le confirmo su cita. ¿Le parece el martes a las 10am?',
                from_me: true,
                timestamp: Math.floor(Date.now() / 1000),
                chat_name: 'Paciente de Prueba',
                account_id: 'test_account',
            }
        },
    },
    {
        id: 'chat.created',
        name: 'Chat Creado',
        payload: {
            event: 'chat.created',
            data: {
                id: 'test_chat_new_' + Date.now(),
                name: 'Nuevo Paciente Test',
                phone: '+573001234567',
                account_id: 'test_account',
                timestamp: Math.floor(Date.now() / 1000),
            }
        },
    },
]

/* ─────────────────── Timelines AI Full Config View ─────────────────── */

const TimelinesConfigView: React.FC<{
    onBack: () => void
    tenant: TenantKeyStatus | null | undefined
    webhookConnected: boolean
    accountId: string | null
}> = ({ onBack, tenant, webhookConnected, accountId }) => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [copiedField, setCopiedField] = useState<string | null>(null)
    const [webhookTests, setWebhookTests] = useState<Record<string, { status: WebhookTestStatus; response: string | null }>>({})

    // Initialize api key from tenant
    React.useEffect(() => {
        if (tenant?.currentKey && tenant.currentKey !== '***ENCRYPTED***') {
            setApiKey(tenant.currentKey)
        }
    }, [tenant?.currentKey])

    const saveMutation = useMutation({
        mutationFn: async (key: string) => {
            if (!currentUser?.clinica_id) throw new Error('No tenant id')
            const { error } = await supabase.rpc('set_timelines_api_key', { p_key: key || null })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant_integrations', currentUser?.clinica_id] })
            queryClient.invalidateQueries({ queryKey: ['timelines_api_key', currentUser?.clinica_id] })
            setSuccessMsg('API Key guardada correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        }
    })

    const handleVerify = async () => {
        if (!apiKey.trim()) return
        setIsVerifying(true)
        setVerifyStatus('idle')
        const valid = await verifyApiKey(apiKey.trim())
        setVerifyStatus(valid ? 'success' : 'error')
        setIsVerifying(false)
    }

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const handleTestWebhook = async (eventId: string) => {
        setWebhookTests(prev => ({ ...prev, [eventId]: { status: 'loading', response: null } }))

        const event = WEBHOOK_EVENTS.find(e => e.id === eventId)
        if (!event) return

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event.payload),
            })
            const text = await response.text()
            let parsed: string
            try { parsed = JSON.stringify(JSON.parse(text), null, 2) } catch { parsed = text }

            setWebhookTests(prev => ({ ...prev, [eventId]: {
                status: response.ok ? 'success' : 'error',
                response: `HTTP ${response.status} ${response.statusText}\n${parsed}`
            } }))
        } catch (err) {
            setWebhookTests(prev => ({ ...prev, [eventId]: {
                status: 'error',
                response: `Error de red: ${(err as Error).message}`
            } }))
        }
    }

    const hasKey = !!tenant?.hasKey
    const isPristine = apiKey === (tenant?.currentKey || '')

    return (
        <div className="max-w-4xl">
            {/* ─── Back navigation + Header ──────── */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 cursor-pointer group"
                    id="back-to-marketplace"
                >
                    <LucideArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Volver a Integraciones
                </button>

                <div className="flex items-start justify-between pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                            <TimelinesLogo size="lg" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Timelines AI</h1>
                            <p className="text-sm text-gray-500 mt-0.5">WhatsApp CRM · Chats y Mensajería</p>
                        </div>
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${hasKey ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'}`}>
                        {hasKey ? '✓ Conectado' : '⚠ Pendiente'}
                    </div>
                </div>
            </div>

            {/* ─── Single card with all config ──────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Status banner */}
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${hasKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        {hasKey ? (
                            <>
                                <LucideCheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800">Integración activa</p>
                                    <p className="text-xs text-emerald-600">Tu API Key está configurada y operativa.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <LucideAlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">Pendiente de configuración</p>
                                    <p className="text-xs text-amber-600">Ingresa tu API Key para activar la integración.</p>
                                </div>
                            </>
                        )}
                    </div>

                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-3 border border-emerald-100">
                            <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">{successMsg}</p>
                        </div>
                    )}

                    <p className="text-sm text-gray-600">
                        Conecta tu cuenta de{' '}
                        <a href="https://app.timelines.ai" target="_blank" rel="noreferrer" className="text-clinical-600 hover:underline inline-flex items-center gap-1">
                            Timelines AI <LucideExternalLink className="w-3 h-3" />
                        </a>{' '}
                        para ver y responder tus chats de WhatsApp directamente desde el CRM.
                    </p>

                    {/* ─── Step 1: API Key ──────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                            <label className="text-sm font-semibold text-gray-800">API Key (Bearer Token)</label>
                        </div>
                        <p className="text-xs text-gray-500 ml-8">
                            Obtén tu API Key en <strong>Timelines AI → Automations → API</strong>.
                        </p>
                        <div className="flex gap-2 ml-8">
                            <div className="relative flex-1">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => { setApiKey(e.target.value); setVerifyStatus('idle') }}
                                    placeholder="Pega aquí tu API Key..."
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    id="timelines-api-key-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    aria-label={showKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                                >
                                    {showKey ? <LucideEyeOff className="w-4 h-4" /> : <LucideEye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleVerify}
                                disabled={!apiKey.trim() || isVerifying}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                            >
                                {isVerifying ? (
                                    <span className="flex items-center gap-2"><LucideLoader2 className="w-4 h-4 animate-spin" /> Verificando...</span>
                                ) : 'Verificar'}
                            </button>
                        </div>

                        {verifyStatus === 'success' && (
                            <div className="mt-1 ml-8 flex items-center gap-2 text-green-600 text-sm">
                                <LucideCheckCircle2 className="w-4 h-4" />
                                <span>Conexión exitosa. La API Key es válida.</span>
                            </div>
                        )}
                        {verifyStatus === 'error' && (
                            <div className="mt-1 ml-8 flex items-center gap-2 text-red-500 text-sm">
                                <LucideAlertCircle className="w-4 h-4" />
                                <span>No se pudo conectar. Verifica la API Key o revisa CORS.</span>
                            </div>
                        )}
                    </div>

                    {/* ─── Step 2: Webhook ──────────────── */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                            <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <LucideWebhook className="w-4 h-4 text-gray-500" />
                                Configurar Webhook
                            </label>
                            {webhookConnected && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                    ✓ Vinculado
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 ml-8">
                            Configura el webhook en <strong>Timelines AI → Automations → Webhooks</strong> para recibir mensajes en tiempo real.
                        </p>

                        <div className="ml-8 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            readOnly
                                            value={WEBHOOK_URL}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-mono text-xs cursor-text select-all"
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                            id="webhook-url-input"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(WEBHOOK_URL, 'webhook')}
                                        className="px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {copiedField === 'webhook' ? (
                                            <><LucideCheck className="w-4 h-4 text-green-600" /> <span className="text-green-600 text-xs">Copiado</span></>
                                        ) : (
                                            <><LucideCopy className="w-4 h-4" /> <span className="text-xs">Copiar</span></>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Eventos con botón de prueba integrado */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">Eventos a suscribir</label>
                                <div className="space-y-2">
                                    {WEBHOOK_EVENTS.map(evt => {
                                        const test = webhookTests[evt.id]
                                        const isLoading = test?.status === 'loading'
                                        return (
                                            <div key={evt.id} className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                                                test?.status === 'success' ? 'border-emerald-200' :
                                                test?.status === 'error' ? 'border-red-200' :
                                                'border-gray-200'
                                            }`}>
                                                <div className="flex items-center gap-3 px-3 py-2.5">
                                                    {/* Status dot */}
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                        test?.status === 'success' ? 'bg-emerald-500' :
                                                        test?.status === 'error' ? 'bg-red-500' :
                                                        isLoading ? 'bg-blue-500 animate-pulse' :
                                                        'bg-gray-300'
                                                    }`} />
                                                    <code className="text-[11px] font-mono text-gray-700 flex-1">{evt.id}</code>
                                                    <span className="text-[10px] text-gray-400 hidden sm:inline">{evt.name}</span>
                                                    <button
                                                        onClick={() => handleTestWebhook(evt.id)}
                                                        disabled={isLoading}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                                    >
                                                        {isLoading ? (
                                                            <LucideLoader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <LucidePlay className="w-3 h-3" />
                                                        )}
                                                        Probar
                                                    </button>
                                                </div>
                                                {/* Inline response */}
                                                {test?.response && (
                                                    <div className={`border-t px-3 py-2 ${test.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                            test.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                                                        }`}>
                                                            {test.status === 'success' ? '✓ OK' : '✗ Error'}
                                                        </span>
                                                        <pre className="mt-1 text-[10px] font-mono text-gray-600 whitespace-pre-wrap break-all max-h-28 overflow-y-auto leading-relaxed">
                                                            {test.response}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Setup instructions */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                    <LucideInfo className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-blue-800 space-y-1.5">
                                        <p className="font-semibold">Pasos para configurar:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                                            <li>Ir a <a href="https://app.timelines.ai/settings/webhooks" target="_blank" rel="noreferrer" className="underline font-medium">Timelines AI → Settings → Webhooks</a></li>
                                            <li>Hacer clic en <strong>"Add webhook"</strong></li>
                                            <li>Pegar la <strong>Webhook URL</strong> de arriba</li>
                                            <li>Seleccionar los eventos y usar <strong>"Probar"</strong> para validar cada uno</li>
                                            <li>Guardar y activar el webhook</li>
                                        </ol>
                                        <p className="text-blue-600 mt-2">
                                            El sistema detectará automáticamente tu cuenta de Timelines AI al recibir el primer evento.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {webhookConnected && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <LucideCheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span>Account ID vinculado: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{accountId}</code></span>
                                </div>
                            )}
                        </div>
                    </div>

                    {saveMutation.isError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl flex items-center space-x-2 border border-red-100 text-sm">
                            <LucideAlertCircle className="w-4 h-4 shrink-0" />
                            <span>{(saveMutation.error as Error)?.message}</span>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => saveMutation.mutate(apiKey.trim())}
                            disabled={saveMutation.isPending || isPristine}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer ${isPristine
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                                : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed'
                            }`}
                        >
                            <LucideSave className="w-4 h-4" />
                            <span>{saveMutation.isPending ? 'Guardando...' : 'Guardar API Key'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ─────────────────── Main Component ─────────────────── */

export const IntegrationsSettings: React.FC = () => {
    const { currentUser } = useStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('all')
    const [activeIntegration, setActiveIntegration] = useState<string | null>(null)

    /* ── Data fetching ────────────── */
    const { data: tenant, isLoading } = useQuery<TenantKeyStatus | null>({
        queryKey: ['tenant_integrations', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return null
            const { data: hasKey } = await supabase.rpc('has_timelines_api_key')
            const { data: currentKey } = await supabase.rpc('get_timelines_api_key')
            return { hasKey: !!hasKey, currentKey: currentKey as string | null }
        },
        enabled: !!currentUser?.clinica_id,
    })

    const { data: clinicData } = useQuery({
        queryKey: ['clinic_timelines_account', currentUser?.clinica_id],
        queryFn: async () => {
            const { data } = await supabase
                .from('clinicas')
                .select('timelines_account_id')
                .eq('id', currentUser!.clinica_id!)
                .single()
            return data
        },
        enabled: !!currentUser?.clinica_id,
    })

    const hasTimelinesKey = !!tenant?.hasKey
    const webhookConnected = !!clinicData?.timelines_account_id

    /* ── Marketplace items ──── */
    const integrations: IntegrationItem[] = [
        {
            id: 'timelines-ai',
            name: 'Timelines AI',
            description: 'Sincronización WhatsApp CRM. Envía y recibe mensajes directamente desde tu panel.',
            category: 'messaging' as IntegrationCategory,
            icon: <TimelinesLogo />,
            gradient: 'bg-white border border-gray-200',
            comingSoon: false,
        },
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: 'Sincroniza citas y agenda de tu clínica automáticamente con Google Calendar.',
            category: 'calendar',
            icon: <LucideCalendar className="w-7 h-7 text-white" />,
            gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
            comingSoon: true,
        },
        {
            id: 'stripe',
            name: 'Stripe',
            description: 'Cobra tratamientos y servicios médicos con pasarela de pagos segura.',
            category: 'payments',
            icon: <LucideCreditCard className="w-7 h-7 text-white" />,
            gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
            comingSoon: true,
        },
        {
            id: 'twilio',
            name: 'Twilio',
            description: 'Envía recordatorios de citas y notificaciones por SMS a tus pacientes.',
            category: 'messaging',
            icon: <LucideMessageCircle className="w-7 h-7 text-white" />,
            gradient: 'bg-gradient-to-br from-red-400 to-rose-600',
            comingSoon: true,
        },
        {
            id: 'mailchimp',
            name: 'Mailchimp',
            description: 'Campañas de email marketing y seguimiento post-consulta automatizado.',
            category: 'marketing',
            icon: <LucideMail className="w-7 h-7 text-white" />,
            gradient: 'bg-gradient-to-br from-amber-400 to-yellow-600',
            comingSoon: true,
        },
        {
            id: 'webhooks',
            name: 'Webhooks',
            description: 'Conecta eventos de tu CRM con cualquier servicio externo vía HTTP.',
            category: 'developer',
            icon: <LucideCode2 className="w-7 h-7 text-white" />,
            gradient: 'bg-gradient-to-br from-gray-600 to-gray-800',
            comingSoon: true,
        },
    ]

    /* ── Filtering ──── */
    const filteredIntegrations = integrations.filter(item => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory
        const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    const connectedCount = hasTimelinesKey ? 1 : 0

    /* ── Action handler ──── */
    const handleAction = (id: string) => {
        setActiveIntegration(id)
    }

    /* ── Permission gate ──── */
    if (currentUser?.role !== 'Super_Admin') {
        return <div className="text-red-500">No tienes permisos para ver esta sección.</div>
    }

    /* ═══════ If an integration is selected → show its full config ═══════ */
    if (activeIntegration === 'timelines-ai') {
        return (
            <TimelinesConfigView
                onBack={() => setActiveIntegration(null)}
                tenant={tenant}
                webhookConnected={webhookConnected}
                accountId={clinicData?.timelines_account_id ?? null}
            />
        )
    }

    /* ═══════ Marketplace Grid ═══════ */
    return (
        <div className="max-w-5xl">
            {/* ─── Header ──────────────────────── */}
            <div className="mb-8 pb-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-clinical-500 to-emerald-600 text-white p-2.5 rounded-xl shadow-sm">
                            <LucidePlugZap className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Integraciones</h1>
                            <p className="text-sm text-gray-500 mt-1">Conecta tu clínica con herramientas externas</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                        <LucideSparkles className="w-3.5 h-3.5 text-clinical-500" />
                        <span className="text-xs font-medium text-gray-600">
                            {connectedCount} de {integrations.length} activas
                        </span>
                    </div>
                </div>

                {/* ─── Search + Category Filter ──────── */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar integración..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-clinical-400 focus:border-transparent outline-none transition-all"
                            id="integrations-search-input"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`
                                    px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
                                    ${activeCategory === cat.key
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }
                                `}
                                id={`filter-category-${cat.key}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Grid ──────────────────────────── */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                                <div className="w-20 h-5 rounded-full bg-gray-100" />
                            </div>
                            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                            <div className="h-3 w-2/3 bg-gray-100 rounded mb-5" />
                            <div className="h-10 w-full bg-gray-100 rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : filteredIntegrations.length === 0 ? (
                <div className="text-center py-16">
                    <LucideSearch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No se encontraron integraciones</p>
                    <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda o categoría.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredIntegrations.map(item => (
                        <IntegrationCard
                            key={item.id}
                            item={item}
                            isConnected={item.id === 'timelines-ai' && hasTimelinesKey}
                            onAction={handleAction}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
