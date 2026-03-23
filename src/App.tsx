import React, { Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStore } from './store/useStore'
import { supabase } from './services/supabase'
import { Login } from './core/auth/Login'
import { ModuleGuard } from './core/auth/ModuleGuard'
import { ForgotPassword } from './core/auth/ForgotPassword'
import { UpdatePassword } from './core/auth/UpdatePassword'
import { OnboardingWizard } from './core/auth/OnboardingWizard'
import { AcceptInvitation } from './core/auth/AcceptInvitation'
import { Profile } from './core/auth/Profile'
import { SettingsLayout } from './core/settings/SettingsLayout'
import { ProfileSettings } from './core/settings/ProfileSettings'
import { SecuritySettings } from './core/settings/SecuritySettings'
import { WorkspaceSettings } from './core/settings/WorkspaceSettings'
import { Layout } from './core/Layout'
import { Patients } from './modules/clinic/patients/Patients'
import { PatientsTable } from './modules/clinic/patients/PatientsTable'
import { Management } from './core/organizations/Management'
import { AppointmentsPipeline } from './modules/clinic/appointments/AppointmentsPipeline'
import { AppointmentsTable } from './modules/clinic/appointments/AppointmentsTable'
import { SuperAdminDashboard } from './core/dashboards/SuperAdminDashboard'
import { ClinicsManagement } from './core/organizations/ClinicsManagement'
import { BranchesManagement } from './core/organizations/BranchesManagement'
import { BranchDetail } from './core/organizations/BranchDetail'
import { TeamManagement } from './core/organizations/TeamManagement'
import { TaskSequenceConfig } from './core/organizations/TaskSequenceConfig'
import { CatalogsManagement } from './core/catalogs/CatalogsManagement'
import { RootDashboard } from './core/dashboards/RootDashboard'
import { LeadsPipeline } from './core/leads/LeadsPipeline'
import { LeadsTable } from './core/leads/LeadsTable'
import { PatientsDirectory } from './modules/clinic/patients/PatientsDirectory'
import { ReportsDashboard } from './core/analytics/ReportsDashboard'
import { CalendarTasks } from './core/calendar/CalendarTasks'
import { ChatModule } from './core/chat/ChatModule'
import { IntegrationsSettings } from './core/settings/IntegrationsSettings'
import { ChatTemplatesSettings } from './core/settings/ChatTemplatesSettings'
import { useGlobalChatNotifications } from './core/chat/useGlobalChatNotifications'
import { getTenantSlug, buildTenantUrl } from './utils/getTenantSlug'

/** Mounts the global real-time chat notification listener for all authenticated routes */
function GlobalNotificationsMount() {
    useGlobalChatNotifications()
    return null
}

/**
 * Backward-compatibility redirect:
 * If someone visits 1clc.app/clinicademo/dashboard (old path-based URL),
 * redirect them to clinicademo.1clc.app/dashboard (new subdomain URL).
 */
function LegacySlugRedirect() {
    const path = window.location.pathname
    const match = path.match(/^\/([a-z0-9][a-z0-9-]+)(\/.*)?$/)
    if (match && !getTenantSlug()) {
        const possibleSlug = match[1]
        const rest = match[2] || '/dashboard'
        const reserved = ['login', 'registro', 'join', 'olvide-mi-contrasena', 'actualizar-contrasena', 'dashboard', 'clinicas', 'configuracion', 'leads', 'tareas', 'chat', 'citas', 'pacientes', 'reportes', 'perfil', 'mis-sucursales', 'catalogos', 'embudos', 'automatizaciones', 'gestion', 'mi-dashboard']
        if (!reserved.includes(possibleSlug)) {
            window.location.href = buildTenantUrl(possibleSlug, rest)
            return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Redirigiendo...</p></div>
        }
    }
    return null
}

const queryClient = new QueryClient()

