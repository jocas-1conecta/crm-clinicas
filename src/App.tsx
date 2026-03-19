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
import { Management } from './core/organizations/Management'
import { AppointmentsPipeline } from './modules/clinic/appointments/AppointmentsPipeline'
import { SuperAdminDashboard } from './core/dashboards/SuperAdminDashboard'
import { ClinicsManagement } from './core/organizations/ClinicsManagement'
import { BranchesManagement } from './core/organizations/BranchesManagement'
import { TeamManagement } from './core/organizations/TeamManagement'
import { PipelineConfig } from './core/organizations/PipelineConfig'
import { CatalogsManagement } from './core/catalogs/CatalogsManagement'
import { RootDashboard } from './core/dashboards/RootDashboard'
import { LeadsPipeline } from './core/leads/LeadsPipeline'
import { PatientsDirectory } from './modules/clinic/patients/PatientsDirectory'
import { ReportsDashboard } from './core/analytics/ReportsDashboard'
import { CalendarTasks } from './core/calendar/CalendarTasks'
import { ChatModule } from './core/chat/ChatModule'
import { IntegrationsSettings } from './core/settings/IntegrationsSettings'
import { useGlobalChatNotifications } from './core/chat/useGlobalChatNotifications'

/** Mounts the global real-time chat notification listener for all authenticated routes */
function GlobalNotificationsMount() {
    useGlobalChatNotifications()
    return null
}

const queryClient = new QueryClient()

function App() {
    const { currentUser, setCurrentUser } = useStore()
    const [isAuthLoading, setIsAuthLoading] = useState(true)

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfileAndSetUser(session.user)
            } else {
                setCurrentUser(null)
                setIsAuthLoading(false)
            }
        })

        // Listen for auth changes (login, logout)
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
            // Use the SECURITY DEFINER RPC to bypass all RLS policies.
            // This prevents infinite recursion during login for all roles.
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

            // Only fetch clinic data if user belongs to a clinic (Platform Owner has none)
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

            setCurrentUser({
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role as 'Platform_Owner' | 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal',
                avatarUrl: data.avatar_url || `https://ui-avatars.com/api/?name=${data.name}`,
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
                {/* Guest Routes (No Auth Needed) */}
                {['/olvide-mi-contrasena', '/:slug/olvide-mi-contrasena'].map(p => <Route key={p} path={p} element={<ForgotPassword />} />)}
                {['/actualizar-contrasena', '/:slug/actualizar-contrasena'].map(p => <Route key={p} path={p} element={<UpdatePassword />} />)}
                
                {/* Identifier-First Auth Router */}
                <Route path="/:slug/login" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<OnboardingWizard />} />
                <Route path="/join" element={<AcceptInvitation />} />
                <Route path="/" element={<Login />} />
                
                {/* Fallback to Global Gateway if typing random string */}
                <Route path="/:slug" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        )
    }

    // Default redirects based on role
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
        <Layout>
            <Suspense fallback={<div className="p-10 flex justify-center text-gray-400">Cargando módulo...</div>}>
                <Routes>
                    {/* Dashboards (Universal Proxy) */}
                    {(currentUser.role === 'Platform_Owner' || currentUser.role === 'Super_Admin' || currentUser.role === 'Admin_Clinica' || currentUser.role === 'Asesor_Sucursal') && 
                        ['/dashboard', '/:slug/dashboard'].map(p => <Route key={p} path={p} element={<RootDashboard />} />)
                    }

                    {/* Platform Owner Routes (Global SaaS) */}
                    {currentUser.role === 'Platform_Owner' && ['/clinicas', '/:slug/clinicas'].map(p => <Route key={p} path={p} element={<ClinicsManagement />} />)}

                    {/* Clinic Admin & Super Admin Routes */}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin') && ['/mis-sucursales', '/:slug/mis-sucursales'].map(p => <Route key={p} path={p} element={<BranchesManagement />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin') && ['/catalogos', '/:slug/catalogos'].map(p => <Route key={p} path={p} element={<CatalogsManagement />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin') && ['/embudos', '/:slug/embudos'].map(p => <Route key={p} path={p} element={<PipelineConfig />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin') && ['/gestion', '/:slug/gestion'].map(p => <Route key={p} path={p} element={<Management />} />)}

                    {/* Operation Roles (Super Admin, Admin & Asesor) */}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && ['/leads', '/:slug/leads'].map(p => <Route key={p} path={p} element={<LeadsPipeline />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && ['/tareas', '/:slug/tareas'].map(p => <Route key={p} path={p} element={<CalendarTasks />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && ['/chat', '/:slug/chat'].map(p => <Route key={p} path={p} element={<ChatModule />} />)}

                    {/* Protected Clinic Modules */}
                    <Route element={<ModuleGuard requiredModule="clinic_core" />}>
                        {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && ['/citas', '/:slug/citas'].map(p => <Route key={p} path={p} element={<AppointmentsPipeline />} />)}
                        {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Super_Admin' || currentUser.role === 'Asesor_Sucursal') && ['/pacientes', '/:slug/pacientes'].map(p => <Route key={p} path={p} element={currentUser.role === 'Asesor_Sucursal' ? <PatientsDirectory /> : <Patients />} />)}
                    </Route>

                    {/* Universal (Needs Login o Token Temporal) */}
                    {['/reportes', '/:slug/reportes'].map(p => <Route key={p} path={p} element={<ReportsDashboard />} />)}
                    {['/perfil', '/:slug/perfil'].map(p => <Route key={p} path={p} element={<Profile />} />)}
                    {['/actualizar-contrasena', '/:slug/actualizar-contrasena'].map(p => <Route key={p} path={p} element={<UpdatePassword />} />)}

                    {/* Settings Hub (Nested Routes) */}
                    {['/configuracion', '/:slug/configuracion'].map(basePath => (
                        <Route key={basePath} path={basePath} element={<SettingsLayout />}>
                            <Route index element={<Navigate to="perfil" replace />} />
                            <Route path="perfil" element={<ProfileSettings />} />
                            <Route path="seguridad" element={<SecuritySettings />} />
                            <Route path="empresa" element={<WorkspaceSettings />} />
                            <Route path="equipo" element={<TeamManagement />} />
                            <Route path="integraciones" element={<IntegrationsSettings />} />
                        </Route>
                    ))}
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to={getRoleFallback()} replace />} />
                </Routes>
            </Suspense>
        </Layout>
        </QueryClientProvider>
    )
}

export default App
