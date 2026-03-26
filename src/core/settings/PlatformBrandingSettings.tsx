import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideBuilding, LucideSave, LucideCheckCircle2, LucideCamera, LucideGlobe, LucideLoader2, LucidePalette, LucideImage } from 'lucide-react'

const BRAND_COLORS = [
    { color: '#0d9488', name: 'Teal' },
    { color: '#1e40af', name: 'Azul' },
    { color: '#7c3aed', name: 'Violeta' },
    { color: '#be185d', name: 'Rosa' },
    { color: '#dc2626', name: 'Rojo' },
    { color: '#ea580c', name: 'Naranja' },
    { color: '#16a34a', name: 'Verde' },
    { color: '#0f172a', name: 'Oscuro' },
]

const compressImage = (file: File, maxSize: number, quality = 0.9): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let { width, height } = img
            if (width > maxSize || height > maxSize) {
                if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize }
                else { width = Math.round((width * maxSize) / height); height = maxSize }
            }
            canvas.width = width; canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas not supported')); return }
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/png', quality)
        }
        img.onerror = () => reject(new Error('Error loading image'))
        img.src = URL.createObjectURL(file)
    })
}

export const PlatformBrandingSettings: React.FC = () => {
    const queryClient = useQueryClient()
    const [successMsg, setSuccessMsg] = useState('')

    const { data: config, isLoading } = useQuery({
        queryKey: ['platform_config_branding'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('platform_config')
                .select('*')
                .eq('key', 'branding')
                .single()
            if (error) throw error
            return data
        }
    })

    const branding = config?.value || {}

    const [appName, setAppName] = useState('')
    const [brandColor, setBrandColor] = useState('#0d9488')
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false)
    const [uploadingFavicon, setUploadingFavicon] = useState(false)

    useEffect(() => {
        if (branding) {
            setAppName(branding.app_name || '1Clinic')
            setBrandColor(branding.primary_color || '#0d9488')
        }
    }, [config])

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg)
        setTimeout(() => setSuccessMsg(''), 3000)
    }

    const updateBranding = async (updates: Record<string, any>) => {
        const newValue = { ...branding, ...updates }
        const { error } = await supabase
            .from('platform_config')
            .update({ value: newValue, updated_at: new Date().toISOString() })
            .eq('key', 'branding')
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['platform_config_branding'] })
    }

    // ─── Logo upload handlers ─────────────────────────────
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
        setUploadingLogo(true)
        try {
            const blob = await compressImage(file, 512, 0.9)
            const path = `platform-logo-${Date.now()}.png`
            const { error: upErr } = await supabase.storage.from('logos').upload(path, blob, { contentType: 'image/png', upsert: true })
            if (upErr) throw new Error(upErr.message)
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
            await updateBranding({ logo_url: publicUrl })
            showSuccess('Logo actualizado')
        } catch (err: any) { alert('Error: ' + (err.message || err)) }
        finally { setUploadingLogo(false) }
    }

    const handleLoginLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
        setUploadingLoginLogo(true)
        try {
            const blob = await compressImage(file, 512, 0.9)
            const path = `platform-login-logo-${Date.now()}.png`
            const { error: upErr } = await supabase.storage.from('logos').upload(path, blob, { contentType: 'image/png', upsert: true })
            if (upErr) throw new Error(upErr.message)
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
            await updateBranding({ login_logo_url: publicUrl })
            showSuccess('Logo de login actualizado')
        } catch (err: any) { alert('Error: ' + (err.message || err)) }
        finally { setUploadingLoginLogo(false) }
    }

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return }
        setUploadingFavicon(true)
        try {
            const blob = await compressImage(file, 64, 0.9)
            const path = `platform-favicon-${Date.now()}.png`
            const { error: upErr } = await supabase.storage.from('logos').upload(path, blob, { contentType: 'image/png', upsert: true })
            if (upErr) throw new Error(upErr.message)
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
            await updateBranding({ favicon_url: publicUrl })
            showSuccess('Favicon actualizado')
        } catch (err: any) { alert('Error: ' + (err.message || err)) }
        finally { setUploadingFavicon(false) }
    }

    const handleBrandColorChange = async (color: string) => {
        setBrandColor(color)
        try {
            await updateBranding({ primary_color: color })
            showSuccess('Color de marca actualizado')
        } catch (err: any) { alert('Error: ' + (err.message || err)) }
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            await updateBranding({ app_name: appName })
        },
        onSuccess: () => showSuccess('Cambios guardados')
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <LucideLoader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Branding de la Plataforma</h2>
                <p className="text-gray-500 mt-1">Configura la identidad visual de tu plataforma SaaS.</p>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center space-x-2 text-sm border border-emerald-100 animate-in fade-in">
                    <LucideCheckCircle2 className="w-4 h-4" /><span className="font-medium">{successMsg}</span>
                </div>
            )}

            {/* App Name */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                    <LucideBuilding className="w-4 h-4 text-gray-400" /><span>Nombre de la App</span>
                </h3>
                <p className="text-xs text-gray-500">Este nombre aparece en el sidebar, la página de login y el título del navegador.</p>
                <div className="flex items-center gap-3">
                    <input type="text" value={appName} onChange={e => setAppName(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm" 
                        placeholder="1Clinic" />
                    <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || appName === (branding.app_name || '1Clinic')}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        {saveMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                        <span>Guardar</span>
                    </button>
                </div>
            </div>

            {/* Logos & Favicon */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                    <LucideImage className="w-4 h-4 text-gray-400" /><span>Logos y Favicon</span>
                </h3>
                <p className="text-xs text-gray-500">Personaliza los logos que aparecen en el sidebar, el login y el favicon del navegador.</p>
                <div className="grid grid-cols-3 gap-4">
                    {/* Sidebar Logo */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Logo Sidebar</p>
                        <label className={`relative cursor-pointer group block ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-teal-300 transition-colors">
                                {branding.logo_url
                                    ? <img src={branding.logo_url} alt="" className="w-full h-full object-contain p-3" />
                                    : <LucideBuilding className="w-8 h-8 text-gray-300" />}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingLogo ? <LucideLoader2 className="w-5 h-5 text-white animate-spin" /> : <LucideCamera className="w-5 h-5 text-white" />}
                            </div>
                            <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                    </div>

                    {/* Login Logo */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Logo Login</p>
                        <label className={`relative cursor-pointer group block ${uploadingLoginLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-teal-300 transition-colors">
                                {(branding.login_logo_url || branding.logo_url)
                                    ? <img src={branding.login_logo_url || branding.logo_url} alt="" className="w-full h-full object-contain p-3" />
                                    : <LucideBuilding className="w-8 h-8 text-gray-300" />}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingLoginLogo ? <LucideLoader2 className="w-5 h-5 text-white animate-spin" /> : <LucideCamera className="w-5 h-5 text-white" />}
                            </div>
                            <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLoginLogoUpload} disabled={uploadingLoginLogo} />
                        </label>
                    </div>

                    {/* Favicon */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Favicon</p>
                        <label className={`relative cursor-pointer group block ${uploadingFavicon ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-teal-300 transition-colors">
                                {branding.favicon_url
                                    ? <img src={branding.favicon_url} alt="" className="w-full h-full object-contain p-3" />
                                    : <LucideGlobe className="w-8 h-8 text-gray-300" />}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingFavicon ? <LucideLoader2 className="w-5 h-5 text-white animate-spin" /> : <LucideCamera className="w-5 h-5 text-white" />}
                            </div>
                            <input type="file" className="hidden" accept="image/png,image/jpeg,image/svg+xml,image/x-icon" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                        </label>
                    </div>
                </div>
            </div>

            {/* Brand Color */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                    <LucidePalette className="w-4 h-4 text-gray-400" /><span>Color de Marca</span>
                </h3>
                <p className="text-xs text-gray-500">Define el color principal de tu plataforma. Aparece en el sidebar, botones y el login global.</p>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {BRAND_COLORS.map(preset => (
                        <button key={preset.color} type="button" title={preset.name}
                            onClick={() => handleBrandColorChange(preset.color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                brandColor === preset.color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-300 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: preset.color }} />
                    ))}
                    <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
                        <input type="color" value={brandColor}
                            onChange={e => setBrandColor(e.target.value)}
                            onBlur={() => handleBrandColorChange(brandColor)}
                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0" />
                        <span className="text-xs text-gray-400 font-mono uppercase">{brandColor}</span>
                    </div>
                </div>
                {/* Preview */}
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                    <div className="h-11 flex items-center px-4 gap-3" style={{ backgroundColor: brandColor }}>
                        {branding.logo_url && <img src={branding.logo_url} alt="" className="w-6 h-6 rounded object-contain" />}
                        <span className="text-white font-bold text-sm">{appName || '1Clinic'}</span>
                        <span className="ml-auto text-white/50 text-[10px]">Vista previa del sidebar</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
