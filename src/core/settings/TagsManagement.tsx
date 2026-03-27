import React, { useState } from 'react'
import { useClinicTags, useCreateClinicTag, useUpdateClinicTag, useDeleteClinicTag } from '../../hooks/useClinicTags'
import { LucideTag, LucidePlus, LucideTrash2, LucidePencil, LucideCheck, LucideX, LucideLoader2 } from 'lucide-react'

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#6b7280',
    '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488',
    '#0284c7', '#4f46e5', '#9333ea', '#db2777', '#374151',
]

export const TagsManagement = () => {
    const { data: tags = [], isLoading } = useClinicTags()
    const createTag = useCreateClinicTag()
    const updateTag = useUpdateClinicTag()
    const deleteTag = useDeleteClinicTag()

    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState('#6366f1')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')

    const handleCreate = () => {
        if (!newName.trim()) return
        createTag.mutate({ name: newName.trim(), color: newColor }, {
            onSuccess: () => { setNewName(''); setNewColor('#6366f1') }
        })
    }

    const startEdit = (tag: any) => {
        setEditingId(tag.id)
        setEditName(tag.name)
        setEditColor(tag.color)
    }

    const handleUpdate = () => {
        if (!editingId || !editName.trim()) return
        updateTag.mutate({ id: editingId, name: editName.trim(), color: editColor }, {
            onSuccess: () => setEditingId(null)
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm('¿Eliminar esta etiqueta? Se removerá de todos los leads, pacientes y citas.')) return
        deleteTag.mutate(id)
    }

    if (isLoading) {
        return <div className="p-8 text-center text-gray-400"><LucideLoader2 className="w-6 h-6 animate-spin mx-auto" /></div>
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <LucideTag className="w-5 h-5 text-clinical-600" />
                    Etiquetas de la Clínica
                </h2>
                <p className="text-sm text-gray-500 mt-1">Crea etiquetas reutilizables para clasificar leads, pacientes y citas.</p>
            </div>

            {/* Create New Tag */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Nueva Etiqueta</h3>
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre</label>
                        <input
                            type="text"
                            placeholder="Ej. VIP, Urgente, Seguimiento..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clinical-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setNewColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!newName.trim() || createTag.isPending}
                        className="px-5 py-2.5 bg-clinical-600 text-white text-sm font-bold rounded-xl hover:bg-clinical-700 transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
                    >
                        {createTag.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucidePlus className="w-4 h-4" />}
                        Crear
                    </button>
                </div>
            </div>

            {/* Tags List */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{tags.length} etiqueta{tags.length !== 1 ? 's' : ''}</span>
                </div>
                {tags.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <LucideTag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay etiquetas creadas aún</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {tags.map(tag => (
                            <div key={tag.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                {editingId === tag.id ? (
                                    <div className="flex items-center gap-3 flex-1">
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditingId(null) }}
                                            className="flex-1 px-3 py-1.5 text-sm border border-clinical-300 rounded-lg focus:ring-2 focus:ring-clinical-500 outline-none"
                                        />
                                        <div className="flex gap-1">
                                            {PRESET_COLORS.slice(0, 10).map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setEditColor(c)}
                                                    className={`w-5 h-5 rounded-full border-2 transition-all ${editColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <button onClick={handleUpdate} className="p-1.5 bg-clinical-600 text-white rounded-lg hover:bg-clinical-700"><LucideCheck className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><LucideX className="w-3.5 h-3.5" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-offset-1 ring-gray-200" style={{ backgroundColor: tag.color }} />
                                            <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(tag)} className="p-1.5 text-gray-400 hover:text-clinical-600 hover:bg-clinical-50 rounded-lg transition-colors">
                                                <LucidePencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(tag.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <LucideTrash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
