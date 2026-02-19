import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LucidePlus, LucideSearch, LucideFilter, LucideMoreVertical, LucideCalendar, LucideUser, LucideClock } from 'lucide-react'

const STAGES = ['Solicitada', 'Por Confirmar', 'Confirmada', 'En Sala', 'Atendida', 'Cancelada']

export const AppointmentsPipeline = () => {
    const { appointments, updateAppointmentStatus, currentUser } = useStore()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredAppointments = appointments.filter(app => {
        const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.serviceName.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
    })

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                        <LucideSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar paciente, doctor o servicio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none shadow-sm transition-all"
                        />
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <LucideFilter className="w-5 h-5" />
                        <span className="font-medium">Filtros</span>
                    </button>
                </div>

                <button className="flex items-center space-x-2 px-6 py-2 bg-clinical-600 text-white rounded-xl hover:bg-clinical-700 transition-all shadow-lg shadow-clinical-200">
                    <LucidePlus className="w-5 h-5" />
                    <span className="font-bold">Nueva Cita</span>
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex space-x-6 h-full min-w-max">
                    {STAGES.map((stage) => (
                        <div
                            key={stage}
                            className="w-80 flex flex-col bg-gray-100/50 rounded-2xl p-4 space-y-4"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const appId = e.dataTransfer.getData('appointmentId');
                                if (appId) {
                                    updateAppointmentStatus(appId, stage);
                                }
                            }}
                        >
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center space-x-2">
                                    <h3 className="font-bold text-gray-700">{stage}</h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-400 shadow-sm border border-gray-100">
                                        {filteredAppointments.filter(a => a.status === stage).length}
                                    </span>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <LucideMoreVertical className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                {filteredAppointments.filter(a => a.status === stage).map(app => (
                                    <div
                                        key={app.id}
                                        draggable
                                        onDragStart={(e) => e.dataTransfer.setData('appointmentId', app.id)}
                                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded truncate max-w-[120px]">
                                                {app.serviceName}
                                            </span>
                                            <select
                                                value={app.status}
                                                onChange={(e) => updateAppointmentStatus(app.id, e.target.value)}
                                                className="text-[10px] border-none bg-transparent font-medium text-gray-400 focus:ring-0 cursor-pointer text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center space-x-2 mb-1">
                                            <LucideUser className="w-3 h-3 text-gray-400" />
                                            <h4 className="font-bold text-gray-900 group-hover:text-clinical-700 transition-colors">
                                                {app.patientName}
                                            </h4>
                                        </div>

                                        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                                            <LucideCalendar className="w-3 h-3" />
                                            <span>{app.date}</span>
                                            <LucideClock className="w-3 h-3 ml-2" />
                                            <span>{app.time}</span>
                                        </div>

                                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <img
                                                    src={`https://i.pravatar.cc/150?u=${app.doctorName}`}
                                                    className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-gray-100"
                                                    alt="Doctor"
                                                />
                                                <span className="text-xs text-gray-500 font-medium truncate max-w-[100px]">
                                                    {app.doctorName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
