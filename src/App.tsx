import { useState } from 'react'
import { useStore } from './store/useStore'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { Pipeline } from './components/Pipeline'
import { Patients } from './components/Patients'
import { Management } from './components/Management'
import { AppointmentsPipeline } from './components/AppointmentsPipeline'

import { Dashboard } from './components/Dashboard'

function App() {
    const { currentUser } = useStore()
    const [activeView, setActiveView] = useState('Dashboard')

    if (!currentUser) {
        return <Login />
    }

    const renderView = () => {
        switch (activeView) {
            case 'Leads': return <Pipeline />
            case 'Citas': return <AppointmentsPipeline />
            case 'Pacientes': return <Patients />
            case 'Gestión': return <Management />
            case 'Dashboard': return <Dashboard />
            default: return null
        }
    }

    return (
        <Layout activeView={activeView} onViewChange={setActiveView}>
            {renderView()}
        </Layout>
    )
}

export default App
