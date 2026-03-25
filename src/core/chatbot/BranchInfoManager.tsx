import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import {
  LucideMapPin,
  LucideSave,
  LucideCheckCircle2,
  LucideLoader2,
  LucidePhone,
  LucideMessageSquare,
  LucideClock,
  LucideAlertCircle,
  LucideBuilding,
} from 'lucide-react'
import { getBranchInfoList, upsertBranchInfo, type BranchInfo } from '../../services/chatbotService'

interface Props {
  clinicaId: string
}

interface BranchWithInfo {
  id: string
  name: string
  address: string
  status: string
  info: BranchInfo | null
}

export const BranchInfoManager: React.FC<Props> = ({ clinicaId }) => {
  const queryClient = useQueryClient()
  const [successMsg, setSuccessMsg] = useState('')
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)

  // Form state per branch
  const [forms, setForms] = useState<Record<string, {
    phone: string
    whatsapp: string
    address: string
    opening_hours: string
    extra_info: Record<string, string>
  }>>({})

  // Fetch branches
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches_for_chatbot', clinicaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, name, address, status')
        .eq('clinica_id', clinicaId)
        .order('name')
      if (error) throw error
      return data || []
    },
  })

  // Fetch existing branch info
  const { data: branchInfoList = [], isLoading: isLoadingInfo } = useQuery({
    queryKey: ['chatbot_branch_info', clinicaId],
    queryFn: () => getBranchInfoList(clinicaId),
  })

  // Merge branches with their info
  const branchesWithInfo: BranchWithInfo[] = branches.map(b => ({
    ...b,
    info: branchInfoList.find(bi => bi.sucursal_id === b.id) || null,
  }))

  // Initialize form when branch is selected
  const selectBranch = (branchId: string) => {
    if (activeBranchId === branchId) {
      setActiveBranchId(null)
      return
    }
    setActiveBranchId(branchId)
    const existing = branchInfoList.find(bi => bi.sucursal_id === branchId)
    const branch = branches.find(b => b.id === branchId)
    setForms(prev => ({
      ...prev,
      [branchId]: {
        phone: existing?.phone || '',
        whatsapp: existing?.whatsapp || '',
        address: existing?.address || branch?.address || '',
        opening_hours: existing?.opening_hours || '',
        extra_info: existing?.extra_info || {},
      },
    }))
  }

  const updateFormField = (branchId: string, field: string, value: string) => {
    setForms(prev => ({
      ...prev,
      [branchId]: { ...prev[branchId], [field]: value },
    }))
  }

  // Extra info field management
  const addExtraField = (branchId: string) => {
    const key = prompt('Nombre del campo adicional (ej: "Estacionamiento", "Email"):')
    if (!key?.trim()) return
    setForms(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        extra_info: { ...prev[branchId].extra_info, [key.trim()]: '' },
      },
    }))
  }

  const removeExtraField = (branchId: string, key: string) => {
    setForms(prev => {
      const newExtra = { ...prev[branchId].extra_info }
      delete newExtra[key]
      return {
        ...prev,
        [branchId]: { ...prev[branchId], extra_info: newExtra },
      }
    })
  }

  const updateExtraField = (branchId: string, key: string, value: string) => {
    setForms(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        extra_info: { ...prev[branchId].extra_info, [key]: value },
      },
    }))
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const form = forms[branchId]
      if (!form) throw new Error('No form data')
      return upsertBranchInfo({
        sucursal_id: branchId,
        clinica_id: clinicaId,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        opening_hours: form.opening_hours,
        extra_info: form.extra_info,
        is_active: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot_branch_info', clinicaId] })
      setSuccessMsg('Información de sucursal guardada')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  if (isLoadingBranches || isLoadingInfo) {
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

      <p className="text-sm text-gray-500">
        Configura la información de contacto de cada sucursal activa. El bot usará estos datos para dirigir a los clientes correctamente.
      </p>

      {/* Branch List */}
      {branches.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <LucideBuilding className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin sucursales</h3>
          <p className="text-sm text-gray-500">No se encontraron sucursales registradas para esta clínica.</p>
        </div>
      )}

      {branchesWithInfo.map(branch => {
        const isActive = activeBranchId === branch.id
        const hasInfo = !!branch.info
        const form = forms[branch.id]

        return (
          <div key={branch.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Branch Header */}
            <button
              onClick={() => selectBranch(branch.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${branch.status === 'Activa' ? 'bg-clinical-50 text-clinical-600' : 'bg-gray-100 text-gray-400'}`}>
                  <LucideMapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{branch.name}</h3>
                  <p className="text-xs text-gray-500">{branch.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasInfo ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    ✓ Configurada
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                    <LucideAlertCircle className="w-3 h-3" />
                    Sin configurar
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                  branch.status === 'Activa' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {branch.status}
                </span>
              </div>
            </button>

            {/* Expanded Form */}
            {isActive && form && (
              <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                      <LucidePhone className="w-3.5 h-3.5 text-gray-400" /> Teléfono
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => updateFormField(branch.id, 'phone', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                      <LucideMessageSquare className="w-3.5 h-3.5 text-gray-400" /> WhatsApp
                    </label>
                    <input
                      type="text"
                      value={form.whatsapp}
                      onChange={(e) => updateFormField(branch.id, 'whatsapp', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <LucideMapPin className="w-3.5 h-3.5 text-gray-400" /> Dirección
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateFormField(branch.id, 'address', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                    placeholder="Av. 4 Norte #23-45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <LucideClock className="w-3.5 h-3.5 text-gray-400" /> Horario de Atención
                  </label>
                  <textarea
                    value={form.opening_hours}
                    onChange={(e) => updateFormField(branch.id, 'opening_hours', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent resize-none"
                    placeholder="Lunes a Viernes: 8:00 AM - 6:00 PM&#10;Sábados: 8:00 AM - 1:00 PM"
                  />
                </div>

                {/* Extra Fields */}
                {Object.keys(form.extra_info).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campos Adicionales</p>
                    {Object.entries(form.extra_info).map(([key, val]) => (
                      <div key={key} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">{key}</label>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => updateExtraField(branch.id, key, e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => removeExtraField(branch.id, key)}
                          className="mt-6 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar campo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <button
                    onClick={() => addExtraField(branch.id)}
                    className="text-xs font-medium text-clinical-600 hover:text-clinical-700 transition-colors"
                  >
                    + Agregar campo adicional
                  </button>
                  <button
                    onClick={() => saveMutation.mutate(branch.id)}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 text-white rounded-xl text-sm font-medium hover:bg-clinical-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {saveMutation.isPending ? (
                      <LucideLoader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LucideSave className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
