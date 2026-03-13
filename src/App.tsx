import React, { Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { supabase } from './services/supabase'
import { Login } from './features/auth/Login'
import { Layout } from './core/Layout'
import { Patients } from './features/patients/Patients'
import { Management } from './features/clinics/Management'
import { AppointmentsPipeline } from './features/calendar/AppointmentsPipeline'
import { SuperAdminDashboard } from './features/dashboards/SuperAdminDashboard'
import { ClinicsManagement } from './features/clinics/ClinicsManagement'
import { BranchesManagement } from './features/clinics/BranchesManagement'
import { TeamManagement } from './features/clinics/TeamManagement'
import { PipelineConfig } from './features/clinics/PipelineConfig'
import { CatalogsManagement } from './features/catalogs/CatalogsManagement'
import { Dashboard } from './features/dashboards/Dashboard'
import { AdvisorDashboard } from './features/dashboards/AdvisorDashboard'
import { LeadsPipeline } from './features/leads/LeadsPipeline'
import { PatientsDirectory } from './features/patients/PatientsDirectory'
import { ReportsDashboard } from './features/analytics/ReportsDashboard'
import { CalendarTasks } from './features/calendar/CalendarTasks'

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
            const { data, error } = await supabase
                .from('profiles')
                .select('*, clinicas ( slug )')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error("Error fetching profile:", error)
            } else if (data) {
                setCurrentUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role as 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal',
                    avatarUrl: data.avatar_url || `https://ui-avatars.com/api/?name=${data.name}`,
                    clinica_id: data.clinica_id,
                    sucursal_id: data.sucursal_id,
                    clinica_slug: data.clinicas?.slug
                })
            }
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
                <Route path="/:slug" element={<Login />} />
                <Route path="/" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        )
    }

    // Default redirects based on role
    const getRoleFallback = () => {
        switch(currentUser.role) {
            case 'Super_Admin': return '/dashboard';
            case 'Admin_Clinica': return '/dashboard';
            case 'Asesor_Sucursal': return '/mi-dashboard';
            default: return '/';
        }
    }

    return (
        <Layout>
            <Suspense fallback={<div className="p-10 flex justify-center text-gray-400">Cargando módulo...</div>}>
                <Routes>
                    {/* Super Admin Routes */}
                    {currentUser.role === 'Super_Admin' && ['/dashboard', '/:slug/dashboard'].map(p => <Route key={p} path={p} element={<SuperAdminDashboard />} />)}
                    {currentUser.role === 'Super_Admin' && ['/clinicas', '/:slug/clinicas'].map(p => <Route key={p} path={p} element={<ClinicsManagement />} />)}

                    {/* Clinic Admin Routes */}
                    {currentUser.role === 'Admin_Clinica' && ['/dashboard', '/:slug/dashboard'].map(p => <Route key={p} path={p} element={<Dashboard />} />)}
                    {currentUser.role === 'Admin_Clinica' && ['/mis-sucursales', '/:slug/mis-sucursales'].map(p => <Route key={p} path={p} element={<BranchesManagement />} />)}
                    {currentUser.role === 'Admin_Clinica' && ['/mi-equipo', '/:slug/mi-equipo'].map(p => <Route key={p} path={p} element={<TeamManagement />} />)}
                    {currentUser.role === 'Admin_Clinica' && ['/catalogos', '/:slug/catalogos'].map(p => <Route key={p} path={p} element={<CatalogsManagement />} />)}
                    {currentUser.role === 'Admin_Clinica' && ['/embudos', '/:slug/embudos'].map(p => <Route key={p} path={p} element={<PipelineConfig />} />)}
                    {currentUser.role === 'Admin_Clinica' && ['/gestion', '/:slug/gestion'].map(p => <Route key={p} path={p} element={<Management />} />)}

                    {/* Advisor Specific Routes */}
                    {currentUser.role === 'Asesor_Sucursal' && ['/mi-dashboard', '/:slug/mi-dashboard'].map(p => <Route key={p} path={p} element={<AdvisorDashboard />} />)}

                    {/* Operation Roles (Admin & Asesor) */}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Asesor_Sucursal') && ['/leads', '/:slug/leads'].map(p => <Route key={p} path={p} element={<LeadsPipeline />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Asesor_Sucursal') && ['/citas', '/:slug/citas'].map(p => <Route key={p} path={p} element={<AppointmentsPipeline />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Asesor_Sucursal') && ['/tareas', '/:slug/tareas'].map(p => <Route key={p} path={p} element={<CalendarTasks />} />)}
                    {(currentUser.role === 'Admin_Clinica' || currentUser.role === 'Asesor_Sucursal') && ['/pacientes', '/:slug/pacientes'].map(p => <Route key={p} path={p} element={currentUser.role === 'Admin_Clinica' ? <Patients /> : <PatientsDirectory />} />)}

                    {/* Universal (Needs Login) */}
                    {['/reportes', '/:slug/reportes'].map(p => <Route key={p} path={p} element={<ReportsDashboard />} />)}

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to={getRoleFallback()} replace />} />
                </Routes>
            </Suspense>
        </Layout>
    )
}

export default App
