import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LucideBrain,
  LucidePlus,
  LucideTrash2,
  LucideSave,
  LucideCheckCircle2,
  LucideLoader2,
  LucideX,
  LucideEdit3,
  LucideBookOpen,
} from 'lucide-react'
import {
  getKnowledgeBase,
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
  KB_SECTIONS,
  type KnowledgeEntry,
} from '../../services/chatbotService'

interface Props {
  clinicaId: string
}

export const KnowledgeBaseManager: React.FC<Props> = ({ clinicaId }) => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  // Form state
  const [section, setSection] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Fetch KB
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['chatbot_kb', clinicaId],
    queryFn: () => getKnowledgeBase(clinicaId),
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return saveKnowledgeEntry({
        id: editingEntry?.id,
        clinica_id: clinicaId,
        section,
        title,
        content,
        sort_order: editingEntry?.sort_order || entries.length,
        is_active: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot_kb', clinicaId] })
      closeModal()
      setSuccessMsg(editingEntry ? 'Entrada actualizada' : 'Entrada agregada')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKnowledgeEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot_kb', clinicaId] })
      setSuccessMsg('Entrada eliminada')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const openNew = () => {
    setEditingEntry(null)
    setSection('general')
    setTitle('')
    setContent('')
    setShowModal(true)
  }

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setSection(entry.section)
    setTitle(entry.title)
    setContent(entry.content)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEntry(null)
    setTitle('')
    setContent('')
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta entrada de conocimiento?')) return
    deleteMutation.mutate(id)
  }

  // Group entries by section
  const groupedEntries = entries.reduce<Record<string, KnowledgeEntry[]>>((acc, entry) => {
    if (!acc[entry.section]) acc[entry.section] = []
    acc[entry.section].push(entry)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LucideLoader2 className="w-6 h-6 text-clinical-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Success */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in">
          <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Agrega información sobre tu empresa para que el bot pueda responder preguntas de tus clientes.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-all shadow-sm"
        >
          <LucidePlus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-clinical-50 flex items-center justify-center mx-auto mb-4">
            <LucideBookOpen className="w-8 h-8 text-clinical-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Base de conocimiento vacía</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Agrega información sobre tu empresa, horarios, políticas y más para que el bot pueda responder preguntas de tus clientes.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-colors"
          >
            <LucidePlus className="w-4 h-4" />
            Agregar primera entrada
          </button>
        </div>
      )}

      {/* Grouped Entries */}
      {Object.entries(groupedEntries).map(([sectionKey, sectionEntries]) => {
        const sectionInfo = KB_SECTIONS.find(s => s.value === sectionKey)
        return (
          <div key={sectionKey} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="text-base">{sectionInfo?.icon || '📄'}</span>
                {sectionInfo?.label || sectionKey}
                <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                  {sectionEntries.length}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {sectionEntries.map((entry) => (
                <div key={entry.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">{entry.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <LucideEdit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id!)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LucideTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <LucideX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                >
                  {KB_SECTIONS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                  placeholder="Ej: Nuestra Misión"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
                  placeholder="Escribe la información que el bot debe conocer sobre este tema..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!title.trim() || !content.trim() || saveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {saveMutation.isPending ? (
                  <LucideLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LucideSave className="w-4 h-4" />
                )}
                {editingEntry ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
