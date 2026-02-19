import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LucideShieldCheck, LucideMail, LucideLock, LucideArrowRight } from 'lucide-react'

export const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const login = useStore((state) => state.login)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Simulate hardcoded auth
        if (login(email)) {
            // Success
        } else {
            setError('Credenciales inválidas. Usa admin@clinica.com o asesora1@clinica.com')
        }
    }

    return (
        <div className="min-h-screen bg-clinical-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
                {/* Left Side - Branding */}
                <div className="bg-clinical-600 md:w-1/2 p-12 text-white flex flex-col justify-between">
                    <div>
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                            <LucideShieldCheck className="w-10 h-10" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Clínica Rangel</h1>
                        <p className="text-clinical-100 text-lg">
                            Sistema de Gestión de Leads y Pacientes de Alta Fidelidad.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-clinical-200 text-sm">
                            © 2026 Clínica Rangel. Todos los derechos reservados.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="md:w-1/2 p-12 bg-white">
                    <div className="max-w-sm mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido</h2>
                        <p className="text-gray-500 mb-8">Ingresa tus credenciales para continuar</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <div className="relative">
                                    <LucideMail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent transition-all outline-none"
                                        placeholder="nombre@clinica.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                                <div className="relative">
                                    <LucideLock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 group"
                            >
                                <span>Iniciar Sesión</span>
                                <LucideArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <p className="text-xs text-center text-gray-400">
                                Tip: admin@clinica.com o asesora1@clinica.com
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
