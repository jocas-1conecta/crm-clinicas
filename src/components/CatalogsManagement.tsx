import { useState } from 'react'
import { LucideBriefcaseMedical, LucidePlus, LucideStethoscope, LucideX } from 'lucide-react'
import { useStore } from '../store/useStore'

export const CatalogsManagement = () => {
    const { currentUser, doctors, services, addDoctor, addService } = useStore()
    const [activeTab, setActiveTab] = useState<'doctors' | 'services'>('doctors')
    const [showModal, setShowModal] = useState(false)

    // Form states
    const [docForm, setDocForm] = useState({ name: '', specialty: '', email: '', phone: '' })
    const [serviceForm, setServiceForm] = useState({ name: '', price: 0 })

    const myDoctors = doctors.filter(d => d.clinica_id === currentUser?.clinica_id)
    const myServices = services.filter(s => s.clinica_id === currentUser?.clinica_id)

    const handleSaveDoctor = () => {
        if (!docForm.name || !docForm.specialty) return;
        addDoctor({ ...docForm, clinica_id: currentUser?.clinica_id || '' })
        setShowModal(false)
        setDocForm({ name: '', specialty: '', email: '', phone: '' })
    }

    const handleSaveService = () => {
        if (!serviceForm.name || !serviceForm.price) return;
        addService({ ...serviceForm, clinica_id: currentUser?.clinica_id || '' })
        setShowModal(false)
        setServiceForm({ name: '', price: 0 })
    }

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
                        <LucideBriefcaseMedical className="w-5 h-5" />
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
                                        <p className="text-xs text-gray-400">Código: {svc.id}</p>
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
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={docForm.phone} onChange={e => setDocForm({ ...docForm, phone: e.target.value })} />
                                    </div>
                                    <button onClick={handleSaveDoctor} className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4">Guardar Doctor</button>
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
                                    <button onClick={handleSaveService} className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4">Guardar Servicio</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
