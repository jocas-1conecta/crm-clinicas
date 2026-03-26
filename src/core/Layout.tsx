import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useStore } from '../store/useStore'
import { applyBrandColor } from '../utils/applyBrandColor'
import { LucideLayoutDashboard, LucideUserSquare, LucideCalendar, LucideSettings, LucideMapPin, LucideLogOut, LucideBriefcase, LucideStethoscope, LucideUsers, LucideBarChart3, LucideCheckSquare, LucideMessageSquare, LucideZap, LucideWaypoints, LucideBot, LucideActivity, LucideUsers2, LucideBuilding, LucideShieldCheck, LucideMenu } from 'lucide-react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, logout } = useStore()
    const location = useLocation()
    const queryClient = useQueryClient()

    // Fetch tenant branding (for clinic users)
    const { data: clinicTenant } = useQuery({
        queryKey: ['tenant_settings', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return null
            const { data } = await supabase
                .from('clinicas')
                .select('id, name, logo_url, logo_thumb_url, logo_display_mode, theme, favicon_url')
                .eq('id', currentUser.clinica_id)
                .single()
            return data
        },
        enabled: !!currentUser?.clinica_id,
        staleTime: 1000 * 60 * 10
    })

    // Fetch platform branding (for Platform Owner)
    const { data: platformConfig } = useQuery({
        queryKey: ['platform_config_branding'],
        queryFn: async () => {
            const { data } = await supabase
                .from('platform_config')
                .select('value')
                .eq('key', 'branding')
                .single()
            return data?.value as Record<string, any> | null
        },
        enabled: currentUser?.role === 'Platform_Owner',
        staleTime: 1000 * 60 * 10
    })

    // Merge: Platform Owner uses platform_config, others use clinicas
    const tenant = currentUser?.role === 'Platform_Owner' && platformConfig
        ? {
            id: 'platform',
            name: platformConfig.app_name || '1Clinic',
            logo_url: platformConfig.logo_url,
            logo_thumb_url: platformConfig.logo_url,
            logo_display_mode: 'logo_text',
            theme: { primary_color: platformConfig.primary_color || '#0d9488' },
            favicon_url: platformConfig.favicon_url
        }
        : clinicTenant

    // Apply brand color from tenant theme
    useEffect(() => {
        if (tenant?.theme?.primary_color) {
            applyBrandColor(tenant.theme.primary_color)
        }
    }, [tenant?.theme?.primary_color])

    // Apply dynamic favicon
    useEffect(() => {
        if (tenant?.favicon_url) {
            const link = document.getElementById('app-favicon') as HTMLLinkElement
            if (link) { link.type = 'image/png'; link.href = tenant.favicon_url }
        }
    }, [tenant?.favicon_url])

    // Apply clinic name as page title
    useEffect(() => {
        if (tenant?.name) {
            document.title = tenant.name
        }
    }, [tenant?.name])

    // Role Helper
    const roleLabel = {
        'Platform_Owner': 'SaaS Founder',
        'Super_Admin': 'Director General',
        'Admin_Clinica': 'Gerente de Sucursal',
        'Asesor_Sucursal': 'Asesor Comercial'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const roleColor = {
        'Platform_Owner': 'bg-black text-yellow-400',
        'Super_Admin': 'bg-purple-100 text-purple-700',
        'Admin_Clinica': 'bg-blue-100 text-blue-700',
        'Asesor_Sucursal': 'bg-green-100 text-green-700'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const hasModule = (mod: string) => currentUser?.active_modules?.includes(mod);

    // Grouped navigation sections
    const navSections: { label: string | null, items: { name: string, path: string, icon: any, roles: string[] }[] }[] = [
        {
            label: null, // No label for top section
            items: [
                { name: 'Dashboard', path: '/dashboard', icon: LucideLayoutDashboard, roles: ['Platform_Owner', 'Super_Admin', 'Admin_Clinica'] },
                { name: 'Clinicas', path: '/clinicas', icon: LucideBuilding, roles: ['Platform_Owner'] },
                { name: 'Mi Dashboard', path: '/mi-dashboard', icon: LucideActivity, roles: ['Asesor_Sucursal'] },
            ]
        },
        {
            label: 'CRM',
            items: [
                { name: 'Leads', path: '/leads', icon: LucideUsers, roles: ['Admin_Clinica', 'Super_Admin', 'Asesor_Sucursal'] },
                { name: 'Tareas', path: '/tareas', icon: LucideCheckSquare, roles: ['Admin_Clinica', 'Super_Admin', 'Asesor_Sucursal'] },
                ...(hasModule('chat_whatsapp') ? [
                    { name: 'Chat', path: '/chat', icon: LucideMessageSquare, roles: ['Admin_Clinica', 'Super_Admin', 'Asesor_Sucursal'] },
                ] : []),
                ...(hasModule('automations') ? [
                    { name: 'Automatizaciones', path: '/automatizaciones', icon: LucideZap, roles: ['Super_Admin'] },
                ] : []),
                { name: 'Chatbot AI', path: '/chatbot', icon: LucideBot, roles: ['Super_Admin'] },
            ]
        },
        {
            label: 'Clínica',
            items: [
                ...(hasModule('clinic_core') ? [
                    { name: 'Citas', path: '/citas', icon: LucideCalendar, roles: ['Admin_Clinica', 'Super_Admin', 'Asesor_Sucursal'] },
                    { name: 'Pacientes', path: '/pacientes', icon: LucideUserSquare, roles: ['Admin_Clinica', 'Super_Admin', 'Asesor_Sucursal'] },
                ] : []),
                { name: 'Equipo', path: '/equipo', icon: LucideUsers2, roles: ['Super_Admin'] },
                { name: 'Servicios', path: '/servicios', icon: LucideBriefcase, roles: ['Super_Admin'] },
                { name: 'Recursos Clínicos', path: '/gestion', icon: LucideWaypoints, roles: ['Super_Admin'] },
            ]
        },
        {
            label: 'Organización',
            items: [
                { name: 'Mis Sucursales', path: '/mis-sucursales', icon: LucideMapPin, roles: ['Super_Admin'] },
                ...(hasModule('analytics') ? [
                    { name: 'Reportes', path: '/reportes', icon: LucideBarChart3, roles: ['Super_Admin', 'Admin_Clinica', 'Asesor_Sucursal'] },
                ] : []),
            ]
        },
        {
            label: 'Sistema',
            items: [
                { name: 'Configuración', path: '/configuracion/perfil', icon: LucideSettings, roles: ['Platform_Owner', 'Super_Admin', 'Admin_Clinica', 'Asesor_Sucursal'] },
            ]
        },
    ]

    // Flatten for active item detection
    const allNavItems = navSections.flatMap(s => s.items)
    const activeItem = allNavItems.find(item => item.path === location.pathname)
    const activeViewName = location.pathname.includes('/configuracion') 
        ? 'Configuración' 
        : (activeItem ? activeItem.name : '1Clinic')

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-52 bg-white border-r border-gray-200 hidden md:flex flex-col z-20">
                <div className="p-4">
                    <div className={`flex items-center ${tenant?.logo_display_mode === 'logo_only' ? 'justify-center' : 'space-x-3'} text-clinical-600`}>
                        {tenant?.logo_display_mode !== 'text_only' && (
                            tenant?.logo_thumb_url || tenant?.logo_url ? (
                                <img 
                                    src={tenant?.logo_display_mode === 'logo_only' ? (tenant.logo_url || tenant.logo_thumb_url) : (tenant.logo_thumb_url || tenant.logo_url)} 
                                    alt="Logo" 
                                    className={`object-contain ${tenant?.logo_display_mode === 'logo_only' ? 'max-h-10 w-auto' : 'w-8 h-8 rounded-lg'}`} 
                                />
                            ) : (
                                <div className="bg-clinical-100 p-2 rounded-lg">
                                    <LucideShieldCheck className="w-8 h-8" />
                                </div>
                            )
                        )}
                        {tenant?.logo_display_mode !== 'logo_only' && (
                            <span className="text-base font-bold text-gray-900 tracking-tight">{tenant?.name || '1Clinic'}</span>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 mt-2 overflow-y-auto">
                    {navSections.map((section, sIdx) => {
                        const visibleItems = section.items.filter(item => item.roles.includes(currentUser?.role || ''))
                        if (visibleItems.length === 0) return null
                        return (
                            <div key={sIdx} className={sIdx > 0 ? 'mt-4' : ''}>
                                {section.label && (
                                    <p className="px-4 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.label}</p>
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map((item) => {
                                        const isActive = item.name === 'Configuración' 
                                            ? location.pathname.includes('/configuracion') 
                                            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isActive
                                                    ? 'bg-clinical-50 text-clinical-700 font-medium shadow-sm'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                                    }`}
                                            >
                                                <item.icon className={`w-5 h-5 ${isActive ? 'text-clinical-600' : 'text-gray-400'}`} />
                                                <span>{item.name}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                         onClick={async () => {
                            queryClient.clear();
                            await logout();
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
                    >
                        <LucideLogOut className="w-5 h-5" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Topbar */}
                <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center space-x-4 md:hidden">
                        <LucideMenu className="w-6 h-6 text-gray-500" />
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="w-8 h-8 rounded object-contain" />
                        ) : (
                            <span className="text-xl font-bold">1Clinic</span>
                        )}
                    </div>

                    <div className="hidden md:block">
                        <h2 className="text-xl font-bold text-gray-800">
                            {activeViewName}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                {
                                    currentUser?.role === 'Platform_Owner' ? 'Plataforma Global' :
                                    currentUser?.role === 'Super_Admin' ? 'Vista Director General' :
                                        currentUser?.role === 'Admin_Clinica' ? 'Vista de Sucursal' :
                                            'Vista de Asesor'
                                }
                            </span>
                            {(currentUser?.role === 'Admin_Clinica' || currentUser?.role === 'Super_Admin') && (
                                <div className="flex items-center space-x-1 text-gray-500">
                                    <LucideBuilding className="w-3 h-3" />
                                    <span className="text-xs">Sede Administrativa</span>
                                </div>
                            )}
                        </div>


                        <Link to="/configuracion/perfil" className="flex items-center space-x-4 pl-6 border-l border-gray-100 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-clinical-600 transition-colors">{currentUser?.name}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>
                                    {roleLabel}
                                </span>
                            </div>
                            <img
                                src={currentUser?.avatarThumbUrl || currentUser?.avatarUrl}
                                alt="Profile"
                                className="w-10 h-10 rounded-full ring-2 ring-clinical-100 object-cover group-hover:ring-clinical-200 transition-all"
                            />
                        </Link>
                    </div>
                </header>

                {/* Viewport */}
                <main className={`flex-1 overflow-auto bg-gray-50 ${location.pathname.includes('/configuracion') ? 'p-0' : 'p-6'}`}>
                    {children}
                </main>
            </div>
        </div>
    )
}
