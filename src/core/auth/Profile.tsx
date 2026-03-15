import React from 'react'
import { useStore } from '../../store/useStore'
import { ChangePasswordForm } from './ChangePasswordForm'
import { LucideUser, LucideShieldCheck, LucideMail } from 'lucide-react'

export const Profile = () => {
    const { currentUser } = useStore()

    if (!currentUser) return null;

    const roleLabel = {
        'Super_Admin': 'Super Administrador',
        'Admin_Clinica': 'Director de Clínica',
        'Asesor_Sucursal': 'Asesor Comercial'
    }[currentUser.role];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
                        <img 
                            src={currentUser.avatarUrl} 
                            alt="Avatar" 
                            className="w-32 h-32 rounded-full border-4 border-clinical-50 object-cover mb-4"
                        />
                        <h2 className="text-xl font-bold text-gray-900 text-center">{currentUser.name}</h2>
                        <span className="inline-block mt-2 px-3 py-1 bg-clinical-50 text-clinical-700 rounded-full text-xs font-bold uppercase tracking-wide">
                            {roleLabel}
                        </span>

                        <div className="w-full mt-6 space-y-3">
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <LucideMail className="w-4 h-4 mr-3 text-gray-400" />
                                <span className="truncate">{currentUser.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <LucideShieldCheck className="w-4 h-4 mr-3 text-gray-400" />
                                <span>Acceso: {currentUser.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Column */}
                <div className="md:col-span-2 space-y-6">
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    )
}
