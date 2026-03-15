import React, { useState } from 'react'
import { supabase } from '../../services/supabase'
import { LucideLock, LucideSave, LucideCheckCircle2 } from 'lucide-react'

export const ChangePasswordForm: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        if (newPassword !== confirmPassword) {
            setError('Las nuevas contraseñas no coinciden.')
            return
        }

        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.')
            return
        }

        setIsLoading(true)

        try {
            const { data: { user }, error: validationError } = await supabase.auth.getUser()
            
            if (validationError || !user?.email) {
                throw new Error("No se pudo verificar la sesión actual.")
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            })

            if (signInError) {
                throw new Error("La contraseña actual es incorrecta.")
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            setSuccess(true)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')

            setTimeout(() => setSuccess(false), 4000)

        } catch (err: any) {
            setError(err.message || "Error inesperado al intentar cambiar la contraseña.")
        } finally {
            setIsLoading(false)
        }
    }

    const isPristine = currentPassword.length === 0 || newPassword.length < 6 || confirmPassword.length < 6

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-lg">
            <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                    <LucideLock className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">Seguridad de la Cuenta</h2>
                    <p className="text-sm text-gray-500">Actualiza tu contraseña de acceso.</p>
                </div>
            </div>

            {success && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-3 border border-emerald-100 animate-in fade-in">
                    <LucideCheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">Contraseña actualizada exitosamente.</p>
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña Actual
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Nueva Contraseña
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                        placeholder="Mínimo 6 caracteres"
                    />
                </div>

                <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Nueva Contraseña
                    </label>
                    <input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                        placeholder="Repite la nueva contraseña"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || isPristine}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            isPristine 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm'
                        }`}
                    >
                        <LucideSave className="w-4 h-4" />
                        <span>{isLoading ? 'Guardando...' : 'Cambiar Contraseña'}</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
