import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import { LucideBuilding, LucideSave, LucideCheckCircle2, LucideAlertCircle, LucideCamera, LucideGlobe, LucideLoader2, LucideExternalLink, LucideImage, LucideType, LucideLayoutList } from 'lucide-react'
import { buildTenantUrl } from '../../utils/getTenantSlug'

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
    const [logoDisplayMode, setLogoDisplayMode] = useState('logo_text')

    // Slug editing state
    const [slug, setSlug] = useState('')
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
    const [isCheckingSlug, setIsCheckingSlug] = useState(false)
    const [slugError, setSlugError] = useState('')
    
    useEffect(() => {
        if (tenant) {
            setName(tenant.name || '')
            setEmail(tenant.email_contacto || '')
            setCurrency(tenant.currency || 'USD')
            setSlug(tenant.slug || '')
            setLogoDisplayMode(tenant.logo_display_mode || 'logo_text')
        }
    }, [tenant])

    // Compress image using Canvas API (PNG to preserve transparency)
    const compressImage = (file: File, maxSize: number, quality = 0.9): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img

                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height * maxSize) / width)
                        width = maxSize
                    } else {
                        width = Math.round((width * maxSize) / height)
                        height = maxSize
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) { reject(new Error('Canvas not supported')); return }

                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
                    'image/png',
                    quality
                )
            }
            img.onerror = () => reject(new Error('Error loading image'))
            img.src = URL.createObjectURL(file)
        })
    }

    // Debounced slug availability check
    useEffect(() => {
        if (!slug || slug === tenant?.slug) {
            setSlugAvailable(null)
            setSlugError('')
            return
        }

        // Validate format
        if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
            setSlugError('Solo letras minúsculas, números y guiones. Debe comenzar con letra o número.')
            setSlugAvailable(false)
            return
        }
        if (slug.length < 3) {
            setSlugError('Mínimo 3 caracteres.')
            setSlugAvailable(null)
            return
        }

        setSlugError('')
        setIsCheckingSlug(true)

        const timeout = setTimeout(async () => {
            try {
                const { data, error } = await supabase.rpc('is_slug_available', {
                    checked_slug: slug
                })
                if (error) throw error
                setSlugAvailable(data === true)
                if (data !== true) setSlugError('Este slug ya está en uso.')
            } catch (err) {
                console.error('Error checking slug:', err)
                setSlugAvailable(null)
            } finally {
                setIsCheckingSlug(false)
            }
        }, 500)

        return () => clearTimeout(timeout)
    }, [slug, tenant?.slug])

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

    const slugMutation = useMutation({
        mutationFn: async (newSlug: string) => {
            if (!currentUser?.clinica_id) throw new Error("No tenant id")
            const { data, error } = await supabase
                .from('clinicas')
                .update({ slug: newSlug })
                .eq('id', currentUser.clinica_id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (updatedData) => {
            queryClient.setQueryData(['tenant_settings', currentUser?.clinica_id], updatedData)
            // Redirect to new subdomain
            window.location.href = buildTenantUrl(updatedData.slug, '/configuracion/empresa')
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate({ name, email_contacto: email, currency })
    }

    const handleSlugSave = () => {
        if (!slug || slug === tenant?.slug || slugAvailable !== true) return
        if (!confirm(`¿Estás seguro de cambiar tu URL a ${slug}.1clc.app? Se redirigirá automáticamente a tu nuevo subdominio.`)) return
        slugMutation.mutate(slug)
    }

    const isPristine = name === (tenant?.name || '') &&
                       email === (tenant?.email_contacto || '') &&
                       currency === (tenant?.currency || 'USD')

    const slugChanged = slug !== (tenant?.slug || '')

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !currentUser?.clinica_id) return

        if (file.size > 5 * 1024 * 1024) {
            alert('El logo seleccionado es demasiado grande. Máximo 5MB.')
            return
        }

        setUploadingLogo(true)
        try {
            // Generate both sizes in parallel
            const [thumbBlob, fullBlob] = await Promise.all([
                compressImage(file, 48, 0.9),   // Thumbnail: 48px for sidebar
                compressImage(file, 512, 0.9),  // Full: 512px for settings/display
            ])

            const baseName = `tenant-${currentUser.clinica_id}-${Date.now()}`
            const thumbPath = `${baseName}_thumb.png`
            const fullPath = `${baseName}_full.png`

            // Upload both in parallel
            const [thumbUpload, fullUpload] = await Promise.all([
                supabase.storage.from('logos').upload(thumbPath, thumbBlob, { contentType: 'image/png', upsert: true }),
                supabase.storage.from('logos').upload(fullPath, fullBlob, { contentType: 'image/png', upsert: true }),
            ])

            if (thumbUpload.error) throw new Error(thumbUpload.error.message || JSON.stringify(thumbUpload.error))
            if (fullUpload.error) throw new Error(fullUpload.error.message || JSON.stringify(fullUpload.error))

            const { data: { publicUrl: thumbUrl } } = supabase.storage.from('logos').getPublicUrl(thumbPath)
            const { data: { publicUrl: fullUrl } } = supabase.storage.from('logos').getPublicUrl(fullPath)

            const { error: updateError } = await supabase
                .from('clinicas')
                .update({ logo_url: fullUrl, logo_thumb_url: thumbUrl })
                .eq('id', currentUser.clinica_id)
                
            if (updateError) throw new Error(updateError.message || JSON.stringify(updateError))

            queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentUser.clinica_id] })
            
            setSuccessMsg('Logo actualizado correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
            console.error('Logo upload error:', error)
            alert('Error subiendo imagen: ' + errorMessage)
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleDisplayModeChange = async (mode: string) => {
        if (!currentUser?.clinica_id) return
        setLogoDisplayMode(mode)
        try {
            const { error } = await supabase
                .from('clinicas')
                .update({ logo_display_mode: mode })
                .eq('id', currentUser.clinica_id)
            if (error) throw error
            queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentUser.clinica_id] })
        } catch (err) {
            console.error('Error updating display mode:', err)
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
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <div className="flex items-center space-x-6 mb-5">
                        <label className={`relative cursor-pointer group ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="w-24 h-24 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm">
                                {tenant?.logo_url ? (
                                    <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <LucideBuilding className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingLogo ? (
                                    <LucideLoader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <LucideCamera className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                                onChange={handleLogoUpload}
                                disabled={uploadingLogo}
                            />
                        </label>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 block mb-1">Logo de la Empresa</h3>
                            <p className="text-xs text-gray-500">Haz clic en la imagen para cambiarla. Se recomiendan PNGs transparentes.</p>
                            {uploadingLogo && <p className="text-xs text-blue-500 mt-1 flex items-center gap-1"><LucideLoader2 className="w-3 h-3 animate-spin" /> Optimizando y subiendo...</p>}
                        </div>
                    </div>

                    {/* Display Mode Selector */}
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-500 mb-2">¿Cómo se muestra en el sidebar?</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'logo_text', label: 'Logo + Texto', icon: LucideLayoutList },
                                { value: 'logo_only', label: 'Solo Logo', icon: LucideImage },
                                { value: 'text_only', label: 'Solo Texto', icon: LucideType },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleDisplayModeChange(opt.value)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                                        logoDisplayMode === opt.value
                                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <opt.icon className="w-3.5 h-3.5" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Slug / Subdomain Section */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <div className="flex items-center space-x-2 mb-4">
                        <LucideGlobe className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-bold text-gray-900">URL de tu Plataforma</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-1">
                            <input
                                id="workspace-slug"
                                type="text"
                                value={slug}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                    setSlug(val)
                                }}
                                className="flex-1 px-4 py-2.5 bg-transparent text-gray-900 font-medium outline-none text-sm"
                                placeholder="mi-clinica"
                            />
                            <span className="pr-4 text-gray-400 text-sm font-medium select-none whitespace-nowrap">.1clc.app</span>
                        </div>

                        <button
                            onClick={handleSlugSave}
                            disabled={!slugChanged || slugAvailable !== true || slugMutation.isPending}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                slugChanged && slugAvailable === true
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {slugMutation.isPending ? (
                                <><LucideLoader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                            ) : (
                                <><LucideGlobe className="w-3.5 h-3.5" /> Cambiar URL</>
                            )}
                        </button>
                    </div>

                    {/* Status indicators */}
                    <div className="mt-2 min-h-[20px]">
                        {isCheckingSlug && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <LucideLoader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidad...
                            </p>
                        )}
                        {!isCheckingSlug && slugChanged && slugAvailable === true && (
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                                <LucideCheckCircle2 className="w-3 h-3" /> ¡Disponible! Tu URL será: <strong>{slug}.1clc.app</strong>
                            </p>
                        )}
                        {!isCheckingSlug && slugError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <LucideAlertCircle className="w-3 h-3" /> {slugError}
                            </p>
                        )}
                        {!slugChanged && tenant?.slug && (
                            <a 
                                href={buildTenantUrl(tenant.slug, '/')} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                            >
                                <LucideExternalLink className="w-3 h-3" />
                                {tenant.slug}.1clc.app
                            </a>
                        )}
                    </div>

                    {slugMutation.isError && (
                        <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-100">
                            Error al cambiar el slug: {slugMutation.error?.message}
                        </div>
                    )}
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
