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
    const [phone, setPhone] = useState('')
    const [timezone, setTimezone] = useState('America/Bogota')

    useEffect(() => {
        if (profile) {
            setName(profile.name || '')
            setPhone(profile.phone || '')
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate({ name, phone, timezone })
    }

    const isPristine = name === (profile?.name || '') &&
                       phone === (profile?.phone || '') &&
                       timezone === (profile?.timezone || 'America/Bogota')

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !currentUser) return

        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen seleccionada es demasiado grande. Por favor, asegúrate de que pese menos de 2MB.')
            return
        }

        setUploadingAvatar(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id)
                
            if (updateError) throw updateError

            queryClient.invalidateQueries({ queryKey: ['profile', currentUser.id] })
            setCurrentUser({ ...currentUser, avatarUrl: publicUrl })
            
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
                                <input
                                    id="profile-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                    placeholder="+57 "
                                />
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
