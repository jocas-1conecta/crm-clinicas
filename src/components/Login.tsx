import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LucideShieldCheck, LucideChevronRight, LucideBuilding, LucideUser, LucideCheckCircle2, LucideGlobe } from 'lucide-react'

// Mock Google Icon
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
)

export const Login = () => {
    const loginAs = useStore((state) => state.loginAs)
    const [showRoleSelector, setShowRoleSelector] = useState(false)

    const handleGoogleClick = () => {
        setShowRoleSelector(true)
    }

    const handleRoleSelect = (role: 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal') => {
        loginAs(role)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row h-[600px]">

                {/* Left Side - Brand & Visuals */}
                <div className="bg-clinical-600 md:w-1/2 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                            <LucideShieldCheck className="w-10 h-10" />
                        </div>
                        <h1 className="text-4xl font-bold mb-6 tracking-tight">Clínica Rangel</h1>
                        <p className="text-clinical-100 text-lg leading-relaxed max-w-sm">
                            Gestión inteligente de pacientes y leads para clínicas de alto rendimiento.
                        </p>
                    </div>

                    <div className="relative z-10 hidden md:block">
                        <div className="flex items-center space-x-3 text-sm text-clinical-200">
                            <LucideCheckCircle2 className="w-5 h-5 text-clinical-300" />
                            <span>Control Total de Sucursales</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-clinical-200 mt-2">
                            <LucideCheckCircle2 className="w-5 h-5 text-clinical-300" />
                            <span>Seguimiento de Leads en Tiempo Real</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login / Role Selection */}
                <div className="md:w-1/2 bg-white relative">
                    {!showRoleSelector ? (
                        <div className="h-full flex flex-col justify-center px-12 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="max-w-sm mx-auto w-full">
                                <h2 className="text-3xl font-bold text-gray-900 mb-3">Bienvenido</h2>
                                <p className="text-gray-500 mb-8">Inicia sesión para acceder a tu panel.</p>

                                <button
                                    onClick={handleGoogleClick}
                                    className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md group"
                                >
                                    <GoogleIcon />
                                    <span>Continuar con Google</span>
                                    <LucideChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="mt-8 text-center">
                                    <p className="text-xs text-gray-400">
                                        Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center px-12 bg-gray-50 animate-in fade-in zoom-in-95 duration-300">
                            <div className="max-w-md mx-auto w-full">
                                <button
                                    onClick={() => setShowRoleSelector(false)}
                                    className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center"
                                >
                                    ← Volver
                                </button>

                                <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona un Rol (Demo)</h3>
                                <p className="text-sm text-gray-500 mb-6">Simula el acceso con diferentes niveles de permiso.</p>

                                <div className="space-y-3">
                                    {/* Role Card: Super Admin */}
                                    <button
                                        onClick={() => handleRoleSelect('Super_Admin')}
                                        className="w-full flex items-start p-4 bg-white rounded-xl border border-gray-200 hover:border-clinical-500 hover:ring-1 hover:ring-clinical-500 transition-all text-left group shadow-sm"
                                    >
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-4 group-hover:bg-purple-100 transition-colors">
                                            <LucideGlobe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Super Admin</h4>
                                            <p className="text-xs text-gray-500 mt-1">Acceso global a toda la plataforma y configuración.</p>
                                        </div>
                                    </button>

                                    {/* Role Card: Admin Clínica */}
                                    <button
                                        onClick={() => handleRoleSelect('Admin_Clinica')}
                                        className="w-full flex items-start p-4 bg-white rounded-xl border border-gray-200 hover:border-clinical-500 hover:ring-1 hover:ring-clinical-500 transition-all text-left group shadow-sm"
                                    >
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                                            <LucideBuilding className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Admin Clínica</h4>
                                            <p className="text-xs text-gray-500 mt-1">Gestión completa de una clínica específica (C-001).</p>
                                        </div>
                                    </button>

                                    {/* Role Card: Asesor Sucursal */}
                                    <button
                                        onClick={() => handleRoleSelect('Asesor_Sucursal')}
                                        className="w-full flex items-start p-4 bg-white rounded-xl border border-gray-200 hover:border-clinical-500 hover:ring-1 hover:ring-clinical-500 transition-all text-left group shadow-sm"
                                    >
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg mr-4 group-hover:bg-green-100 transition-colors">
                                            <LucideUser className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Asesor Sucursal</h4>
                                            <p className="text-xs text-gray-500 mt-1">Acceso limitado a leads y pacientes de sucursal (S-001).</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
