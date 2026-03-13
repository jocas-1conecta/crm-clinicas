import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../services/supabase'
import { LucideShieldCheck, LucideChevronRight, LucideCheckCircle2, LucideMail, LucideLock } from 'lucide-react'

export const Login = () => {
    // URL Slug for the specific SaaS Tenant (ex: /rangelpereira)
    const { slug } = useParams<{ slug?: string }>()


    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Custom Tenant Branding
    const [tenantReady, setTenantReady] = useState(!slug) // Si no hay slug pasamos directo a 1Clinic
    const [tenantTheme, setTenantTheme] = useState<{ primary_color: string, logo_url: string } | null>(null)
    const [tenantName, setTenantName] = useState<string | null>(null)

    useEffect(() => {
        const fetchTenantBrand = async () => {
            if (!slug) return;
            
            try {
                const { data, error } = await supabase
                    .from('clinicas')
                    .select('name, theme')
                    .eq('slug', slug)
                    .single()
                
                if (error) throw error;
                if (data) {
                    setTenantName(data.name)
                    if (data.theme) {
                        setTenantTheme(data.theme)
                    }
                }
            } catch (err: any) {
                console.error("Error cargando el branding de la clínica:", err)
            } finally {
                setTenantReady(true)
            }
        }
        
        fetchTenantBrand()
    }, [slug])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
                setIsLoading(false)
                return
            }

            // Fallback en caso de que App.tsx tarde en reaccionar al onAuthStateChange
            if (data.user) {
                // El useEffect de App.tsx se encargará de hacer el fetch del profile
                // y setear el currentUser real.
            }

        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión')
            setIsLoading(false)
        }
    }

    if (!tenantReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-clinical-200 border-t-clinical-600 rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row h-[600px]">

                {/* Left Side - Brand & Visuals */}
                <div 
                    className="md:w-1/2 p-12 text-white flex flex-col justify-between relative overflow-hidden" 
                    style={{ backgroundColor: tenantTheme?.primary_color || '#0d9488' }} // Fallback to clinical-600 logic
                >
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    </div>

                    <div className="relative z-10">
                        {tenantTheme?.logo_url ? (
                            <img src={tenantTheme.logo_url} alt={tenantName || 'Logo'} className="h-16 mb-8 object-contain" />
                        ) : (
                            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                                <LucideShieldCheck className="w-10 h-10" />
                            </div>
                        )}
                        <h1 className="text-4xl font-bold mb-6 tracking-tight">
                            {tenantName || '1Clinic SaaS'}
                        </h1>
                        <p className="text-white/80 text-lg leading-relaxed max-w-sm">
                            {slug && tenantName 
                                ? `Acceso a la plataforma administrativa de ${tenantName}` 
                                : 'El sistema inteligente de gestión multicéntrica para llevar tu red clínica al siguiente nivel.'}
                        </p>
                    </div>

                    <div className="relative z-10 hidden md:block">
                        <div className="flex items-center space-x-3 text-sm text-clinical-200">
                            <LucideCheckCircle2 className="w-5 h-5 text-clinical-300" />
                            <span>Control Total de Sucursales</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-clinical-200 mt-2">
                            <LucideCheckCircle2 className="w-5 h-5 text-clinical-300" />
                            <span>Seguimiento de Leads en Tiempo Real</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="md:w-1/2 bg-white relative">
                    <div className="h-full flex flex-col justify-center px-10 md:px-14 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="w-full max-w-sm mx-auto">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido</h2>
                            <p className="text-gray-500 mb-8">Inicia sesión con tu correo y contraseña.</p>

                            <form onSubmit={handleLogin} className="space-y-5">
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
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
                                            placeholder="asesor@clinicarangel.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                        Contraseña
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
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            className="h-4 w-4 text-clinical-600 focus:ring-clinical-500 border-gray-300 rounded cursor-pointer"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                            Recordarme
                                        </label>
                                    </div>
                                    <div className="text-sm">
                                        <a href="#" className="font-medium text-clinical-600 hover:text-clinical-500">
                                            ¿Olvidaste tu contraseña?
                                        </a>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ backgroundColor: tenantTheme?.primary_color || '#0d9488' }}
                                    className="w-full flex items-center justify-center space-x-2 text-white font-medium py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                                >
                                    <span>{isLoading ? 'Iniciando sesión...' : 'Ingresar'}</span>
                                    {!isLoading && <LucideChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </button>
                            </form>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
