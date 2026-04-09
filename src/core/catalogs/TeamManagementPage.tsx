import { useState } from 'react'
import { LucidePlus, LucideStethoscope, LucideX, LucideUser, LucideUsers2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { PhoneInput } from '../../components/PhoneInput'

export const TeamManagementPage = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [docForm, setDocForm] = useState({ name: '', specialty: '', email: '', phone: '' })

    const { data: myDoctors = [], isLoading } = useQuery({
        queryKey: ['doctors', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase.from('doctors').select('*').eq('clinica_id', currentUser.clinica_id);
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    const addDoctorMutation = useMutation({
        mutationFn: async (newDoc: any) => {
            const { data, error } = await supabase.from('doctors').insert([newDoc]).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', currentUser?.clinica_id] })
            setShowModal(false)
            setDocForm({ name: '', specialty: '', email: '', phone: '' })
        },
        onError: (error: any) => {
            console.error('Error adding doctor:', error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
        }
    })

    const handleSaveDoctor = () => {
        if (!docForm.name || !docForm.specialty || !currentUser?.clinica_id) return;
        addDoctorMutation.mutate({ ...docForm, clinica_id: currentUser.clinica_id });
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando equipo...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-clinical-500 to-clinical-700 rounded-2xl shadow-lg shadow-clinical-200">
                        <LucideUsers2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipo</h1>
                        <p className="text-sm text-gray-500">Doctores, especialistas y personal</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm font-medium"
                >
                    <LucidePlus className="w-4 h-4" />
                    <span>Nuevo Doctor</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myDoctors.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <LucideStethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin doctores registrados</h3>
                            <p className="text-sm text-gray-500">Agrega doctores y especialistas a tu equipo.</p>
                        </div>
                    )}
                    {myDoctors.map((doc: any) => (
                        <div key={doc.id} className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 hover:border-clinical-200 hover:bg-clinical-50/50 transition-all">
                            <div className="p-3 bg-clinical-50 text-clinical-600 rounded-lg">
                                <LucideUser className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{doc.name}</h4>
                                <p className="text-sm text-clinical-600 font-medium">{doc.specialty}</p>
                                <p className="text-xs text-gray-400 mt-2">{doc.email} • {doc.phone}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Agregar Doctor</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                <LucideX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                                <input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={docForm.specialty} onChange={e => setDocForm({ ...docForm, specialty: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={docForm.email} onChange={e => setDocForm({ ...docForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <PhoneInput
                                    value={docForm.phone}
                                    onChange={(v) => setDocForm({ ...docForm, phone: v })}
                                    size="sm"
                                    id="team-doctor-phone"
                                />
                            </div>
                            <button onClick={handleSaveDoctor} disabled={addDoctorMutation.isPending}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4 disabled:opacity-50 transition-colors">
                                {addDoctorMutation.isPending ? 'Guardando...' : 'Guardar Doctor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
