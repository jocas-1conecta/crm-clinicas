import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { buildTenantUrl } from '../../utils/getTenantSlug'
import { supabase } from '../../services/supabase'
import { 
    LucideBuilding, 
    LucideUser, 
    LucideMapPin, 
    LucideChevronRight, 
    LucideChevronLeft,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideLoader2,
    LucideCheck,
    LucideMail,
    LucideLock
} from 'lucide-react'

// Types for our Wizard Form State
interface WizardState {
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    tenantName: string;
    tenantSlug: string;
    tenantIndustry: 'clinic' | 'generic';
    branchName: string;
    branchAddress: string;
}

export const OnboardingWizard = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    
    // Form State
    const [formData, setFormData] = useState<WizardState>({
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        tenantName: '',
        tenantSlug: '',
        tenantIndustry: 'generic',
        branchName: 'Matriz Principal',
        branchAddress: ''
    })

    // Debounce state for Slug checking
    const [isCheckingSlug, setIsCheckingSlug] = useState(false)
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('') // Clear general errors on type
        
        // Auto-generate slug from Tenant Name if user hasn't touched the slug input manually
        if (name === 'tenantName' && !formData.tenantSlug) {
            const autoSlug = value
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '') // Remove non-word chars
                .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphen
                .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
            
            setFormData(prev => ({ ...prev, tenantSlug: autoSlug }))
        }
    }

    // --- Slug Debounce Auto-Check ---
    useEffect(() => {
        const checkSlug = async () => {
            if (!formData.tenantSlug || formData.tenantSlug.length < 3) {
                setSlugAvailable(null)
                return
            }

            setIsCheckingSlug(true)
            try {
                const { data, error } = await supabase.rpc('is_slug_available', {
                    checked_slug: formData.tenantSlug
                })
                
                if (error) throw error
                setSlugAvailable(data)
            } catch (err) {
                console.error("Error checking slug:", err)
                setSlugAvailable(false) // Safe fallback assuming it's taken if query fails
            } finally {
                setIsCheckingSlug(false)
            }
        }

        const timeoutId = setTimeout(checkSlug, 600)
        return () => clearTimeout(timeoutId)
    }, [formData.tenantSlug])


    // --- Navigation & Validation ---
    const nextStep = () => {
        setError('')
        
        // Validate Step 1
        if (step === 1) {
            if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
                setError('Todos los campos son obligatorios.')
                return
            }
            if (formData.adminPassword.length < 6) {
                setError('La contraseña debe tener al menos 6 caracteres.')
                return
            }
        }

        // Validate Step 2
        if (step === 2) {
            if (!formData.tenantName || !formData.tenantSlug) {
                setError('El nombre y el slug de la empresa son obligatorios.')
                return
            }
            if (slugAvailable === false) {
                setError('El slug ya está en uso. Por favor, elige otro.')
                return
            }
            if (isCheckingSlug) return; // Prevent next if still verifying
        }

        setStep(s => s + 1)
    }

    const prevStep = () => {
        setError('')
        setStep(s => s - 1)
    }

    // --- Final Submission (RPC Transaction) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (!formData.branchName) {
            setError('El nombre de la sucursal es obligatorio.')
            return
        }

        setIsLoading(true)

        try {
            // 1. Crear el usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.adminEmail,
                password: formData.adminPassword,
                options: {
                    data: {
                        name: formData.adminName,
                        // El trigger nativo de supabase (si existe) creará el perfil base,
                        // o lo crearemos en el paso 2 con el RPC.
                    }
                }
            })

            if (authError) throw authError

            // Si el correo ya existía o hubo fallo
            if (!authData.user) {
                throw new Error("No se pudo crear el usuario. Verifica que el correo no esté ya registrado.")
            }

            // 2. Ejecutar la Transacción RPC para crear el Tenant, Sucursal y enlazar Perfil
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_new_tenant', {
                admin_user_id: authData.user.id,
                admin_name: formData.adminName,
                admin_email: formData.adminEmail,
                tenant_name: formData.tenantName,
                tenant_slug: formData.tenantSlug,
                tenant_industry: formData.tenantIndustry,
                branch_name: formData.branchName,
                branch_address: formData.branchAddress || ''
            })

            if (rpcError) throw rpcError

            // 3. Éxito Transaccional. Formar la URL del Workspace Privado.
            // Si rpcData es JSON y parsea correcto, forzamos login y salto
            
            // Refrescamos sesión automáticamente porque el role/tenant fueron asginados backdoor por el RPC
            await supabase.auth.refreshSession()
            
            // Redirect to the tenant's subdomain
            window.location.href = buildTenantUrl(formData.tenantSlug, `/login?email=${encodeURIComponent(formData.adminEmail)}`)

        } catch (err: any) {
            console.error("Onboarding Error:", err)
            // Error handling amigable
            if (err.message.includes('already registered')) {
                setError('Este correo electrónico ya está registrado en otra cuenta.')
            } else if (err.message.includes('unique_violation')) {
                 setError('Hubo colisión de datos. El slug de la empresa pudo haber sido tomado hace unos segundos.')
            } else {
                setError(err.message || 'Ocurrió un error crítico durante la creación del espacio de trabajo.')
            }
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-6">
                    <LucideBuilding className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Crea tu Workspace
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Configura tu empresa y comienza a escalar tus ventas en minutos.
                </p>
                
                {/* Visual Progress Steps */}
                <div className="flex justify-center mt-8 space-x-2">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className={`h-1.5 w-16 rounded-full transition-colors duration-300 ${step >= item ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white py-8 px-4 shadow-xl shadow-indigo-100/50 rounded-3xl sm:px-10 border border-gray-100 relative overflow-hidden">
                    
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-50 opacity-50 blur-3xl pointer-events-none"></div>

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start shadow-sm">
                            <LucideAlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* --- STEP 1: ADMIN PROFILE --- */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <LucideUser className="w-5 h-5 mr-2 text-indigo-500" />
                                    Tu Perfil de Administrador
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Serás el Super Administrador de este espacio de trabajo.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                    <input
                                        type="text" name="adminName" value={formData.adminName} onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Correo Electrónico Laboral</label>
                                    <div className="mt-1 relative rounded-xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LucideMail className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange}
                                            className="block w-full pl-10 border border-gray-300 rounded-xl py-2.5 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="juan@tuempresa.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contraseña Segura</label>
                                    <div className="mt-1 relative rounded-xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LucideLock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange}
                                            className="block w-full pl-10 border border-gray-300 rounded-xl py-2.5 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5 ml-1">Mínimo 6 caracteres.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2: TENANT DETAILS --- */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <LucideBuilding className="w-5 h-5 mr-2 text-indigo-500" />
                                    Datos de la Empresa
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Definiendo tu entorno y URL única.</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                                    <input
                                        type="text" name="tenantName" value={formData.tenantName} onChange={handleChange} autoFocus
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej. Clínica Dermatológica ABC"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">URL del Espacio de Trabajo (Slug)</label>
                                    <div className="mt-1 flex rounded-xl shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                            1clinic.app/
                                        </span>
                                        <input
                                            type="text" name="tenantSlug" value={formData.tenantSlug} onChange={handleChange}
                                            className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-r-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                                            placeholder="clinica-abc"
                                        />
                                    </div>
                                    {/* Slug Validations */}
                                    <div className="mt-2 text-xs flex items-center h-4">
                                        {isCheckingSlug && (
                                            <span className="text-gray-500 flex items-center"><LucideLoader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando disponibilidad...</span>
                                        )}
                                        {!isCheckingSlug && slugAvailable === true && formData.tenantSlug.length >= 3 && (
                                            <span className="text-emerald-600 flex items-center font-medium"><LucideCheck className="w-3 h-3 mr-1" /> ¡La URL está disponible!</span>
                                        )}
                                        {!isCheckingSlug && slugAvailable === false && formData.tenantSlug.length >= 3 && (
                                            <span className="text-red-500 flex items-center font-medium"><LucideAlertCircle className="w-3 h-3 mr-1" /> URL ya en uso por favor elige otra.</span>
                                        )}
                                        {formData.tenantSlug.length > 0 && formData.tenantSlug.length < 3 && (
                                            <span className="text-gray-500">Mínimo 3 caracteres. Sólo letras minúsculas y guiones.</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sector Industrial</label>
                                    <select
                                        name="tenantIndustry" value={formData.tenantIndustry} onChange={handleChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl shadow-sm bg-white"
                                    >
                                        <option value="generic">Empresa Genérica / Agencia (Solo CRM)</option>
                                        <option value="clinic">Salud / Clínica (CRM + Sala de Espera Viva)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1.5 ml-1">Esto habilitará módulos especializados en tu tablero inmediatamente.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 3: BRANCH CREATION --- */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <LucideMapPin className="w-5 h-5 mr-2 text-indigo-500" />
                                    Primera Sucursal (Matriz)
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">El CRM requiere al menos una ubicación física o virtual base de operaciones.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre de la Matriz/Sucursal</label>
                                    <input
                                        type="text" name="branchName" value={formData.branchName} onChange={handleChange} autoFocus
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej. Sede Central Norte"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dirección (Opcional)</label>
                                    <input
                                        type="text" name="branchAddress" value={formData.branchAddress} onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Ej. Av. Siempre Viva 123"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                            >
                                <LucideChevronLeft className="w-4 h-4 mr-1.5" /> Atrás
                            </button>
                        ) : (
                            <Link to="/login" className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 py-2">
                                Ya tengo una cuenta
                            </Link>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-xl shadow-md shadow-indigo-200 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all hover:-translate-y-0.5"
                            >
                                Continuar <LucideChevronRight className="w-4 h-4 ml-1.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-md shadow-emerald-200 text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-all disabled:opacity-70 disabled:transform-none hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <><LucideLoader2 className="w-4 h-4 mr-2 animate-spin" /> Fundando Workspace...</>
                                ) : (
                                    <><LucideCheckCircle2 className="w-4 h-4 mr-2" /> Completar y Entrar</>
                                )}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
