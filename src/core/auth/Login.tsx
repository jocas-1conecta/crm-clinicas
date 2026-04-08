import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../services/supabase'
import { LucideShieldCheck, LucideChevronRight, LucideCheckCircle2, LucideMail, LucideLock, LucideBuilding } from 'lucide-react'
import { getTenantSlug, buildTenantUrl, buildPlatformUrl } from '../../utils/getTenantSlug'
import { applyBrandColor } from '../../utils/applyBrandColor'
import { SlugRedirectPage } from './SlugRedirectPage'

export const Login = () => {
    // Detect tenant from subdomain instead of URL params
    const slug = getTenantSlug()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const initialEmail = searchParams.get('email') || ''

    const [email, setEmail] = useState(initialEmail)
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Fallback: If no slug in URL, it's the Global Gateway (Step 1)
    const isGlobalGateway = !slug

    // UI steps: 1 = Email, 2 = Password
    const [step, setStep] = useState<1 | 2>(!isGlobalGateway && initialEmail ? 2 : 1)

    // Custom Tenant Branding
    const [tenantReady, setTenantReady] = useState(isGlobalGateway) 
    const [tenantTheme, setTenantTheme] = useState<{ primary_color: string, logo_url: string } | null>(null)
    const [tenantName, setTenantName] = useState<string | null>(null)
    const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null)

    // Slug redirect state
    const [redirectNewSlug, setRedirectNewSlug] = useState<string | null>(null)

    useEffect(() => {
        const fetchTenantBrand = async () => {
            if (isGlobalGateway) {
                // Fetch platform-level branding for the global login
                try {
                    const { data } = await supabase
                        .from('platform_config')
                        .select('value')
                        .eq('key', 'branding')
                        .single()
                    if (data?.value) {
                        const b = data.value as Record<string, any>
                        setTenantName(b.app_name || '1Clinic')
                        setTenantLogoUrl(b.login_logo_url || b.logo_url || null)
                        if (b.primary_color) {
                            setTenantTheme({ primary_color: b.primary_color, logo_url: b.logo_url || '' })
                            applyBrandColor(b.primary_color)
                        }
                        // Apply favicon on login page too
                        if (b.favicon_url) {
                            const link = document.getElementById('app-favicon') as HTMLLinkElement
                            if (link) { link.type = 'image/png'; link.href = b.favicon_url }
                        }
                    }
                } catch (err) {
                    // Ignore — fallback to defaults
                }
                setTenantReady(true)
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('clinicas')
                    .select('name, theme, logo_url, login_logo_url')
                    .eq('slug', slug)
                    .single()
                
                if (error || !data) {
                    // Slug not found — check if it was renamed
                    const { data: redirect } = await supabase
                        .from('slug_redirects')
                        .select('new_slug')
                        .eq('old_slug', slug)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()

                    if (redirect?.new_slug) {
                        // Show animated redirect page
                        setRedirectNewSlug(redirect.new_slug)
                        return
                    }

                    // No redirect found — go to platform login
                    window.location.href = buildPlatformUrl('/login')
                    return;
                }
                
                setTenantName(data.name)
                setTenantLogoUrl(data.login_logo_url || data.logo_url || null)
                if (data.theme) {
                    setTenantTheme(data.theme)
                }
            } catch (err: any) {
                console.error("Error cargando el branding del entorno:", err)
                window.location.href = buildPlatformUrl('/login')
            } finally {
                setTenantReady(true)
            }
        }
        
        fetchTenantBrand()
    }, [slug, isGlobalGateway, navigate])

    // If we have a redirect, show the animated redirect page
    if (redirectNewSlug) {
        return <SlugRedirectPage newSlug={redirectNewSlug} />
    }

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        const plainEmail = email.trim().toLowerCase()
        if (!plainEmail) {
            setError('Por favor ingresa un correo electrónico.')
            return
        }

        setIsLoading(true)

        if (isGlobalGateway) {
            // Identifier-First: RPC to find Tenant
            try {
                const { data: foundSlug, error } = await supabase.rpc('get_tenant_slug_by_email', {
                    user_email: plainEmail
                })

                if (error) throw error;

                if (foundSlug) {
                    if (foundSlug === 'system') {
                         // Es el Platform Owner, lo enrutamos al login global inyectando el email
                         setStep(2);
                    } else {
                         // Redirect to tenant subdomain
                         window.location.href = buildTenantUrl(foundSlug, `/login?email=${encodeURIComponent(plainEmail)}`)
                    }
                } else {
                    setError('No encontramos ninguna cuenta corporativa asociada a este correo.')
                }
            } catch (err: any) {
                console.error("Ident Discovery Error:", err)
                setError('Error al descubrir tu espacio de trabajo. Intenta de nuevo.')
            } finally {
                setIsLoading(false)
            }
        } else {
            // Tenant Login Directo pero no pasaron ?email. 
            // Avanzan al paso 2 dentro del mismo Tenant de forma segura.
            setStep(2)
            setIsLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            })

            if (authError) {
                setError('Contraseña incorrecta o el usuario no existe en este servidor.')
                setIsLoading(false)
                return
            }

            // Auth listener en App.tsx procesa el inicio de sesión real instantáneamente.
            // Safety timeout: si el listener falla, reseteamos el botón para permitir reintento
            setTimeout(() => {
                setIsLoading(prev => {
                    if (prev) {
                        setError('La sesión no se pudo establecer. Intenta limpiar tu caché o contacta soporte.')
                    }
                    return false
                })
            }, 10000)
        } catch (err: any) {
            setError(err.message || 'Error grave de autenticación')
            setIsLoading(false)
        }
    }

    const goBackToEmail = () => {
        setPassword('')
        setError('')
        if (isGlobalGateway) {
            setStep(1)
        } else {
            // "Cambiar cuenta" — redirect to main platform gateway
            window.location.href = buildPlatformUrl('/login')
        }
    }

    if (!tenantReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    // --- Dynamic Theming Computations ---
    const primaryColor = tenantTheme?.primary_color || (isGlobalGateway ? '#0d9488' : '#0d9488')
    const displayLogo = tenantLogoUrl || null
    const displayName = tenantName || '1Clinic'
    const displaySubtitle = isGlobalGateway 
        ? 'Ingresa tu correo electrónico corporativo. Te enrutaremos de forma segura a tu espacio de trabajo.'
        : `Acceso protegido a la plataforma administrativa de ${tenantName}.`

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row h-[600px] relative">

                {/* Left Side - Dynamic Brand & Visuals */}
                <div 
                    className="md:w-1/2 p-12 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-700" 
                    style={{ backgroundColor: primaryColor }}
                >
                    {/* Soft background shape */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-black opacity-15 rounded-full blur-3xl -ml-20 -mb-20"></div>

                    <div className="relative z-10 animate-in fade-in duration-700">
                        {displayLogo ? (
                            <img src={displayLogo} alt={displayName} className="h-16 mb-8 object-contain drop-shadow-md" />
                        ) : (
                            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10 shadow-xl">
                                {isGlobalGateway ? <LucideBuilding className="w-8 h-8 text-white" /> : <LucideShieldCheck className="w-8 h-8 text-white" />}
                            </div>
                        )}
                        <p className="text-white/80 text-lg leading-relaxed max-w-sm font-light mt-2">
                            {displaySubtitle}
                        </p>
                    </div>

                    <div className="relative z-10 hidden md:block opacity-90 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                        <div className="flex items-center space-x-3 text-sm text-white border-l-2 border-emerald-400 pl-4 mb-4 bg-black/10 p-2.5 rounded-r-lg backdrop-blur-sm shadow-sm">
                            <LucideCheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>Autenticación Empresarial Ruteada</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-white border-l-2 border-emerald-400 pl-4 bg-black/10 p-2.5 rounded-r-lg backdrop-blur-sm shadow-sm">
                            <LucideCheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>Aislamiento Geográfico (Multi-Tenant)</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Discovery / Login Form */}
                <div className="md:w-1/2 bg-white relative">
                    <div className="h-full flex flex-col justify-center px-10 md:px-14">
                        <div className="w-full max-w-sm mx-auto relative overflow-hidden pb-4">
                            
                            {/* Step 1: Identifier Entry */}
                            {step === 1 && (
                                <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Iniciar Sesión</h2>
                                        <p className="text-gray-500 text-sm">Descubriremos tu espacio seguro de trabajo.</p>
                                    </div>

                                    {error && (
                                        <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-center shadow-sm">
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                                            Correo Electrónico Corporativo
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <LucideMail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                autoFocus
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white outline-none transition-all shadow-sm"
                                                placeholder="usuario@empresa.com"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        style={{ backgroundColor: primaryColor }}
                                        className="w-full flex items-center justify-center space-x-2 text-white font-medium py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                                    >
                                        <span>{isLoading ? 'Buscando Entorno...' : 'Siguiente'}</span>
                                        {!isLoading && <LucideChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </button>

                                    {/* Sign Up Link */}
                                    {isGlobalGateway && (
                                        <div className="mt-8 text-center text-sm text-gray-500">
                                            ¿No tienes un espacio de trabajo?{' '}
                                            <Link to="/registro" className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                                                Registra tu empresa
                                            </Link>
                                        </div>
                                    )}
                                </form>
                            )}

                            {/* Step 2: Password Entry */}
                            {step === 2 && (
                                <form onSubmit={handlePasswordSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenido</h2>
                                        <p className="text-gray-500 text-sm">Ingresa tu contraseña para acceder.</p>
                                    </div>

                                    {error && (
                                        <div className="p-3.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-center shadow-sm">
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* Identity Locked Pill */}
                                    <div className="p-1 px-1.5 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl flex items-center justify-between transition-colors shadow-sm mb-2">
                                        <div className="flex items-center space-x-3 px-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm text-indigo-500">
                                                <LucideMail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 truncate">{email}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={goBackToEmail}
                                            className="text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors shrink-0 m-1"
                                        >
                                            Cambiar
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                            <Link to="/olvide-mi-contrasena" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                                ¿Olvidaste tu contraseña?
                                            </Link>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <LucideLock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                autoFocus
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white outline-none transition-all shadow-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center mt-3 pl-1">
                                        <input
                                            id="remember-me"
                                            type="checkbox"
                                            className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                            Mantener sesión iniciada
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        style={{ backgroundColor: primaryColor }}
                                        className="w-full flex items-center justify-center space-x-2 text-white font-medium py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-6 group"
                                    >
                                        <span>{isLoading ? 'Conectando...' : 'Entrar al Workspace'}</span>
                                        {!isLoading && <LucideChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                </form>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