function App() {
    const { currentUser, setCurrentUser } = useStore()
    const [isAuthLoading, setIsAuthLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfileAndSetUser(session.user)
            } else {
                setCurrentUser(null)
                setIsAuthLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfileAndSetUser(session.user)
            } else {
                setCurrentUser(null)
                setIsAuthLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfileAndSetUser = async (user: any) => {
        try {
            const { data, error } = await supabase.rpc('get_my_profile')

            if (error) {
                console.error("Error fetching profile:", error)
                setIsAuthLoading(false)
                return
            }

            if (!data) {
                setIsAuthLoading(false)
                return
            }

            let clinica_slug: string | undefined = undefined
            let active_modules: string[] = []

            if (data.clinica_id) {
                const { data: clinicData } = await supabase
                    .from('clinicas')
                    .select('slug, active_modules')
                    .eq('id', data.clinica_id)
                    .single()

                clinica_slug = clinicData?.slug
                active_modules = clinicData?.active_modules || []
            }

            const avatarFull = data.avatar_url || `https://ui-avatars.com/api/?name=${data.name}`
            const avatarThumb = data.avatar_thumb_url || avatarFull.replace('_full.jpg', '_thumb.jpg')

            setCurrentUser({
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role as 'Platform_Owner' | 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal',
                avatarUrl: avatarFull,
                avatarThumbUrl: avatarThumb,
                clinica_id: data.clinica_id,
                sucursal_id: data.sucursal_id,
                clinica_slug,
                active_modules
            })
        } catch (err) {
            console.error("Error setting user:", err)
        } finally {
            setIsAuthLoading(false)
        }
    }

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-clinical-200 border-t-clinical-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Verificando sesión...</p>
            </div>
        )
    }

    if (!currentUser) {
        return (
            <Routes>
                <Route path="/olvide-mi-contrasena" element={<ForgotPassword />} />
                <Route path="/actualizar-contrasena" element={<UpdatePassword />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<OnboardingWizard />} />
                <Route path="/join" element={<AcceptInvitation />} />
                <Route path="/" element={<Login />} />
                <Route path="*" element={<Login />} />
            </Routes>
        )
    }

    const getRoleFallback = () => {
        switch(currentUser.role) {
            case 'Platform_Owner': return '/clinicas';
            case 'Super_Admin': return '/dashboard';
            case 'Admin_Clinica': return '/dashboard';
            case 'Asesor_Sucursal': return '/dashboard';
            default: return '/';
        }
    }

    return (
        <QueryClientProvider client={queryClient}>
        <GlobalNotificationsMount />
        <LegacySlugRedirect />
        <Layout>
            <Suspense fallback={<div className="p-10 flex justify-center text-gray-400">Cargando módulo...</div>}>
                <Routes>
                    {/* Dashboards */}
                    <Route path="/dashboard" element={<RootDashboard />} />

                    {/* Platform Owner */}
                    {currentUser.role === 'Platform_Owner' && <Route path="/clinicas" element={<ClinicsManagement />} />}

                    {/* Super_Admin Only */}
                    {currentUser.role === 'Super_Admin' && <Route path="/mis-sucursales" element={<BranchesManagement />} />}
                    {currentUser.role === 'Super_Admin' && <Route path="/mis-sucursales/:branchId" element={<BranchDetail />} />}
                    {currentUser.role === 'Super_Admin' && <Route path="/catalogos" element={<CatalogsManagement />} />}
                    {currentUser.role === 'Super_Admin' && <Route path="/gestion" element={<Management />} />}

                    <Route element={<ModuleGuard requiredModule="automations" />}>
                        {currentUser.role === 'Super_Admin' && <Route path="/automatizaciones" element={<TaskSequenceConfig />} />}
                    </Route>

                    {/* Operation Roles */}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && <Route path="/leads" element={currentUser.role === 'Super_Admin' ? <LeadsTable /> : <LeadsPipeline />} />}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && <Route path="/tareas" element={<CalendarTasks />} />}

                    <Route element={<ModuleGuard requiredModule="chat_whatsapp" />}>
                        {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && <Route path="/chat" element={<ChatModule />} />}
                    </Route>

                    <Route element={<ModuleGuard requiredModule="clinic_core" />}>
                        {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && <Route path="/citas" element={currentUser.role === 'Super_Admin' ? <AppointmentsTable /> : <AppointmentsPipeline />} />}
                        {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && <Route path="/pacientes" element={currentUser.role === 'Super_Admin' ? <PatientsTable /> : (currentUser.role === 'Asesor_Sucursal' ? <PatientsDirectory /> : <Patients />)} />}
                    </Route>

                    <Route element={<ModuleGuard requiredModule="analytics" />}>
                        <Route path="/reportes" element={<ReportsDashboard />} />
                    </Route>

                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/actualizar-contrasena" element={<UpdatePassword />} />

                    {/* Settings Hub */}
                    <Route path="/configuracion" element={<SettingsLayout />}>
                        <Route index element={<Navigate to="perfil" replace />} />
                        <Route path="perfil" element={<ProfileSettings />} />
                        <Route path="seguridad" element={<SecuritySettings />} />
                        <Route path="empresa" element={<WorkspaceSettings />} />
                        <Route path="equipo" element={<TeamManagement />} />
                        <Route path="integraciones" element={<IntegrationsSettings />} />
                        <Route path="plantillas-chat" element={<ChatTemplatesSettings />} />
                    </Route>
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to={getRoleFallback()} replace />} />
                </Routes>
            </Suspense>
        </Layout>
        </QueryClientProvider>
    )
}

export default App
