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
    LucideBell
} from 'lucide-react'

export const Layout = ({ children, activeView, onViewChange }: { children: React.ReactNode, activeView: string, onViewChange: (view: string) => void }) => {
    const { currentUser, logout } = useStore()
    const isAdmin = currentUser?.role === 'admin'

    const navItems = [
        { name: 'Dashboard', icon: LucideLayoutDashboard, roles: ['admin', 'asesora'] },
        { name: 'Leads', icon: LucideUsers, roles: ['admin', 'asesora'] },
        { name: 'Citas', icon: LucideCalendar, roles: ['admin', 'asesora'] },
        { name: 'Pacientes', icon: LucideUserSquare, roles: ['admin', 'asesora'] },
        { name: 'Gestión', icon: LucideSettings, roles: ['admin'] },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
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
                                ? 'bg-clinical-50 text-clinical-700'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
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
                <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-4 md:hidden">
                        <LucideMenu className="w-6 h-6 text-gray-500" />
                        <span className="text-xl font-bold">Rangel CRM</span>
                    </div>

                    <div className="hidden md:block">
                        <h2 className="text-xl font-bold text-gray-800">
                            {activeView === 'Leads' ? 'Pipeline de Leads' :
                                activeView === 'Pacientes' ? 'Directorio de Pacientes' :
                                    activeView === 'Gestión' ? 'Gestión Clínica' : activeView}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
                            <LucideBell className="w-6 h-6" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center space-x-4 pl-6 border-l border-gray-100">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{currentUser?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
                            </div>
                            <img
                                src={currentUser?.avatar}
                                alt="Profile"
                                className="w-10 h-10 rounded-full ring-2 ring-clinical-100"
                            />
                        </div>
                    </div>
                </header>

                {/* Viewport */}
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
