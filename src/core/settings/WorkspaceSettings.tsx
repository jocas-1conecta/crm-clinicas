import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import { LucideBuilding, LucideSave, LucideCheckCircle2, LucideAlertCircle, LucideCamera } from 'lucide-react'

export const WorkspaceSettings: React.FC = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [successMsg, setSuccessMsg] = useState('')

    const { data: tenant, isLoading, isError } = useQuery({
        queryKey: ['tenant_settings', currentUser?.clinica_id],
        queryFn: async () => {
             if (!currentUser?.clinica_id) return null
             const { data, error } = await supabase
                .from('clinicas')
                .select('*')
                .eq('id', currentUser.clinica_id)
                .single()
             if (error) throw error
             return data
        },
        enabled: !!currentUser?.clinica_id && currentUser?.role === 'Super_Admin'
    })

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [currency, setCurrency] = useState('USD')
    const [uploadingLogo, setUploadingLogo] = useState(false)
    
    useEffect(() => {
        if (tenant) {
            setName(tenant.name || '')
            setEmail(tenant.email_contacto || '')
            setCurrency(tenant.currency || 'USD')
        }
    }, [tenant])

    const updateMutation = useMutation({
        mutationFn: async (updates: { name: string, email_contacto: string, currency: string }) => {
            if (!currentUser?.clinica_id) throw new Error("No tenant id")
            const { data, error } = await supabase
                .from('clinicas')
                .update(updates)
                .eq('id', currentUser.clinica_id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (updatedData) => {
            queryClient.setQueryData(['tenant_settings', currentUser?.clinica_id], updatedData)
            setSuccessMsg('Espacio de Trabajo actualizado')
            setTimeout(() => setSuccessMsg(''), 4000)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate({ name, email_contacto: email, currency })
    }

    const isPristine = name === (tenant?.name || '') &&
                       email === (tenant?.email_contacto || '') &&
                       currency === (tenant?.currency || 'USD')

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !currentUser?.clinica_id) return

        if (file.size > 2 * 1024 * 1024) {
            alert('El logo seleccionado es demasiado grande. Por favor, asegúrate de que pese menos de 2MB.')
            return
        }

        setUploadingLogo(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `tenant-${currentUser.clinica_id}-${Math.random()}.${fileExt}`
            const filePath = `logos/${fileName}`

            let { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath)

            // Update clinicas with new logo URL
            const { error: updateError } = await supabase
                .from('clinicas')
                .update({ logo_url: publicUrl })
                .eq('id', currentUser.clinica_id)
                
            if (updateError) throw updateError

            queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentUser.clinica_id] })
            
            setSuccessMsg('Logo actualizado correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido"
            alert('Error subiendo imagen: Asegúrate de que el bucket "logos" exista y sea público. Detalle: ' + errorMessage)
        } finally {
            setUploadingLogo(false)
        }
    }

    if (currentUser?.role !== 'Super_Admin') {
         return <div className="text-red-500">No tienes permisos para ver esta sección.</div>
    }

    if (isLoading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div></div>
    if (isError) return <div className="text-red-500">Error obteniendo la configuración del equipo.</div>

    return (
        <div className="max-w-2xl">
            <div className="mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                        <LucideBuilding className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Espacio de Trabajo</h1>
                        <p className="text-sm text-gray-500 mt-1">Configuración global de tu empresa</p>
                    </div>
                </div>
            </div>

            {successMsg && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-3 border border-emerald-100 animate-in fade-in">
                    <LucideCheckCircle2 className="w-5 h-5 auto" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {updateMutation.isError && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center space-x-3 border border-red-100 animate-in fade-in">
                    <LucideAlertCircle className="w-5 h-5 auto" />
                    <p className="text-sm font-medium">Error al guardar los cambios: {updateMutation.error?.message}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
                
                {/* Logo Upload Section */}
                <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
                    <label className={`relative cursor-pointer group ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="w-24 h-24 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm">
                            {tenant?.logo_url ? (
                                <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <LucideBuilding className="w-8 h-8 text-gray-300" />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <LucideCamera className="w-6 h-6 text-white" />
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                        />
                    </label>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 block mb-1">Logo de la Empresa</h3>
                        <p className="text-xs text-gray-500">Haz clic en la imagen para cambiarla. Se recomiendan PNGs transparentes.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
                            <input
                                id="workspace-name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Ej. Clínica Rangel Pereira"
                            />
                        </div>

                        <div>
                            <label htmlFor="workspace-email" className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto Global</label>
                            <input
                                id="workspace-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="contacto@tuempresa.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="workspace-currency" className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
                            <select
                                id="workspace-currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="USD">Dólar Estadounidense (USD)</option>
                                <option value="COP">Peso Colombiano (COP)</option>
                                <option value="MXN">Peso Mexicano (MXN)</option>
                                <option value="EUR">Euros (EUR)</option>
                            </select>
                        </div>

                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 mt-4">
                            <div>
                                <label htmlFor="workspace-tenant-id" className="block text-sm font-medium text-gray-500 mb-1">Identificador de Entorno (Tenant ID)</label>
                                <input
                                    id="workspace-tenant-id"
                                    type="text"
                                    disabled
                                    value={tenant?.id || ''}
                                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl cursor-not-allowed font-mono text-xs"
                                />
                                <p className="text-xs text-gray-400 mt-1">ID Único para integraciones API (No modificable).</p>
                            </div>
                        </div>

                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending || isPristine}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                                isPristine 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer'
                            }`}
                        >
                            <LucideSave className="w-4 h-4" />
                            <span>{updateMutation.isPending ? 'Guardando...' : 'Guardar Parámetros'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
