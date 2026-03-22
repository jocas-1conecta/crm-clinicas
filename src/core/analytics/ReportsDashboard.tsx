import { useStore } from '../../store/useStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { LucideBarChart3, LucideTrendingUp, LucideUsers, LucideBuilding, LucideArrowUpRight, LucideArrowDownRight, LucidePieChart, LucideBriefcase, LucideDollarSign, LucideCheckSquare } from 'lucide-react'

export const ReportsDashboard = () => {
    const { currentUser } = useStore()
    if (!currentUser) return null;
    const role = currentUser.role

    // Render based on role
    const renderContent = () => {
        switch (role) {
            case 'Super_Admin':
                return <ClinicAdminReports currentUser={currentUser} />
            case 'Admin_Clinica':
            case 'Asesor_Sucursal':
                return <AdvisorReports currentUser={currentUser} />
            default:
                return <div>No tienes acceso a reportes.</div>
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Analíticas y Reportes</h1>
                <p className="text-gray-500">Visualización de datos clave y rendimiento.</p>
            </div>
            {renderContent()}
        </div>
    )
}

// Sub-components for cleaner code

const SuperAdminReports = ({ currentUser }: { currentUser: any }) => {
    const { data: clinics = [] } = useQuery({
        queryKey: ['clinics-admin'],
        queryFn: async () => {
            const { data, error } = await supabase.from('clinicas').select('*');
            if (error) throw error;
            return data;
        }
    })

    const activeClinics = clinics.filter(c => c.status === 'activa').length
    const suspendedClinics = clinics.filter(c => c.status === 'suspendida').length
    const newClinicsThisMonth = clinics.filter(c => new Date(c.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length

    // Calculate Projected MRR
    const mrr = clinics.reduce((acc, c) => {
        if (c.status !== 'activa') return acc
        return acc + (c.plan === 'Enterprise' ? 299 : c.plan === 'Pro' ? 99 : 0)
    }, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Nuevas Clínicas (Mes)" value={newClinicsThisMonth} icon={LucideBuilding} color="blue" trend="+20%" />
                <StatCard title="Clínicas Suspendidas" value={suspendedClinics} icon={LucideArrowDownRight} color="red" />
                <StatCard title="MRR Proyectado" value={`$${mrr}`} icon={LucideTrendingUp} color="emerald" trend="+15%" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Crecimiento de Suscripciones</h3>
                <div className="h-40 flex items-end space-x-2">
                    {Array.from({length: 7}).map((_, i) => {
                        const d = new Date();
                        d.setMonth(new Date().getMonth() - 6 + i);
                        const monthClinics = clinics.filter(c => new Date(c.created_at) <= new Date(d.getFullYear(), d.getMonth() + 1, 0));
                        const mrr = monthClinics.reduce((acc, c) => acc + (c.plan === 'Enterprise' ? 299 : c.plan === 'Pro' ? 99 : 0), 0);
                        const maxMrr = Math.max(...Array.from({length: 7}).map((_, j) => {
                            const d2 = new Date();
                            d2.setMonth(new Date().getMonth() - 6 + j);
                            return clinics.filter(c => new Date(c.created_at) <= new Date(d2.getFullYear(), d2.getMonth() + 1, 0))
                                .reduce((acc, c) => acc + (c.plan === 'Enterprise' ? 299 : c.plan === 'Pro' ? 99 : 0), 0);
                        })) || 1;
                        const h = Math.min((mrr / maxMrr) * 100, 100) || 0;
                        
                        return (
                            <div key={i} className="flex-1 bg-clinical-100 rounded-t-lg relative group hover:bg-clinical-200 transition-colors" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    ${mrr}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                    {Array.from({length: 7}).map((_, i) => {
                        const d = new Date();
                        d.setMonth(new Date().getMonth() - 6 + i);
                        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        return <span key={i}>{monthNames[d.getMonth()]}</span>
                    })}
                </div>
            </div>
        </div>
    )
}

const ClinicAdminReports = ({ currentUser }: any) => {
    const clinicId = currentUser?.clinica_id;

    const { data: branches = [] } = useQuery({
        queryKey: ['branches', clinicId],
        queryFn: async () => {
            const { data, error } = await supabase.from('sucursales').select('*').eq('clinica_id', clinicId)
            if (error) throw error
            return data
        },
        enabled: !!clinicId
    })

    const { data: leads = [] } = useQuery({
        queryKey: ['leads-admin', clinicId],
        queryFn: async () => {
            // leads table has no clinica_id — RLS scopes by clinic automatically
            const { data, error } = await supabase.from('leads').select('*').limit(1000)
            if (error) throw error
            return data
        }
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments-admin', clinicId],
        queryFn: async () => {
            const { data, error } = await supabase.from('appointments').select('*').limit(1000)
            if (error) throw error
            return data
        }
    })

    const { data: team = [] } = useQuery({
        queryKey: ['team', clinicId],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').eq('clinica_id', clinicId)
            if (error) throw error
            return data
        },
        enabled: !!clinicId
    })

    const { data: patients = [] } = useQuery({
        queryKey: ['patients-admin', clinicId],
        queryFn: async () => {
            const { data, error } = await supabase.from('patients').select('*').limit(1000)
            if (error) throw error
            return data
        }
    })

    const { data: deals = [] } = useQuery({
        queryKey: ['deals-admin', clinicId],
        queryFn: async () => {
            const { data, error } = await supabase.from('deals').select('*').limit(1000)
            if (error) throw error
            return data
        }
    })

    return (
        <div className="space-y-8">
            {/* Branch Performance */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Rendimiento por Sucursal</h3>
                <div className="space-y-6">
                    {branches.map((branch: any) => {
                        const branchLeads = leads.filter((l: any) => l.sucursal_id === branch.id).length
                        const branchAppts = appointments.filter((a: any) => a.sucursal_id === branch.id && a.status === 'Atendida').length

                        const maxLeads = Math.max(...branches.map((b:any) => leads.filter((l: any) => l.sucursal_id === b.id).length)) || 1
                        const maxAppts = Math.max(...branches.map((b:any) => appointments.filter((a: any) => a.sucursal_id === b.id && a.status === 'Atendida').length)) || 1
                        const leadWidth = (branchLeads / maxLeads) * 100
                        const apptWidth = (branchAppts / maxAppts) * 100

                        return (
                            <div key={branch.id}>
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium text-gray-700">{branch.name}</span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs font-medium text-gray-500 mb-1">
                                    <span className="w-20">Leads: {branchLeads}</span>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${leadWidth}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 text-xs font-medium text-gray-500">
                                    <span className="w-20">Atenciones: {branchAppts}</span>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${apptWidth}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Advisor Performance */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Rendimiento del Equipo</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                                <th className="pb-3">Asesor</th>
                                <th className="pb-3 text-center">Leads Asignados</th>
                                <th className="pb-3 text-center">Citas Agendadas</th>
                                <th className="pb-3 text-right">Efectividad</th>
                                <th className="pb-3 text-right">Ingresos Ganados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {team.map((member: any) => {
                                const memberLeads = leads.filter((l: any) => l.assigned_to === member.id)
                                const assignedLeads = memberLeads.length
                                const memberAppts = appointments.filter((a: any) => a.assigned_to === member.id && a.status === 'Atendida')
                                const scheduled = memberAppts.length
                                const rate = assignedLeads > 0 ? Math.round((scheduled / assignedLeads) * 100) : 0

                                const memberPatients = patients.filter((p: any) => p.assigned_to === member.id)
                                const memberPatientIds = memberPatients.map((p: any) => p.id)
                                const memberDeals = deals.filter((d: any) => memberPatientIds.includes(d.patient_id))
                                const memberWonValue = memberDeals.filter((d: any) => d.status === 'Ganado').reduce((sum: number, d: any) => sum + Number(d.estimated_value), 0)

                                return (
                                    <tr key={member.id}>
                                        <td className="py-3 flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden">
                                                <img src={member.avatar} alt="" />
                                            </div>
                                            <span className="font-medium text-gray-900">{member.name}</span>
                                        </td>
                                        <td className="py-3 text-center text-gray-600">{assignedLeads}</td>
                                        <td className="py-3 text-center text-gray-600">{scheduled}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${rate > 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {rate}%
                                            </span>
                                        </td>
                                        <td className="py-3 text-right font-bold text-emerald-600">
                                            ${memberWonValue.toLocaleString()}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const AdvisorReports = ({ currentUser }: any) => {
    const branchId = currentUser?.sucursal_id

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

    const { data: patients = [] } = useQuery({
        queryKey: ['patients', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase.from('patients').select('*').eq('assigned_to', currentUser.id);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const { data: deals = [] } = useQuery({
        queryKey: ['deals', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data: pData, error: pError } = await supabase.from('patients').select('id').eq('assigned_to', currentUser.id);
            if (pError) throw pError;
            const pIds = pData.map(p => p.id);
            if (pIds.length === 0) return [];

            const { data, error } = await supabase.from('deals').select('*').in('patient_id', pIds);
            if (error) throw error;
            return data;
        },
        enabled: !!branchId,
    })

    const totalLeads = leads.length
    const scheduled = leads.filter((l: any) => l.status === 'Agendado').length
    // In our store, converted leads become patients and are removed from leads list. 
    // So "Pacientes" count would be current patients minus imported ones? 
    // For specific funnel visualization, let's just use "Contactado" vs "Cita Agendada".
    const contacted = leads.filter((l: any) => l.status === 'Contactado').length

    const attended = appointments.filter((a: any) => a.status === 'Atendida').length
    const canceled = appointments.filter((a: any) => a.status === 'Cancelada').length
    const totalAppts = attended + canceled || 1 // avoid div 0

    const wonDeals = deals.filter((d: any) => d.status === 'Ganado')
    const wonValue = wonDeals.reduce((sum: number, d: any) => sum + Number(d.estimated_value), 0)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <LucideBarChart3 className="w-5 h-5 text-clinical-600" />
                    Mi Embudo de Conversión
                </h3>
                <div className="space-y-4">
                    <FunnelStep label="Total Leads Asignados" count={totalLeads} color="bg-blue-500" width="100%" />
                    <FunnelStep label="Leads Contactados" count={contacted} color="bg-blue-400" width={`${(contacted / totalLeads) * 100}%`} />
                    <FunnelStep label="Citas Agendadas" count={scheduled} color="bg-emerald-500" width={`${(scheduled / totalLeads) * 100}%`} />
                </div>
            </div>

            {/* Attendance */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <LucidePieChart className="w-5 h-5 text-clinical-600" />
                    Efectividad de Citas
                </h3>
                <div className="flex items-center justify-center p-4">
                    <div className="relative w-40 h-40 rounded-full border-[16px] border-gray-100"
                        style={{
                            background: `conic-gradient(#10b981 0% ${(attended / totalAppts) * 100}%, #ef4444 ${(attended / totalAppts) * 100}% 100%)`,
                            // This is a simple CSS trick for donut chart.
                            borderRadius: '50%'
                        }}
                    >
                        <div className="absolute inset-0 m-4 bg-white rounded-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900">{Math.round((attended / totalAppts) * 100)}%</span>
                            <span className="text-xs text-gray-400 uppercase">Efectividad</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center space-x-6 mt-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Atendidas ({attended})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Canceladas ({canceled})</span>
                    </div>
                </div>
            </div>

            {/* Oportunidades / Negocios */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <LucideTrendingUp className="w-5 h-5 text-emerald-600" />
                    Mis Oportunidades de Negocio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Oportunidades" value={deals.length} icon={LucideBriefcase} color="blue" />
                    <StatCard title="Negocios Ganados" value={wonDeals.length} icon={LucideCheckSquare} color="emerald" />
                    <StatCard title="Ingresos Generados" value={`$${wonValue.toLocaleString()}`} icon={LucideDollarSign} color="emerald" />
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {trend && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">{trend}</span>}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
            <Icon className="w-6 h-6" />
        </div>
    </div>
)

const FunnelStep = ({ label, count, color, width }: any) => (
    <div className="relative">
        <div className="flex justify-between text-sm font-medium text-gray-600 mb-1 relative z-10">
            <span>{label}</span>
            <span>{count}</span>
        </div>
        <div className="h-10 bg-gray-50 rounded-lg overflow-hidden relative">
            <div className={`h-full ${color} opacity-20 absolute left-0 top-0`} style={{ width: width }}></div>
            <div className={`h-full ${color} w-1 absolute left-0 top-0`}></div>
        </div>
    </div>
)
