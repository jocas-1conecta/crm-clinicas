import React from 'react'

interface AdminActivityFeedProps {
    clinics: any[]
}

export const AdminActivityFeed: React.FC<AdminActivityFeedProps> = ({ clinics }) => {
    return (
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente de la Plataforma</h3>
            <div className="space-y-6">
                {clinics.slice(0, 3).map((clinic: any) => (
                    <div key={clinic.id} className="flex items-start space-x-4">
                        <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                        <div>
                            <p className="text-sm text-gray-900 font-medium">Clínica registrada: {clinic.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(clinic.created_at).toLocaleDateString()} • Plan {clinic.plan}</p>
                        </div>
                    </div>
                ))}
                {clinics.length === 0 && (
                    <p className="text-sm text-gray-500">No hay actividad reciente.</p>
                )}
            </div>
        </div>
    )
}
