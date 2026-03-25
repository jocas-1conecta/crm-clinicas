import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import {
    LucideArrowLeft, LucideSave, LucideLoader2, LucideCheckCircle2,
    LucidePlus, LucideTrash2, LucideEdit3, LucideX,
    LucideMessageCircle, LucideInfo, LucideFileText, LucideLink,
    LucideTag, LucideBriefcase,
} from 'lucide-react'

type TabId = 'info' | 'qa' | 'scripts' | 'materials'

const TABS = [
    { id: 'info' as TabId, label: 'Información', icon: LucideInfo },
    { id: 'qa' as TabId, label: 'Guiones Q&A', icon: LucideMessageCircle },
    { id: 'scripts' as TabId, label: 'Scripts de Venta', icon: LucideFileText },
    { id: 'materials' as TabId, label: 'Material de Apoyo', icon: LucideLink },
]

interface QAEntry {
    id?: string
    service_id: string
    clinica_id: string
    question: string
    answer: string
    sort_order: number
    is_active: boolean
}

export const ServiceDetail = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<TabId>('info')
    const [successMsg, setSuccessMsg] = useState('')

    // Info form
    const [name, setName] = useState('')
    const [price, setPrice] = useState(0)
    const [description, setDescription] = useState('')
    const [keywords, setKeywords] = useState('')
    const [greeting, setGreeting] = useState('')
    const [scripts, setScripts] = useState('')
    const [materials, setMaterials] = useState('')

    // QA modal
    const [showQAModal, setShowQAModal] = useState(false)
    const [editingQA, setEditingQA] = useState<QAEntry | null>(null)
    const [qaQuestion, setQaQuestion] = useState('')
    const [qaAnswer, setQaAnswer] = useState('')

    // Fetch service
    const { data: service, isLoading } = useQuery({
        queryKey: ['service', id],
        queryFn: async () => {
            const { data, error } = await supabase.from('services').select('*').eq('id', id).single()
            if (error) throw error
            return data
        },
        enabled: !!id,
    })

    // Fetch Q&As
    const { data: qaEntries = [] } = useQuery({
        queryKey: ['service_knowledge', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('service_knowledge')
                .select('*')
                .eq('service_id', id)
                .eq('is_active', true)
                .order('sort_order')
            if (error) throw error
            return data as QAEntry[]
        },
        enabled: !!id,
    })

    // Populate form
    useEffect(() => {
        if (service) {
            setName(service.name || '')
            setPrice(service.price || 0)
            setDescription(service.description || '')
            setKeywords((service.keywords || []).join(', '))
            setGreeting(service.greeting || '')
            setScripts((service.scripts || []).join('\n'))
            setMaterials((service.support_material || []).join('\n'))
        }
    }, [service])

    // Save info mutation
    const saveInfoMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('services').update({
                name,
                price,
                description: description || null,
                keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                greeting: greeting || null,
                scripts: scripts ? scripts.split('\n').filter(s => s.trim()) : [],
                support_material: materials ? materials.split('\n').filter(s => s.trim()) : [],
            }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service', id] })
            queryClient.invalidateQueries({ queryKey: ['services'] })
            showSuccess('Información guardada')
        },
    })

    // QA mutations
    const saveQAMutation = useMutation({
        mutationFn: async () => {
            if (editingQA?.id) {
                const { error } = await supabase.from('service_knowledge').update({
                    question: qaQuestion,
                    answer: qaAnswer,
                }).eq('id', editingQA.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('service_knowledge').insert([{
                    service_id: id,
                    clinica_id: currentUser?.clinica_id,
                    question: qaQuestion,
                    answer: qaAnswer,
                    sort_order: qaEntries.length,
                    is_active: true,
                }])
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service_knowledge', id] })
            closeQAModal()
            showSuccess(editingQA ? 'Guión actualizado' : 'Guión agregado')
        },
    })

    const deleteQAMutation = useMutation({
        mutationFn: async (qaId: string) => {
            const { error } = await supabase.from('service_knowledge').delete().eq('id', qaId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service_knowledge', id] })
            showSuccess('Guión eliminado')
        },
    })

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg)
        setTimeout(() => setSuccessMsg(''), 3000)
    }

    const openNewQA = () => {
        setEditingQA(null)
        setQaQuestion('')
        setQaAnswer('')
        setShowQAModal(true)
    }

    const openEditQA = (qa: QAEntry) => {
        setEditingQA(qa)
        setQaQuestion(qa.question)
        setQaAnswer(qa.answer)
        setShowQAModal(true)
    }

    const closeQAModal = () => {
        setShowQAModal(false)
        setEditingQA(null)
        setQaQuestion('')
        setQaAnswer('')
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LucideLoader2 className="w-6 h-6 text-clinical-500 animate-spin" />
            </div>
        )
    }

    if (!service) {
        return <div className="p-8 text-center text-gray-500">Servicio no encontrado.</div>
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Success */}
            {successMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in">
                    <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/servicios')}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <LucideArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-clinical-500 to-clinical-700 rounded-2xl shadow-lg shadow-clinical-200">
                        <LucideBriefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{service.name}</h1>
                        <p className="text-sm text-gray-500">${Number(service.price).toLocaleString()} • {qaEntries.length} guiones Q&A</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                                isActive
                                    ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
                                    : 'bg-transparent text-gray-500 border-transparent hover:bg-white/60 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon className={`w-4 h-4 ${isActive ? 'text-clinical-600' : 'text-gray-400'}`} />
                            {tab.label}
                            {tab.id === 'qa' && qaEntries.length > 0 && (
                                <span className="text-[10px] font-bold bg-clinical-50 text-clinical-600 px-1.5 py-0.5 rounded-full">{qaEntries.length}</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-3xl space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
                            placeholder="Descripción del servicio/tratamiento..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                            <LucideTag className="w-3.5 h-3.5 text-gray-400" />
                            Palabras Clave (separadas por coma)
                        </label>
                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                            placeholder="hipotiroidismo, hashimoto, tsh, tiroides" />
                        <p className="text-xs text-gray-400 mt-1">El chatbot usará estas palabras para identificar cuándo un cliente pregunta por este servicio.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Saludo Automático del Servicio</label>
                        <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
                            placeholder="Ej: Gracias por comunicarte con nosotros, ¿cuál es el servicio de tu interés?" />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => saveInfoMutation.mutate()} disabled={saveInfoMutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-colors disabled:opacity-50 shadow-sm">
                            {saveInfoMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                            {saveInfoMutation.isPending ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab: Q&A */}
            {activeTab === 'qa' && (
                <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Guiones de preguntas y respuestas para el chatbot. El bot usará estas respuestas cuando el cliente pregunte.
                        </p>
                        <button onClick={openNewQA}
                            className="flex items-center gap-2 px-4 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-all shadow-sm">
                            <LucidePlus className="w-4 h-4" />
                            Agregar Q&A
                        </button>
                    </div>

                    {qaEntries.length === 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <LucideMessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin guiones Q&A</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                                Agrega pares de pregunta/respuesta para que el chatbot sepa cómo responder sobre este servicio.
                            </p>
                            <button onClick={openNewQA}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700">
                                <LucidePlus className="w-4 h-4" />
                                Agregar primer guión
                            </button>
                        </div>
                    )}

                    {qaEntries.map((qa, idx) => (
                        <div key={qa.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                    <h4 className="text-sm font-bold text-gray-900">{qa.question}</h4>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditQA(qa)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                        <LucideEdit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { if (confirm('¿Eliminar este guión?')) deleteQAMutation.mutate(qa.id!) }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <LucideTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{qa.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Scripts */}
            {activeTab === 'scripts' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-3xl">
                    <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <LucideFileText className="w-4 h-4 text-clinical-500" />
                        Scripts de Venta
                    </h2>
                    <textarea value={scripts} onChange={e => setScripts(e.target.value)} rows={10}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none font-mono"
                        placeholder="Un guión por línea..." />
                    <p className="text-xs text-gray-400 mt-1">Cada línea es un guión de venta diferente.</p>
                    <div className="flex justify-end mt-4">
                        <button onClick={() => saveInfoMutation.mutate()} disabled={saveInfoMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 disabled:opacity-50 shadow-sm">
                            {saveInfoMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {/* Tab: Materials */}
            {activeTab === 'materials' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-3xl">
                    <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <LucideLink className="w-4 h-4 text-clinical-500" />
                        Material de Apoyo
                    </h2>
                    <textarea value={materials} onChange={e => setMaterials(e.target.value)} rows={8}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none font-mono"
                        placeholder="URLs de material de apoyo, uno por línea..." />
                    <p className="text-xs text-gray-400 mt-1">URLs de videos, documentos, imágenes, etc.</p>
                    <div className="flex justify-end mt-4">
                        <button onClick={() => saveInfoMutation.mutate()} disabled={saveInfoMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 disabled:opacity-50 shadow-sm">
                            {saveInfoMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {/* QA Modal */}
            {showQAModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingQA ? 'Editar Guión Q&A' : 'Nuevo Guión Q&A'}
                            </h3>
                            <button onClick={closeQAModal}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <LucideX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta del Cliente</label>
                                <input type="text" value={qaQuestion} onChange={e => setQaQuestion(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                                    placeholder="Ej: ¿Cuánto vale la consulta?" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta del Bot</label>
                                <textarea value={qaAnswer} onChange={e => setQaAnswer(e.target.value)} rows={10}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
                                    placeholder="Escribe la respuesta completa que el bot debe dar..." />
                                <p className="text-xs text-gray-400 mt-1">Puedes incluir emojis y formato. El bot usará esta respuesta tal cual.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                            <button onClick={closeQAModal}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => saveQAMutation.mutate()}
                                disabled={!qaQuestion.trim() || !qaAnswer.trim() || saveQAMutation.isPending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 disabled:opacity-50 shadow-sm">
                                {saveQAMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                                {editingQA ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
