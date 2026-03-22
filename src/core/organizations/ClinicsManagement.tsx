import React, { useState, useEffect } from 'react'
import { 
    LucideSearch, LucideCheckCircle, LucidePauseCircle, LucidePlus, LucideX,
    LucideBuilding, LucideLoader2, LucideCheck, LucideAlertCircle,
    LucideSave, LucideToggleLeft, LucideToggleRight, LucideChevronRight,
    LucideMapPin, LucideMail, LucideGlobe, LucidePackage
} from 'lucide-react'
import { useStore, Clinic } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

// ─── Available Modules ────────────────────────────────────────
const AVAILABLE_MODULES = [
    { id: 'crm_core', name: 'CRM Core', description: 'Leads, Pipeline, Tareas, Dashboard', icon: '🎯', locked: true },
    { id: 'clinic_core', name: 'Sala de Espera Viva', description: 'Citas, pacientes e historial clínico', icon: '🏥', locked: false },
    { id: 'chat_whatsapp', name: 'Chat & WhatsApp', description: 'Mensajería, plantillas y notificaciones', icon: '💬', locked: false },
    { id: 'automations', name: 'Automatizaciones', description: 'Secuencias automáticas de tareas', icon: '⚡', locked: false },
    { id: 'analytics', name: 'Analíticas Avanzadas', description: 'Reportes y métricas de rendimiento', icon: '📊', locked: false },
]

