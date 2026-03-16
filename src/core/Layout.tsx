import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store/useStore'
import {
    LucideLayoutDashboard,
    LucideUsers,
    LucideCalendar,
    LucideUserSquare,
    LucideSettings,
    LucideLogOut,
    LucideShieldCheck,
    LucideMenu,
    LucideBuilding,
    LucideMapPin,
    LucideBriefcase,
    LucideActivity,
    LucideBarChart3,
    LucideCheckSquare,
    LucideWaypoints
} from 'lucide-react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, logout } = useStore()
    const location = useLocation()
    const queryClient = useQueryClient()

    // Role Helper
    const roleLabel = {
        'Platform_Owner': 'SaaS Founder',
        'Super_Admin': 'Super Admin',
        'Admin_Clinica': 'Director Clínica',
        'Asesor_Sucursal': 'Asesor Comercial'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const roleColor = {
        'Platform_Owner': 'bg-black text-yellow-400',
        'Super_Admin': 'bg-purple-100 text-purple-700',
        'Admin_Clinica': 'bg-blue-100 text-blue-700',
        'Asesor_Sucursal': 'bg-green-100 text-green-700'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const slugPrefix = currentUser?.clinica_slug ? `/${currentUser.clinica_slug}` : '';
    const hasClinicModule = currentUser?.active_modules?.includes('clinic_core');

    const navItems = [
        // Shared
        { name: 'Dashboard', path: `${slugPrefix}/dashboard`, icon: LucideLayoutDashboard, roles: ['Platform_Owner', 'Super_Admin', 'Admin_Clinica'] },

        // Platform Owner
        { name: 'Clinicas', path: `/clinicas`, icon: LucideBuilding, roles: ['Platform_Owner'] },

        // Clinic Admin Specific
        { name: 'Mis Sucursales', path: `${slugPrefix}/mis-sucursales`, icon: LucideMapPin, roles: ['Admin_Clinica'] },
        { name: 'Catálogos', path: `${slugPrefix}/catalogos`, icon: LucideBriefcase, roles: ['Admin_Clinica'] },
        { name: 'Embudos', path: `${slugPrefix}/embudos`, icon: LucideWaypoints, roles: ['Admin_Clinica'] },

        // Advisor Specific
        { name: 'Mi Dashboard', path: `${slugPrefix}/mi-dashboard`, icon: LucideActivity, roles: ['Asesor_Sucursal'] },

        // Operating Roles (Admin & Asesor)
        { name: 'Leads', path: `${slugPrefix}/leads`, icon: LucideUsers, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
        { name: 'Tareas', path: `${slugPrefix}/tareas`, icon: LucideCheckSquare, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
        ...(hasClinicModule ? [
            { name: 'Citas', path: `${slugPrefix}/citas`, icon: LucideCalendar, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
            { name: 'Pacientes', path: `${slugPrefix}/pacientes`, icon: LucideUserSquare, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
        ] : []),

        // Analytics (ALL ROLES)
        { name: 'Reportes', path: `${slugPrefix}/reportes`, icon: LucideBarChart3, roles: ['Platform_Owner', 'Super_Admin', 'Admin_Clinica', 'Asesor_Sucursal'] },
        { name: 'Configuración', path: `${slugPrefix}/configuracion/perfil`, icon: LucideSettings, roles: ['Platform_Owner', 'Super_Admin', 'Admin_Clinica', 'Asesor_Sucursal'] },

        { name: 'Gestión', path: `${slugPrefix}/gestion`, icon: LucideWaypoints, roles: ['Platform_Owner', 'Admin_Clinica'] },
    ]

    const activeItem = navItems.find(item => item.path === location.pathname)
    const activeViewName = location.pathname.includes('/configuracion') 
        ? 'Configuración' 
        : (activeItem ? activeItem.name : '1Clinic')

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-20">
                <div className="p-6">
                    <div className="flex items-center space-x-3 text-clinical-600">
                        <div className="bg-clinical-100 p-2 rounded-lg">
                            <LucideShieldCheck className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight">1Clinic</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.filter(item => item.roles.includes(currentUser?.role || '')).map((item) => {
                        // Mark active if pathname starts with the config base path for Settings
                        const isActive = item.name === 'Configuración' 
                            ? location.pathname.includes('/configuracion') 
                            : location.pathname === item.path;
                            
                        return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-clinical-50 text-clinical-700 font-medium shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-clinical-600' : 'text-gray-400'}`} />
                            <span>{item.name}</span>
                        </Link>
                    )})}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={async () => {
                            const slug = currentUser?.clinica_slug;
                            queryClient.clear();
                            await logout();
                            if (slug) {
                                window.location.href = `/${slug}`;
                            } else {
                                window.location.href = '/';
                            }
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
                        <span className="text-xl font-bold">1Clinic</span>
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
                                    currentUser?.role === 'Super_Admin' ? 'Vista Consolidada Tenant' :
                                        currentUser?.role === 'Admin_Clinica' ? 'Vista Administrativa' :
                                            'Vista de Sucursal'
                                }
                            </span>
                            {(currentUser?.role === 'Admin_Clinica' || currentUser?.role === 'Super_Admin') && (
                                <div className="flex items-center space-x-1 text-gray-500">
                                    <LucideBuilding className="w-3 h-3" />
                                    <span className="text-xs">Sede Administrativa</span>
                                </div>
                            )}
                        </div>


                        <Link to={`${slugPrefix}/configuracion/perfil`} className="flex items-center space-x-4 pl-6 border-l border-gray-100 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-clinical-600 transition-colors">{currentUser?.name}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>
                                    {roleLabel}
                                </span>
                            </div>
                            <img
                                src={currentUser?.avatarUrl}
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
