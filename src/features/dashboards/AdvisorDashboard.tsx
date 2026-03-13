import { LucideCalendar, LucideCheckCircle, LucideUsers } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const AdvisorDashboard = () => {
    const { currentUser } = useStore()

    // Filter by branch
    const branchId = currentUser?.sucursal_id || ''

    const { data: leads = [] } = useQuery({
        queryKey: ['leads', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('leads').select('*').eq('sucursal_id', branchId);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('appointments').select('*').eq('sucursal_id', branchId);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    // KPIs
    const newLeadsToday = leads.filter(l =>
        l.status === 'Nuevo' &&
        new Date(l.created_at).toDateString() === new Date().toDateString()
    ).length

    const confirmedAppointments = appointments.filter(a =>
        a.status === 'Confirmada'
    ).length

    const patientsAttended = appointments.filter(a =>
        a.status === 'Atendida'
    ).length

    const statCards = [
        { title: 'Nuevos Leads Hoy', value: newLeadsToday, icon: LucideUsers, color: 'blue' },
        { title: 'Citas Confirmadas', value: confirmedAppointments, icon: LucideCalendar, color: 'purple' },
        { title: 'Pacientes Atendidos', value: patientsAttended, icon: LucideCheckCircle, color: 'emerald' },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Operativo</h1>
                <p className="text-gray-500">Resumen de actividad para la sucursal {branchId}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                            <stat.icon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Próximos Pasos</h3>
                <p className="text-gray-500">Revisa tu pipeline de leads para gestionar los nuevos prospectos o confirma las citas de mañana.</p>
            </div>
        </div>
    )
}
