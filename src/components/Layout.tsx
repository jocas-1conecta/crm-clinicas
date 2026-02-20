import React from 'react'
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
    LucideBell,
    LucideBuilding,
    LucideMapPin,
    LucideBriefcase,
    LucideActivity,
    LucideBarChart3
} from 'lucide-react'

export const Layout = ({ children, activeView, onViewChange }: { children: React.ReactNode, activeView: string, onViewChange: (view: string) => void }) => {
    const { currentUser, logout } = useStore()

    // Role Helper
    const roleLabel = {
        'Super_Admin': 'Super Admin',
        'Admin_Clinica': 'Director Clínica',
        'Asesor_Sucursal': 'Asesor Comercial'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const roleColor = {
        'Super_Admin': 'bg-purple-100 text-purple-700',
        'Admin_Clinica': 'bg-blue-100 text-blue-700',
        'Asesor_Sucursal': 'bg-green-100 text-green-700'
    }[currentUser?.role || 'Asesor_Sucursal'];

    const navItems = [
        // Shared
        { name: 'Dashboard', icon: LucideLayoutDashboard, roles: ['Super_Admin', 'Admin_Clinica'] }, // Restricted

        // Super Admin
        { name: 'Clinicas', icon: LucideBuilding, roles: ['Super_Admin'] },

        // Clinic Admin Specific
        { name: 'Mis Sucursales', icon: LucideMapPin, roles: ['Admin_Clinica'] },
        { name: 'Mi Equipo', icon: LucideUsers, roles: ['Admin_Clinica'] },
        { name: 'Catálogos', icon: LucideBriefcase, roles: ['Admin_Clinica'] },

        // Advisor Specific (renamed or specific)
        { name: 'Mi Dashboard', icon: LucideActivity, roles: ['Asesor_Sucursal'] },

        // Operating Roles (Admin & Asesor)
        { name: 'Leads', icon: LucideUsers, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
        { name: 'Citas', icon: LucideCalendar, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },
        { name: 'Pacientes', icon: LucideUserSquare, roles: ['Admin_Clinica', 'Asesor_Sucursal'] },

        // Analytics (ALL ROLES)
        { name: 'Reportes', icon: LucideBarChart3, roles: ['Super_Admin', 'Admin_Clinica', 'Asesor_Sucursal'] },

        { name: 'Gestión', icon: LucideSettings, roles: ['Admin_Clinica'] },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-20">
                <div className="p-6">
                    <div className="flex items-center space-x-3 text-clinical-600">
                        <div className="bg-clinical-100 p-2 rounded-lg">
                            <LucideShieldCheck className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight">Rangel CRM</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.filter(item => item.roles.includes(currentUser?.role || '')).map((item) => (
                        <button
                            key={item.name}
                            onClick={() => onViewChange(item.name)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeView === item.name
                                ? 'bg-clinical-50 text-clinical-700 font-medium shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${activeView === item.name ? 'text-clinical-600' : 'text-gray-400'}`} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
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
                        <span className="text-xl font-bold">Rangel CRM</span>
                    </div>

                    <div className="hidden md:block">
                        <h2 className="text-xl font-bold text-gray-800">
                            {activeView}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Clinic/Branch Info (Mock) */}
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                {
                                    currentUser?.role === 'Super_Admin' ? 'Vista Global' :
                                        currentUser?.role === 'Admin_Clinica' ? 'Clínica Principal' :
                                            'Sucursal Centro (S-001)'
                                }
                            </span>
                            {currentUser?.role === 'Admin_Clinica' && (
                                <div className="flex items-center space-x-1 text-gray-500">
                                    <LucideBuilding className="w-3 h-3" />
                                    <span className="text-xs">Sede Administrativa</span>
                                </div>
                            )}
                        </div>

                        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
                            <LucideBell className="w-6 h-6" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center space-x-4 pl-6 border-l border-gray-100">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 leading-none">{currentUser?.name}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>
                                    {roleLabel}
                                </span>
                            </div>
                            <img
                                src={currentUser?.avatarUrl}
                                alt="Profile"
                                className="w-10 h-10 rounded-full ring-2 ring-clinical-100 object-cover"
                            />
                        </div>
                    </div>
                </header>

                {/* Viewport */}
                <main className="flex-1 overflow-auto p-6 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    )
}
