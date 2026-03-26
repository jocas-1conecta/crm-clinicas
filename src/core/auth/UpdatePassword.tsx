import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { LucideLock, LucideShieldCheck, LucideCheckCircle2 } from 'lucide-react'

export const UpdatePassword = ({ onComplete }: { onComplete?: () => void }) => {
    // Supabase inyectará un token hash en la URL (#access_token=...) cuando el usuario toque el email
    // Usamos el hook de auth para interceptar esta sesión de reinicio temporal
    const navigate = useNavigate()
    const { slug } = useParams<{ slug?: string }>()
    
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // En un flujo puro de PKCE/Hash token, Supabase levanta la sesión automáticamente si el token en la URL es válido.
        // Verificamos si realmente estamos bajo una sesión temporal válida para cambio de clave.
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
                // Si el usuario simplemente navega manual a /actualizar-contrasena sin token, lo botamos
                setError("El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.")
            }
        }
        checkSession()
    }, [])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.")
            return
        }
        
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.")
            return
        }

        setIsLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                setError(updateError.message)
            } else {
                setSuccess(true)
                // Redirigir al dashboard/inicio después de un par de segundos
                setTimeout(() => {
                    if (onComplete) {
                        onComplete()
                    } else {
                        navigate(slug ? `/${slug}` : '/')
                    }
                }, 2500)
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado al actualizar credenciales')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-lg w-full p-10 relative animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                        <LucideShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Nueva Contraseña</h2>
                    <p className="text-gray-500">Ingresa una nueva contraseña segura para recuperar el acceso a tu cuenta.</p>
                </div>

                {success ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-4 animate-in fade-in">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <LucideCheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-emerald-800 font-bold mb-1">¡Contraseña actualizada!</h3>
                            <p className="text-sm text-emerald-700">Tu cuenta ahora está protegida. Te estamos redirigiendo de vuelta...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <LucideLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <LucideLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Repetir contraseña"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || error === "El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo."}
                            className="w-full bg-clinical-600 flex items-center justify-center space-x-2 text-white font-medium py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                        >
                            <span>{isLoading ? 'Actualizando...' : 'Guardar y Entrar'}</span>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
