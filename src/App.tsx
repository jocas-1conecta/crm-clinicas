import { useState } from 'react'
import { useStore } from './store/useStore'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { Pipeline } from './components/Pipeline'
import { Patients } from './components/Patients'
import { Management } from './components/Management'
import { AppointmentsPipeline } from './components/AppointmentsPipeline'
import { SuperAdminDashboard } from './components/SuperAdminDashboard'
import { ClinicsManagement } from './components/ClinicsManagement'
import { BranchesManagement } from './components/BranchesManagement'
import { TeamManagement } from './components/TeamManagement'
import { CatalogsManagement } from './components/CatalogsManagement'
import { Dashboard } from './components/Dashboard'
import { AdvisorDashboard } from './components/AdvisorDashboard'
import { LeadsPipeline } from './components/LeadsPipeline'
import { PatientsDirectory } from './components/PatientsDirectory'
import { ReportsDashboard } from './components/ReportsDashboard'

function App() {
    const { currentUser } = useStore()
    const [activeView, setActiveView] = useState('Dashboard')

    if (!currentUser) {
        return <Login />
    }

    const renderView = () => {
        // Universal View (Reports)
        if (activeView === 'Reportes') return <ReportsDashboard />

        // Super Admin Specific Routing
        if (currentUser.role === 'Super_Admin') {
            switch (activeView) {
                case 'Dashboard': return <SuperAdminDashboard />
                case 'Clinicas': return <ClinicsManagement />
                default: return <SuperAdminDashboard />
            }
        }

        // Clinic Admin Specific Routing
        if (currentUser.role === 'Admin_Clinica') {
            switch (activeView) {
                case 'Mis Sucursales': return <BranchesManagement />
                case 'Mi Equipo': return <TeamManagement />
                case 'Catálogos': return <CatalogsManagement />
            }
        }

        // Advisor Specific Routing
        if (currentUser.role === 'Asesor_Sucursal') {
            switch (activeView) {
                case 'Mi Dashboard': return <AdvisorDashboard />
                case 'Leads': return <LeadsPipeline />
                case 'Pacientes': return <PatientsDirectory />
                case 'Citas': return <AppointmentsPipeline />
                default: return <AdvisorDashboard />
            }
        }

        // Common Routing fallback for Admin_Clinica mainly
        if (currentUser.role === 'Admin_Clinica') {
            switch (activeView) {
                case 'Dashboard': return <Dashboard />
                case 'Leads': return <Pipeline />
                case 'Citas': return <AppointmentsPipeline />
                case 'Pacientes': return <Patients />
                case 'Gestión': return <Management />
                default: return <Dashboard />
            }
        }

        return <div className="p-10">Vista no encontrada</div>
    }

    return (
        <Layout activeView={activeView} onViewChange={setActiveView}>
            {renderView()}
        </Layout>
    )
}

export default App
