import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import {
    LucidePlus,
    LucideTrash2,
    LucideEdit,
    LucideSave,
    LucideX,
    LucideLoader2,
    LucideMessageSquare,
    LucideImage,
    LucideFileText,
    LucideGripVertical,
    LucideChevronDown,
    LucideVariable,
    LucideCopy,
    LucideCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatTemplate {
    id: string
    clinica_id: string
    name: string
    body: string
    category: string
    media_url: string | null
    media_type: string | null
    variables: { key: string; label: string }[]
    sort_order: number
    is_active: boolean
    created_at: string
}

const CATEGORIES = [
    { value: 'greeting', label: '👋 Saludo', color: 'bg-blue-50 text-blue-700' },
    { value: 'appointment', label: '📅 Citas', color: 'bg-green-50 text-green-700' },
    { value: 'follow-up', label: '💊 Seguimiento', color: 'bg-purple-50 text-purple-700' },
    { value: 'billing', label: '💳 Pagos', color: 'bg-amber-50 text-amber-700' },
    { value: 'results', label: '📋 Resultados', color: 'bg-teal-50 text-teal-700' },
    { value: 'closing', label: '🙏 Cierre', color: 'bg-gray-50 text-gray-700' },
    { value: 'auto', label: '🤖 Auto-respuesta', color: 'bg-rose-50 text-rose-700' },
    { value: 'general', label: '💬 General', color: 'bg-indigo-50 text-indigo-700' },
]

const VARIABLES = [
    { key: '{{nombre}}', label: 'Nombre del contacto' },
    { key: '{{telefono}}', label: 'Teléfono' },
    { key: '{{clinica}}', label: 'Nombre de la clínica' },
    { key: '{{fecha}}', label: 'Fecha actual' },
    { key: '{{hora}}', label: 'Hora actual' },
    { key: '{{asesor}}', label: 'Nombre del asesor' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const ChatTemplatesSettings: React.FC = () => {
    const { currentUser } = useStore()
    const [templates, setTemplates] = useState<ChatTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<string | null>(null) // template id being edited
    const [showNew, setShowNew] = useState(false)
    const [saving, setSaving] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [filterCategory, setFilterCategory] = useState<string>('all')

    // Form state
    const [formName, setFormName] = useState('')
    const [formBody, setFormBody] = useState('')
    const [formCategory, setFormCategory] = useState('general')
    const [formMediaUrl, setFormMediaUrl] = useState('')
    const [formMediaType, setFormMediaType] = useState<string>('')
    const bodyRef = useRef<HTMLTextAreaElement>(null)

    const clinicaId = currentUser?.clinica_id

    // ─── Fetch templates ──────────────────────────────────────────────────────

    const fetchTemplates = async () => {
        if (!clinicaId) return
        setLoading(true)
        const { data, error } = await supabase
            .from('chat_templates')
            .select('*')
            .eq('clinica_id', clinicaId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
        
        if (!error && data) setTemplates(data as ChatTemplate[])
        setLoading(false)
    }

    useEffect(() => { fetchTemplates() }, [clinicaId])

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!clinicaId || !formName.trim() || !formBody.trim()) return
        setSaving(true)

        const payload = {
            clinica_id: clinicaId,
            name: formName.trim(),
            body: formBody.trim(),
            category: formCategory,
            media_url: formMediaUrl.trim() || null,
            media_type: formMediaType || null,
            variables: VARIABLES.filter(v => formBody.includes(v.key)),
        }

        if (editing) {
            await supabase.from('chat_templates').update(payload).eq('id', editing)
        } else {
            await supabase.from('chat_templates').insert(payload)
        }

        setSaving(false)
        resetForm()
        fetchTemplates()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return
        await supabase.from('chat_templates').delete().eq('id', id)
        fetchTemplates()
    }

    const handleEdit = (t: ChatTemplate) => {
        setEditing(t.id)
        setFormName(t.name)
        setFormBody(t.body)
        setFormCategory(t.category)
        setFormMediaUrl(t.media_url || '')
        setFormMediaType(t.media_type || '')
        setShowNew(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const resetForm = () => {
        setEditing(null)
        setShowNew(false)
        setFormName('')
        setFormBody('')
        setFormCategory('general')
        setFormMediaUrl('')
        setFormMediaType('')
    }

    const insertVariable = (varKey: string) => {
        if (!bodyRef.current) return
        const ta = bodyRef.current
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const newBody = formBody.substring(0, start) + varKey + formBody.substring(end)
        setFormBody(newBody)
        setTimeout(() => {
            ta.focus()
            ta.setSelectionRange(start + varKey.length, start + varKey.length)
        }, 0)
    }

    const copyBody = (body: string, id: string) => {
        navigator.clipboard.writeText(body)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1]

    const filtered = filterCategory === 'all' ? templates : templates.filter(t => t.category === filterCategory)

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LucideMessageSquare className="w-5 h-5 text-clinical-600" />
                        Plantillas de Chat
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Configura mensajes predefinidos para respuestas rápidas en WhatsApp
                    </p>
                </div>
                {!showNew && (
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-semibold hover:bg-clinical-700 transition-colors shadow-sm"
                    >
                        <LucidePlus className="w-4 h-4" />
                        Nueva Plantilla
                    </button>
                )}
            </div>

            {/* Editor */}
            {showNew && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                            {editing ? '✏️ Editar Plantilla' : '✨ Nueva Plantilla'}
                        </h3>
                        <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                            <LucideX className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Name + Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nombre</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Ej: Saludo de bienvenida"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-clinical-400 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Categoría</label>
                            <div className="relative">
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-clinical-400 focus:border-transparent bg-white"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                                <LucideChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Body editor */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Mensaje</label>
                            <span className="text-xs text-gray-400">{formBody.length} caracteres</span>
                        </div>
                        <textarea
                            ref={bodyRef}
                            value={formBody}
                            onChange={e => setFormBody(e.target.value)}
                            placeholder="Escribe el contenido del mensaje..."
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clinical-400 focus:border-transparent font-mono leading-relaxed"
                        />

                        {/* Variables toolbar */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <LucideVariable className="w-3.5 h-3.5" />
                                Variables:
                            </span>
                            {VARIABLES.map(v => (
                                <button
                                    key={v.key}
                                    onClick={() => insertVariable(v.key)}
                                    className="px-2.5 py-1 bg-clinical-50 text-clinical-700 rounded-lg text-xs font-medium hover:bg-clinical-100 transition-colors"
                                    title={v.label}
                                >
                                    {v.key}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Media attachment (optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                            Adjunto (opcional)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                                <select
                                    value={formMediaType}
                                    onChange={e => setFormMediaType(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-clinical-400 bg-white"
                                >
                                    <option value="">Sin adjunto</option>
                                    <option value="image">🖼️ Imagen</option>
                                    <option value="video">🎥 Video</option>
                                    <option value="audio">🎤 Audio</option>
                                    <option value="document">📄 Documento</option>
                                </select>
                                <LucideChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {formMediaType && (
                                <input
                                    value={formMediaUrl}
                                    onChange={e => setFormMediaUrl(e.target.value)}
                                    placeholder="URL del archivo adjunto"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-clinical-400"
                                />
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    {formBody && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Vista previa</label>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex justify-end">
                                    <div className="max-w-xs bg-clinical-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                                        {formBody.replace(/\{\{nombre\}\}/g, 'Juan Pérez')
                                            .replace(/\{\{telefono\}\}/g, '+573001234567')
                                            .replace(/\{\{clinica\}\}/g, 'Clínica Rangel Pereira')
                                            .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString('es-CO'))
                                            .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
                                            .replace(/\{\{asesor\}\}/g, currentUser?.name ?? 'Carolina')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!formName.trim() || !formBody.trim() || saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-semibold hover:bg-clinical-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            {saving ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                            {editing ? 'Guardar Cambios' : 'Crear Plantilla'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterCategory === 'all'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Todas ({templates.length})
                </button>
                {CATEGORIES.map(c => {
                    const count = templates.filter(t => t.category === c.value).length
                    if (count === 0) return null
                    return (
                        <button
                            key={c.value}
                            onClick={() => setFilterCategory(c.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filterCategory === c.value
                                    ? 'bg-gray-900 text-white'
                                    : `${c.color} hover:opacity-80`
                            }`}
                        >
                            {c.label} ({count})
                        </button>
                    )
                })}
            </div>

            {/* Templates list */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <LucideLoader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <LucideFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No hay plantillas configuradas</p>
                    <p className="text-sm text-gray-400 mt-1">Crea tu primera plantilla para agilizar la comunicación por WhatsApp</p>
                    <button
                        onClick={() => setShowNew(true)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white rounded-xl text-sm font-semibold hover:bg-clinical-700 transition-colors mx-auto"
                    >
                        <LucidePlus className="w-4 h-4" />
                        Crear Plantilla
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(t => {
                        const cat = getCategoryInfo(t.category)
                        return (
                            <div
                                key={t.id}
                                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <LucideGripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                                            <h4 className="font-semibold text-gray-900 text-sm">{t.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.color}`}>
                                                {cat.label}
                                            </span>
                                            {t.media_type && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 flex items-center gap-1">
                                                    <LucideImage className="w-3 h-3" />
                                                    {t.media_type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ml-6">
                                            {t.body}
                                        </p>
                                        {t.variables && t.variables.length > 0 && (
                                            <div className="flex gap-1.5 mt-2 ml-6">
                                                {t.variables.map(v => (
                                                    <span key={v.key} className="px-2 py-0.5 bg-clinical-50 text-clinical-600 rounded text-[10px] font-mono">
                                                        {v.key}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => copyBody(t.body, t.id)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Copiar texto"
                                        >
                                            {copiedId === t.id
                                                ? <LucideCheck className="w-4 h-4 text-green-500" />
                                                : <LucideCopy className="w-4 h-4" />
                                            }
                                        </button>
                                        <button
                                            onClick={() => handleEdit(t)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-clinical-600 transition-colors"
                                            title="Editar"
                                        >
                                            <LucideEdit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <LucideTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
