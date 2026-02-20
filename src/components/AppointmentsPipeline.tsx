import { useStore, Appointment } from '../store/useStore'
import { LucideClock, LucideCalendarCheck, LucideCheckCircle, LucideArrowRight, LucideUser, LucideStethoscope } from 'lucide-react'

export const AppointmentsPipeline = () => {
    const { currentUser, appointments, moveAppointment } = useStore()
    const branchId = currentUser?.sucursal_id

    const columns: { id: Appointment['status'], label: string, color: string, icon: any }[] = [
        { id: 'Por Confirmar', label: 'Por Confirmar', color: 'amber', icon: LucideClock },
        { id: 'Confirmada', label: 'Confirmadas', color: 'blue', icon: LucideCalendarCheck },
        { id: 'Atendida', label: 'Atendidas', color: 'emerald', icon: LucideCheckCircle },
        { id: 'Cancelada', label: 'Canceladas', color: 'red', icon: LucideCheckCircle },
    ]

    const getNextStatus = (current: Appointment['status']): Appointment['status'] | null => {
        if (current === 'Por Confirmar') return 'Confirmada'
        if (current === 'Confirmada') return 'Atendida'
        return null
    }

    return (
        <div className="h-[calc(100vh-12rem)] overflow-x-auto pb-4">
            <div className="flex gap-6 h-full min-w-[1000px]">
                {columns.map(col => (
                    <div key={col.id} className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200">
                        {/* Header */}
                        <div className={`p-4 border-b border-gray-100 bg-${col.color}-50 rounded-t-2xl`}>
                            <h3 className={`font-bold text-${col.color}-700 flex items-center gap-2`}>
                                <col.icon className="w-5 h-5" />
                                <span>{col.label}</span>
                                <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs shadow-sm text-gray-600">
                                    {appointments.filter(a => a.sucursal_id === branchId && a.status === col.id).length}
                                </span>
                            </h3>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {appointments
                                .filter(a => a.sucursal_id === branchId && a.status === col.id)
                                .map(appointment => (
                                    <div key={appointment.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                                            <div className={`w-10 h-10 rounded-full bg-${col.color}-50 flex items-center justify-center text-${col.color}-500`}>
                                                <LucideUser className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{appointment.patientName}</h4>
                                                <p className="text-xs text-gray-500">{appointment.date} • {appointment.time}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                <LucideStethoscope className="w-3 h-3" />
                                                <span className="font-medium">{appointment.serviceName}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 pl-1">
                                                Dr. {appointment.doctorName}
                                            </div>
                                        </div>

                                        {getNextStatus(appointment.status) && (
                                            <button
                                                onClick={() => moveAppointment(appointment.id, getNextStatus(appointment.status)!)}
                                                className={`w-full py-2 mt-1 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1
                                                    bg-${col.color}-50 text-${col.color}-600 hover:bg-${col.color}-100`}
                                            >
                                                <span>Mover a {getNextStatus(appointment.status)}</span>
                                                <LucideArrowRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
