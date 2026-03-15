import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { LucideMail, LucideShieldCheck, LucideChevronLeft, LucideCheckCircle2 } from 'lucide-react'

export const ForgotPassword = () => {
    // Si queremos mantener el flujo multitenant, ideal si se usa :slug/olvide-mi-contrasena
    const { slug } = useParams<{ slug?: string }>()
    
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess(false)
        setIsLoading(true)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                // redirectTo no lleva el dominio, Supabase usa el Site URL, nosotros le decimos la ruta local
                redirectTo: `${window.location.origin}${slug ? `/${slug}` : ''}/actualizar-contrasena`,
            })

            if (resetError) {
                setError(resetError.message)
            } else {
                setSuccess(true)
            }
        } catch (err: any) {
            setError(err.message || 'Error intesperado al enviar el correo')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-lg w-full p-10 relative animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-clinical-50 text-clinical-600 rounded-2xl flex items-center justify-center mb-6">
                        <LucideShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Acceso</h2>
                    <p className="text-gray-500">Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña.</p>
                </div>

                {success ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-4 animate-in fade-in">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <LucideCheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-emerald-800 font-bold mb-1">¡Enlace enviado!</h3>
                            <p className="text-sm text-emerald-700">Si el correo {email} está registrado, recibirás las instrucciones en breve. No olvides revisar tu carpeta de spam.</p>
                        </div>
                        <Link 
                            to={slug ? `/${slug}` : '/'}
                            className="inline-block mt-4 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                        >
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <LucideMail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none transition-all"
                                    placeholder="usuario@tuempresa.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-clinical-600 flex items-center justify-center space-x-2 text-white font-medium py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                        >
                            <span>{isLoading ? 'Enviando enlace...' : 'Enviar correo de recuperación'}</span>
                        </button>

                        <div className="text-center mt-6">
                            <Link 
                                to={slug ? `/${slug}` : '/'} 
                                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-clinical-600 transition-colors"
                            >
                                <LucideChevronLeft className="w-4 h-4 mr-1" />
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
