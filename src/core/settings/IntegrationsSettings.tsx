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
} from 'lucide-react'

interface TenantKeyStatus {
    hasKey: boolean
    currentKey: string | null
}

/** Derive the webhook URL from the Supabase project URL */
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timelines-webhook`

export const IntegrationsSettings: React.FC = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const { data: tenant, isLoading } = useQuery<TenantKeyStatus | null>({
        queryKey: ['tenant_integrations', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return null
            // Check if key exists
            const { data: hasKey } = await supabase.rpc('has_timelines_api_key')
            // Get the actual key for the input field
            const { data: currentKey } = await supabase.rpc('get_timelines_api_key')
            return { hasKey: !!hasKey, currentKey: currentKey as string | null }
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Fetch the timelines_account_id to show connection status
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

    // Initialize the api key from tenant data when it loads
    React.useEffect(() => {
        if (tenant?.currentKey && tenant.currentKey !== '***ENCRYPTED***') {
            setApiKey(tenant.currentKey)
        }
    }, [tenant?.currentKey])

    const saveMutation = useMutation({
        mutationFn: async (key: string) => {
            if (!currentUser?.clinica_id) throw new Error('No tenant id')
            const { error } = await supabase.rpc('set_timelines_api_key', {
                p_key: key || null
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant_integrations', currentUser?.clinica_id] })
            queryClient.invalidateQueries({ queryKey: ['timelines_api_key', currentUser?.clinica_id] })
            setSuccessMsg('API Key guardada correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        }
    })

    if (currentUser?.role !== 'Super_Admin') {
        return <div className="text-red-500">No tienes permisos para ver esta sección.</div>
    }

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

    const hasKey = !!tenant?.hasKey
    const isPristine = apiKey === (tenant?.currentKey || '')
    const webhookConnected = !!clinicData?.timelines_account_id

    return (
        <div className="max-w-2xl">
            <div className="mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-3">
                    <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                        <LucidePlugZap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Integraciones</h1>
                        <p className="text-sm text-gray-500 mt-1">Conecta tu clínica con herramientas externas</p>
                    </div>
                </div>
            </div>

            {successMsg && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-3 border border-emerald-100">
                    <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {/* Timelines AI Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-sm">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Timelines AI</h3>
                            <p className="text-xs text-gray-500">WhatsApp CRM · Chats y Mensajería</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${hasKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isLoading ? 'Cargando...' : hasKey ? '✓ Conectado' : 'No conectado'}
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-600">
                        Conecta tu cuenta de{' '}
                        <a href="https://app.timelines.ai" target="_blank" rel="noreferrer" className="text-clinical-600 hover:underline inline-flex items-center gap-1">
                            Timelines AI <LucideExternalLink className="w-3 h-3" />
                        </a>{' '}
                        para ver y responder tus chats de WhatsApp directamente desde el CRM.
                    </p>

                    {/* ─── Step 1: API Key ──────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                            <label className="text-sm font-semibold text-gray-800">
                                API Key (Bearer Token)
                            </label>
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
                                    placeholder="Pega aquí tu Timelines AI API Key..."
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKey ? <LucideEyeOff className="w-4 h-4" /> : <LucideEye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleVerify}
                                disabled={!apiKey.trim() || isVerifying}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isVerifying ? (
                                    <span className="flex items-center gap-2"><LucideLoader2 className="w-4 h-4 animate-spin" /> Verificando...</span>
                                ) : 'Verificar'}
                            </button>
                        </div>

                        {/* Verification Status */}
                        {verifyStatus === 'success' && (
                            <div className="mt-1 ml-8 flex items-center gap-2 text-green-600 text-sm">
                                <LucideCheckCircle2 className="w-4 h-4" />
                                <span>Conexión exitosa. La API Key es válida.</span>
                            </div>
                        )}
                        {verifyStatus === 'error' && (
                            <div className="mt-1 ml-8 flex items-center gap-2 text-red-500 text-sm">
                                <LucideAlertCircle className="w-4 h-4" />
                                <span>No se pudo conectar. Verifica la API Key o revisa CORS (ver documentación).</span>
                            </div>
                        )}
                    </div>

                    {/* ─── Step 2: Webhook Configuration ──────────────── */}
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

                        {/* Webhook URL */}
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
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(WEBHOOK_URL, 'webhook')}
                                        className="px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
                                    >
                                        {copiedField === 'webhook' ? (
                                            <><LucideCheck className="w-4 h-4 text-green-600" /> <span className="text-green-600 text-xs">Copiado</span></>
                                        ) : (
                                            <><LucideCopy className="w-4 h-4" /> <span className="text-xs">Copiar</span></>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Supported Events */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Eventos a suscribir</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        'message.received.new',
                                        'message.sent.new',
                                        'chat.created',
                                    ].map(evt => (
                                        <span key={evt} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-mono">
                                            {evt}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Setup Instructions */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                    <LucideInfo className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-blue-800 space-y-1.5">
                                        <p className="font-semibold">Pasos para configurar:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                                            <li>Ir a <a href="https://app.timelines.ai/settings/webhooks" target="_blank" rel="noreferrer" className="underline font-medium">Timelines AI → Settings → Webhooks</a></li>
                                            <li>Hacer clic en <strong>"Add webhook"</strong></li>
                                            <li>Pegar la <strong>Webhook URL</strong> de arriba</li>
                                            <li>Seleccionar los eventos: <strong>message.received.new</strong>, <strong>message.sent.new</strong>, <strong>chat.created</strong></li>
                                            <li>Guardar y activar el webhook</li>
                                        </ol>
                                        <p className="text-blue-600 mt-2">
                                            El sistema detectará automáticamente tu cuenta de Timelines AI al recibir el primer evento.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Account ID Status */}
                            {webhookConnected && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <LucideCheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    <span>Account ID vinculado: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{clinicData?.timelines_account_id}</code></span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error from save */}
                    {saveMutation.isError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl flex items-center space-x-2 border border-red-100 text-sm">
                            <LucideAlertCircle className="w-4 h-4 shrink-0" />
                            <span>{(saveMutation.error as Error)?.message}</span>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => saveMutation.mutate(apiKey.trim())}
                            disabled={saveMutation.isPending || isPristine}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${isPristine
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                                : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer'
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
