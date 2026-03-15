import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../../store/useStore'

interface ModuleGuardProps {
    requiredModule: string;
    children?: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({ requiredModule, children }) => {
    const { currentUser } = useStore()
    
    const hasModule = currentUser?.active_modules?.includes(requiredModule)
    
    if (!hasModule) {
        // Redirigir al inicio genérico si no tiene el módulo
        const fallback = currentUser?.role === 'Asesor_Sucursal' ? '/mi-dashboard' : '/dashboard'
        return <Navigate to={fallback} replace />
    }

    return children ? <>{children}</> : <Outlet />
}
