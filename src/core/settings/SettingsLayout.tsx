import React from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { 
    LucideUser, 
    LucideShieldCheck, 
    LucideBuilding, 
    LucideUsers,
    LucidePlugZap,
    LucideMessageSquare
} from 'lucide-react'

export const SettingsLayout: React.FC = () => {
    const { currentUser } = useStore()
    const { slug } = useParams<{ slug?: string }>()
    const prefix = slug ? `/${slug}` : ''

    if (!currentUser) return null

    // Menú base para todos los usuarios
    const menuItems = [
        {
            title: 'Mi Perfil',
            path: `${prefix}/configuracion/perfil`,
            icon: LucideUser,
            description: 'Información personal y preferencias'
        },
        {
            title: 'Seguridad',
            path: `${prefix}/configuracion/seguridad`,
            icon: LucideShieldCheck,
            description: 'Contraseñas y métodos de acceso'
        }
    ]

    // Opciones exclusivas para roles administrativos
    const isAdmin = currentUser.role === 'Super_Admin' || currentUser.role === 'Admin_Clinica'
    if (isAdmin) {
        menuItems.push({
            title: 'Espacio de Trabajo',
            path: `${prefix}/configuracion/empresa`,
            icon: LucideBuilding,
            description: 'Ajustes globales de la clínica'
        })
        menuItems.push({
            title: 'Equipo',
            path: `${prefix}/configuracion/equipo`,
            icon: LucideUsers,
            description: 'Gestión de asesores y doctores'
        })
        menuItems.push({
            title: 'Integraciones',
            path: `${prefix}/configuracion/integraciones`,
            icon: LucidePlugZap,
            description: 'Timelines AI, WhatsApp y más'
        })
        menuItems.push({
            title: 'Plantillas Chat',
            path: `${prefix}/configuracion/plantillas-chat`,
            icon: LucideMessageSquare,
            description: 'Mensajes predefinidos de WhatsApp'
        })
    }

    return (
        <div className="h-full flex flex-col md:flex-row overflow-hidden bg-gray-50">
            {/* Mobile Navigation (Tabs) */}
            <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-20 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <nav className="flex px-4 min-w-max space-x-2 py-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => 
                                `flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                                    isActive 
                                        ? 'bg-clinical-50 text-clinical-700' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`
                            }
                        >
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Secondary Sidebar (Settings Navigation - Desktop) */}
            <aside className="w-72 bg-gray-50/50 border-r border-gray-200 flex-col h-full z-10 hidden md:flex shrink-0">
                <div className="p-6 pb-4">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Configuración</h2>
                    <p className="text-sm text-gray-500 mt-1">Ajustes de cuenta y sistema</p>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => 
                                `flex items-start space-x-3 p-3 rounded-xl transition-all ${
                                    isActive 
                                        ? 'bg-white shadow-sm border border-gray-200 text-clinical-700' 
                                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 border border-transparent'
                                }`
                            }
                        >
                            <div className="mt-0.5">
                                <item.icon className="w-5 h-5 opacity-80" />
                            </div>
                            <div>
                                <span className="block font-medium text-sm">{item.title}</span>
                                <span className="block text-xs text-gray-500 font-normal mt-0.5 leading-tight">{item.description}</span>
                            </div>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area (Outlet for nested routes) */}
            <main className="flex-1 overflow-y-auto bg-white/50 md:bg-white">
                <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