// ─── Create Clinic Modal ──────────────────────────────────────
const CreateClinicModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [email, setEmail] = useState('')
    const [plan, setPlan] = useState<'Free' | 'Pro' | 'Enterprise'>('Free')
    const [industry, setIndustry] = useState<'clinic' | 'generic'>('generic')
    const [error, setError] = useState('')

    // Slug availability check
    const [isCheckingSlug, setIsCheckingSlug] = useState(false)
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

    // Auto-generate slug from name
    const handleNameChange = (value: string) => {
        setName(value)
        const autoSlug = value.toLowerCase().trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        setSlug(autoSlug)
    }

    // Debounced slug check
    useEffect(() => {
        if (!slug || slug.length < 3) { setSlugAvailable(null); return }
        setIsCheckingSlug(true)
        const t = setTimeout(async () => {
            try {
                const { data, error } = await supabase.rpc('is_slug_available', { checked_slug: slug })
                if (error) throw error
                setSlugAvailable(data)
            } catch { setSlugAvailable(false) }
            finally { setIsCheckingSlug(false) }
        }, 500)
        return () => clearTimeout(t)
    }, [slug])

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!name.trim() || !slug.trim()) throw new Error('Nombre y slug son obligatorios')
            if (slugAvailable === false) throw new Error('El slug ya está en uso')

            const activeModules = industry === 'clinic' ? ['clinic_core'] : []

            // 1. Create the clinic
            const { data: clinic, error: clinicError } = await supabase
                .from('clinicas')
                .insert({ 
                    name: name.trim(), 
                    slug: slug.trim(), 
                    email_contacto: email.trim() || null,
                    plan,
                    status: 'activa',
                    active_modules: activeModules
                })
                .select()
                .single()
            
            if (clinicError) throw clinicError

            // 2. Auto-create first branch "Matriz Principal"
            const { error: branchError } = await supabase
                .from('sucursales')
                .insert({ clinica_id: clinic.id, name: 'Matriz Principal', address: '' })
            
            if (branchError) throw branchError

            return clinic
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicas'] })
            onClose()
            setName(''); setSlug(''); setEmail(''); setPlan('Free'); setIndustry('generic'); setError('')
        },
        onError: (err: any) => setError(err.message || 'Error al crear la clínica')
    })

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-yellow-50 p-2 rounded-xl"><LucideBuilding className="w-5 h-5 text-yellow-600" /></div>
                        <h3 className="text-xl font-bold text-gray-900">Crear Nueva Clínica</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><LucideX className="w-5 h-5" /></button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl flex items-center space-x-2 text-sm">
                        <LucideAlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Clínica</label>
                        <input type="text" value={name} onChange={e => handleNameChange(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-sm"
                            placeholder="Ej. Clínica Dental Sonrisa" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                        <div className="flex rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-yellow-500 overflow-hidden">
                            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">1clinic.app/</span>
                            <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="flex-1 px-3 py-2.5 outline-none text-sm" placeholder="clinica-dental" />
                        </div>
                        <div className="mt-1 text-xs flex items-center h-4">
                            {isCheckingSlug && <span className="text-gray-500 flex items-center"><LucideLoader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...</span>}
                            {!isCheckingSlug && slugAvailable === true && slug.length >= 3 && <span className="text-emerald-600 flex items-center font-medium"><LucideCheck className="w-3 h-3 mr-1" /> Disponible</span>}
                            {!isCheckingSlug && slugAvailable === false && slug.length >= 3 && <span className="text-red-500 flex items-center font-medium"><LucideAlertCircle className="w-3 h-3 mr-1" /> Ya en uso</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-sm"
                            placeholder="contacto@clinica.com (opcional)" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                            <select value={plan} onChange={e => setPlan(e.target.value as any)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm bg-white">
                                <option value="Free">Free</option>
                                <option value="Pro">Pro ($99/mo)</option>
                                <option value="Enterprise">Enterprise ($299/mo)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                            <select value={industry} onChange={e => setIndustry(e.target.value as any)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm bg-white">
                                <option value="generic">Empresa Genérica</option>
                                <option value="clinic">Salud / Clínica</option>
                            </select>
                        </div>
                    </div>

                    {industry === 'clinic' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-center space-x-2">
                            <span>🏥</span><span>Se activará automáticamente el módulo <strong>Sala de Espera Viva</strong> (citas, pacientes).</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 font-medium text-sm hover:bg-gray-50 rounded-xl">Cancelar</button>
                    <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name.trim() || !slug.trim() || slugAvailable === false}
                        className="px-5 py-2.5 bg-yellow-500 text-white font-bold text-sm rounded-xl shadow-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                        {createMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucidePlus className="w-4 h-4" />}
                        <span>{createMutation.isPending ? 'Creando...' : 'Crear Clínica'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Edit Clinic Drawer ───────────────────────────────────────
const EditClinicDrawer = ({ clinic, open, onClose }: { clinic: any; open: boolean; onClose: () => void }) => {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [modules, setModules] = useState<string[]>([])
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        if (clinic) {
            setName(clinic.name || '')
            setEmail(clinic.email_contacto || '')
            setModules(clinic.active_modules || [])
            setSuccessMsg('')
        }
    }, [clinic])

    const toggleModule = (moduleId: string) => {
        setModules(prev => prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId])
    }

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!clinic?.id) throw new Error('No clinic')
            const { error } = await supabase
                .from('clinicas')
                .update({ name, email_contacto: email || null, active_modules: modules })
                .eq('id', clinic.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicas'] })
            setSuccessMsg('Cambios guardados')
            setTimeout(() => setSuccessMsg(''), 3000)
        }
    })

    const isPristine = name === (clinic?.name || '') &&
        email === (clinic?.email_contacto || '') &&
        JSON.stringify([...modules].sort()) === JSON.stringify([...(clinic?.active_modules || [])].sort())

    if (!open || !clinic) return null

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Editar Clínica</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{clinic.slug}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg">
                        <LucideX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center space-x-2 text-sm border border-emerald-100 animate-in fade-in">
                            <LucideCheckCircle className="w-4 h-4" /><span className="font-medium">{successMsg}</span>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-2">
                            <LucideBuilding className="w-3.5 h-3.5" /><span>Información General</span>
                        </h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-sm"
                                placeholder="contacto@clinica.com" />
                        </div>
                    </div>

                    {/* Modules */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-2">
                            <LucidePackage className="w-3.5 h-3.5" /><span>Módulos</span>
                        </h4>
                        {AVAILABLE_MODULES.map(mod => {
                            const isActive = mod.locked || modules.includes(mod.id)
                            return (
                                <button key={mod.id} 
                                    onClick={() => !mod.locked && toggleModule(mod.id)}
                                    disabled={mod.locked}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                        mod.locked 
                                            ? 'border-gray-200 bg-gray-50 cursor-default'
                                            : isActive 
                                                ? 'border-emerald-300 bg-emerald-50 cursor-pointer' 
                                                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 cursor-pointer'
                                    }`}>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">{mod.icon}</span>
                                        <div className="text-left">
                                            <span className={`text-sm font-bold ${
                                                mod.locked ? 'text-gray-600' : isActive ? 'text-emerald-700' : 'text-gray-700'
                                            }`}>{mod.name}</span>
                                            <p className="text-xs text-gray-500">{mod.description}</p>
                                        </div>
                                    </div>
                                    {mod.locked 
                                        ? <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded-md">SIEMPRE ACTIVO</span>
                                        : isActive 
                                            ? <LucideToggleRight className="w-6 h-6 text-emerald-500" />
                                            : <LucideToggleLeft className="w-6 h-6 text-gray-300" />
                                    }
                                </button>
                            )
                        })}
                    </div>

                    {/* Read-only Info */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Información del Sistema</h4>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tenant ID</span>
                                <span className="font-mono text-xs text-gray-400">{clinic.id?.slice(0, 18)}...</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Slug</span>
                                <span className="font-medium text-gray-700">{clinic.slug}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Creada</span>
                                <span className="text-gray-700">{new Date(clinic.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Estado</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    clinic.status === 'activa' ? 'bg-emerald-100 text-emerald-700' :
                                    clinic.status === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{clinic.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 shrink-0">
                    <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || isPristine}
                        className={`w-full flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                            isPristine 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
                        }`}>
                        {updateMutation.isPending ? <LucideLoader2 className="w-4 h-4 animate-spin" /> : <LucideSave className="w-4 h-4" />}
                        <span>{updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────
export const ClinicsManagement = () => {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedClinic, setSelectedClinic] = useState<any>(null)

    const { data: clinics = [], isLoading } = useQuery({
        queryKey: ['clinicas'],
        queryFn: async () => {
            const { data, error } = await supabase.from('clinicas').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase.from('clinicas').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinicas'] })
    })

    const filteredClinics = clinics.filter((c: any) =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_contacto?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Stats
    const activeClinics = clinics.filter((c: any) => c.status === 'activa').length
    const pendingClinics = clinics.filter((c: any) => c.status === 'pendiente').length

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'activa': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Activa</span>
            case 'pendiente': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">Pendiente</span>
            case 'suspendida': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">Suspendida</span>
        }
    }

    const getPlanBadge = (plan: string) => {
        const colors: Record<string, string> = {
            'Free': 'bg-gray-100 text-gray-600',
            'Pro': 'bg-blue-50 text-blue-600 border border-blue-100',
            'Enterprise': 'bg-purple-50 text-purple-600 border border-purple-100'
        }
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${colors[plan] || colors.Free}`}>{plan}</span>
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Clínicas</h1>
                    <p className="text-gray-500">Administra las suscripciones, módulos y accesos de tus clientes.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm font-bold text-sm">
                    <LucidePlus className="w-5 h-5" /><span>Nueva Clínica</span>
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-3">
                    <div className="bg-gray-100 p-2 rounded-lg"><LucideBuilding className="w-5 h-5 text-gray-600" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{clinics.length}</p><p className="text-xs text-gray-500">Total</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-3">
                    <div className="bg-emerald-50 p-2 rounded-lg"><LucideCheckCircle className="w-5 h-5 text-emerald-600" /></div>
                    <div><p className="text-2xl font-bold text-emerald-600">{activeClinics}</p><p className="text-xs text-gray-500">Activas</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-3">
                    <div className="bg-amber-50 p-2 rounded-lg"><LucideLoader2 className="w-5 h-5 text-amber-600" /></div>
                    <div><p className="text-2xl font-bold text-amber-600">{pendingClinics}</p><p className="text-xs text-gray-500">Pendientes</p></div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, slug o email..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm" />
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-16 text-center">
                        <div className="w-8 h-8 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-3">Cargando clínicas...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-500 font-bold tracking-wider">
                                    <th className="p-5">Clínica</th>
                                    <th className="p-5">Plan</th>
                                    <th className="p-5">Módulos</th>
                                    <th className="p-5">Estado</th>
                                    <th className="p-5">Creada</th>
                                    <th className="p-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredClinics.map((clinic: any) => (
                                    <tr key={clinic.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedClinic(clinic)}>
                                        <td className="p-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {clinic.logo_url 
                                                        ? <img src={clinic.logo_url} alt="" className="w-full h-full object-contain p-1" />
                                                        : <LucideBuilding className="w-5 h-5 text-gray-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-yellow-600 transition-colors">{clinic.name}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{clinic.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">{getPlanBadge(clinic.plan)}</td>
                                        <td className="p-5">
                                            <div className="flex flex-wrap gap-1">
                                                {(clinic.active_modules || []).length > 0 
                                                    ? (clinic.active_modules as string[]).map((m: string) => (
                                                        <span key={m} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                                            {m === 'clinic_core' ? '🏥 Clínico' : m}
                                                        </span>
                                                    ))
                                                    : <span className="text-xs text-gray-400">Solo CRM</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="p-5">{getStatusBadge(clinic.status)}</td>
                                        <td className="p-5 text-sm text-gray-500">
                                            {new Date(clinic.created_at || new Date()).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center justify-end space-x-1" onClick={e => e.stopPropagation()}>
                                                {clinic.status === 'pendiente' && (
                                                    <button onClick={() => updateStatusMutation.mutate({ id: clinic.id, status: 'activa' })}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprobar">
                                                        <LucideCheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {clinic.status === 'activa' && (
                                                    <button onClick={() => updateStatusMutation.mutate({ id: clinic.id, status: 'suspendida' })}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Suspender">
                                                        <LucidePauseCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {clinic.status === 'suspendida' && (
                                                    <button onClick={() => updateStatusMutation.mutate({ id: clinic.id, status: 'activa' })}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reactivar">
                                                        <LucideCheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => setSelectedClinic(clinic)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                                                    <LucideChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClinics.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-16 text-center">
                                            <LucideBuilding className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No se encontraron clínicas.</p>
                                            <p className="text-gray-400 text-sm mt-1">Crea una nueva o ajusta tu búsqueda.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateClinicModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
            <EditClinicDrawer clinic={selectedClinic} open={!!selectedClinic} onClose={() => setSelectedClinic(null)} />
        </div>
    )
}
