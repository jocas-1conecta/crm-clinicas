import { useState } from 'react'
import { LucideBriefcase, LucidePlus, LucideStethoscope, LucideX, LucideUser } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { PhoneInput } from '../../components/PhoneInput'

export const CatalogsManagement = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'doctors' | 'services'>('doctors')
    const [showModal, setShowModal] = useState(false)

    // Form states
    const [docForm, setDocForm] = useState({ name: '', specialty: '', email: '', phone: '' })
    const [serviceForm, setServiceForm] = useState({ name: '', price: 0, scripts: '', supportMaterial: '' })

    // Fetch Doctors
    const { data: myDoctors = [], isLoading: isLoadingDocs } = useQuery({
        queryKey: ['doctors', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase.from('doctors').select('*').eq('clinica_id', currentUser.clinica_id);
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Fetch Services
    const { data: myServices = [], isLoading: isLoadingSvc } = useQuery({
        queryKey: ['services', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase.from('services').select('*').eq('clinica_id', currentUser.clinica_id);
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

    const addServiceMutation = useMutation({
        mutationFn: async (newSvc: any) => {
            const { data, error } = await supabase.from('services').insert([newSvc]).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services', currentUser?.clinica_id] })
            setShowModal(false)
            setServiceForm({ name: '', price: 0, scripts: '', supportMaterial: '' })
        },
        onError: (error: any) => {
            console.error('Error adding service:', error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
        }
    })

    const handleSaveDoctor = () => {
        if (!docForm.name || !docForm.specialty || !currentUser?.clinica_id) return;
        addDoctorMutation.mutate({ ...docForm, clinica_id: currentUser.clinica_id });
    }

    const handleSaveService = () => {
        if (!serviceForm.name || !serviceForm.price || !currentUser?.clinica_id) return;
        
        addServiceMutation.mutate({
            name: serviceForm.name,
            price: serviceForm.price,
            scripts: serviceForm.scripts.split('\n').filter(s => s.trim()),
            support_material: serviceForm.supportMaterial.split('\n').filter(s => s.trim()),
            clinica_id: currentUser.clinica_id
        });
    }

    if (isLoadingDocs || isLoadingSvc) return <div className="p-8 text-center text-gray-500">Cargando catálogos...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Catálogos</h1>
                    <p className="text-gray-500">Administra tus doctores y servicios ofrecidos.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                    <LucidePlus className="w-5 h-5" />
                    <span>{activeTab === 'doctors' ? 'Nuevo Doctor' : 'Nuevo Servicio'}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('doctors')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'doctors'
                            ? 'border-clinical-500 text-clinical-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <LucideStethoscope className="w-5 h-5" />
                        <span>Doctores y Especialistas</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'services'
                            ? 'border-clinical-500 text-clinical-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <LucideBriefcase className="w-5 h-5" />
                        <span>Servicios y Tratamientos</span>
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                {activeTab === 'doctors' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myDoctors.map(doc => (
                            <div key={doc.id} className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 hover:border-clinical-200 hover:bg-clinical-50/50 transition-all">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myServices.map(svc => (
                            <div key={svc.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-clinical-200 hover:bg-clinical-50/50 transition-all">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-3 h-3 rounded-full bg-${svc.color || 'blue'}-500`} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">{svc.name}</h4>
                                        <div className="flex space-x-2 mt-1">
                                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                {svc.scripts?.length || 0} Guiones
                                            </span>
                                            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">
                                                {svc.support_material?.length || 0} Materiales
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">
                                    ${svc.price.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {activeTab === 'doctors' ? 'Agregar Doctor' : 'Agregar Servicio'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <LucideX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'doctors' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={docForm.specialty} onChange={e => setDocForm({ ...docForm, specialty: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={docForm.email} onChange={e => setDocForm({ ...docForm, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <PhoneInput
                                            value={docForm.phone}
                                            onChange={(v) => setDocForm({ ...docForm, phone: v })}
                                            size="sm"
                                            id="catalog-doctor-phone"
                                        />
                                    </div>
                                    <button onClick={handleSaveDoctor} disabled={addDoctorMutation.isPending} className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4 disabled:opacity-50">
                                        {addDoctorMutation.isPending ? 'Guardando...' : 'Guardar Doctor'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                                        <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Guiones (Uno por línea)</label>
                                        <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none h-20"
                                            value={serviceForm.scripts} onChange={e => setServiceForm({ ...serviceForm, scripts: e.target.value })}
                                            placeholder="Ej: Hola, le contacto de parte de la clínica..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Material de Apoyo (URLs, uno por línea)</label>
                                        <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none h-20"
                                            value={serviceForm.supportMaterial} onChange={e => setServiceForm({ ...serviceForm, supportMaterial: e.target.value })}
                                            placeholder="Ej: https://youtube.com/..."
                                        />
                                    </div>
                                    <button onClick={handleSaveService} disabled={addServiceMutation.isPending} className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4 disabled:opacity-50">
                                        {addServiceMutation.isPending ? 'Guardando...' : 'Guardar Servicio'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
