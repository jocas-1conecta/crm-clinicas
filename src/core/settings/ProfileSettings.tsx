import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import { LucideSave, LucideCheckCircle2, LucideUser, LucideAlertCircle, LucideCamera } from 'lucide-react'

export const ProfileSettings: React.FC = () => {
    const { currentUser, setCurrentUser } = useStore()
    const queryClient = useQueryClient()
    const [successMsg, setSuccessMsg] = useState('')
    const [uploadingAvatar, setUploadingAvatar] = useState(false)

    const { data: profile, isLoading, isError } = useQuery({
        queryKey: ['profile', currentUser?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser?.id)
                .single()
            if (error) throw error
            return data
        },
        enabled: !!currentUser?.id
    })

    const [name, setName] = useState('')
    const [phoneCode, setPhoneCode] = useState('+57')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [timezone, setTimezone] = useState('America/Bogota')

    // Parse stored phone into code + number
    useEffect(() => {
        if (profile) {
            setName(profile.name || '')
            if (profile.phone) {
                const match = profile.phone.match(/^(\+\d{1,3})\s*(.*)/)
                if (match) {
                    setPhoneCode(match[1])
                    setPhoneNumber(match[2])
                } else {
                    setPhoneNumber(profile.phone)
                }
            } else {
                setPhoneCode('+57')
                setPhoneNumber('')
            }
            setTimezone(profile.timezone || 'America/Bogota')
        }
    }, [profile])

    const updateMutation = useMutation({
        mutationFn: async (updates: { name: string, phone: string, timezone: string }) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', currentUser?.id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (updatedData) => {
            queryClient.setQueryData(['profile', currentUser?.id], updatedData)
            if (currentUser) {
                setCurrentUser({ ...currentUser, name: updatedData.name })
            }
            setSuccessMsg('Perfil actualizado correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        }
    })

    const phone = phoneNumber ? `${phoneCode} ${phoneNumber}` : ''

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate({ name, phone, timezone })
    }

    const isPristine = name === (profile?.name || '') &&
                       phone === (profile?.phone || '') &&
                       timezone === (profile?.timezone || 'America/Bogota')

    const COUNTRY_CODES = [
        { code: '+57', flag: '🇨🇴', name: 'Colombia' },
        { code: '+52', flag: '🇲🇽', name: 'México' },
        { code: '+1', flag: '🇺🇸', name: 'EE.UU. / Canadá' },
        { code: '+54', flag: '🇦🇷', name: 'Argentina' },
        { code: '+56', flag: '🇨🇱', name: 'Chile' },
        { code: '+51', flag: '🇵🇪', name: 'Perú' },
        { code: '+34', flag: '🇪🇸', name: 'España' },
        { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
        { code: '+507', flag: '🇵🇦', name: 'Panamá' },
        { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
        { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
        { code: '+55', flag: '🇧🇷', name: 'Brasil' },
        { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
        { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
        { code: '+504', flag: '🇭🇳', name: 'Honduras' },
        { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
        { code: '+53', flag: '🇨🇺', name: 'Cuba' },
        { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
        { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
        { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
        { code: '+809', flag: '🇩🇴', name: 'Rep. Dominicana' },
    ]

    // Compress image using Canvas API — no external libraries needed
    const compressImage = (file: File, maxSize: number, quality = 0.8): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img

                // Scale down proportionally if larger than maxSize
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
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = () => reject(new Error('Error loading image'))
            img.src = URL.createObjectURL(file)
        })
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !currentUser) return

        setUploadingAvatar(true)
        try {
            // Generate both sizes in parallel
            const [thumbBlob, fullBlob] = await Promise.all([
                compressImage(file, 128, 0.8),  // Thumbnail: 128px for chat, lists, topbar
                compressImage(file, 512, 0.85),  // Full: 512px for profile page
            ])

            const baseName = `${currentUser.id}-${Date.now()}`
            const thumbPath = `avatars/${baseName}_thumb.jpg`
            const fullPath = `avatars/${baseName}_full.jpg`

            // Upload both in parallel
            const [thumbUpload, fullUpload] = await Promise.all([
                supabase.storage.from('avatars').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' }),
                supabase.storage.from('avatars').upload(fullPath, fullBlob, { contentType: 'image/jpeg' }),
            ])

            if (thumbUpload.error) throw thumbUpload.error
            if (fullUpload.error) throw fullUpload.error

            const { data: { publicUrl: thumbUrl } } = supabase.storage.from('avatars').getPublicUrl(thumbPath)
            const { data: { publicUrl: fullUrl } } = supabase.storage.from('avatars').getPublicUrl(fullPath)

            // Update profile with both URLs
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: fullUrl, avatar_thumb_url: thumbUrl })
                .eq('id', currentUser.id)
                
            if (updateError) throw updateError

            queryClient.invalidateQueries({ queryKey: ['profile', currentUser.id] })
            setCurrentUser({ ...currentUser, avatarUrl: fullUrl, avatarThumbUrl: thumbUrl })
            
            setSuccessMsg('Avatar actualizado correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido"
            alert('Error subiendo imagen: Asegúrate de que el bucket "avatars" exista y sea público. Detalle: ' + errorMessage)
        } finally {
            setUploadingAvatar(false)
        }
    }

    if (isLoading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div></div>
    if (isError) return <div className="text-red-500">Error cargando información del perfil.</div>

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Perfil Personal</h1>
                <p className="text-gray-500 mt-1">Administra tu información pública y preferencias.</p>
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

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 h-24 relative border-b border-gray-200">
                    <label className={`absolute -bottom-10 left-6 cursor-pointer group ${uploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                        <img
                            src={currentUser?.avatarUrl}
                            alt="Avatar"
                            className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-sm transition-opacity group-hover:opacity-80"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <LucideCamera className="w-6 h-6 text-white" />
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                        />
                    </label>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 pt-14 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    id="profile-name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono Móvil</label>
                                <div className="flex gap-2">
                                    <select
                                        value={phoneCode}
                                        onChange={(e) => setPhoneCode(e.target.value)}
                                        className="w-[140px] shrink-0 px-2 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all text-sm"
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                        ))}
                                    </select>
                                    <input
                                        id="profile-phone"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                        placeholder="3001234567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="profile-timezone" className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
                                <select
                                    id="profile-timezone"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="America/Bogota">Bogotá, Lima, Quito (GMT-5)</option>
                                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                                    <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <label htmlFor="profile-email" className="block text-sm font-medium text-gray-500 mb-1">Correo Electrónico (No modificable)</label>
                                <input
                                    id="profile-email"
                                    type="email"
                                    disabled
                                    value={currentUser?.email || ''}
                                    className="w-full px-4 py-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400 mt-1">Vinculado a la cuenta central del sistema.</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Rol de Acceso</label>
                                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl flex justify-between items-center cursor-not-allowed">
                                    <span>{currentUser?.role}</span>
                                    <LucideUser className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Solo un administrador puede alterar permisos.</p>
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
                                    : 'bg-clinical-600 text-white hover:bg-clinical-700 disabled:opacity-70 disabled:cursor-not-allowed'
                            }`}
                        >
                            <LucideSave className="w-4 h-4" />
                            <span>{updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
