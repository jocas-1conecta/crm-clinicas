import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LucidePlus, LucideBriefcase, LucideX, LucideSearch, LucideChevronRight, LucideTag, LucideMessageCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const ServicesManagementPage = () => {
    const { currentUser } = useStore()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [serviceForm, setServiceForm] = useState({ name: '', price: 0, description: '', keywords: '' })

    // Fetch Services with Q&A count
    const { data: myServices = [], isLoading } = useQuery({
        queryKey: ['services', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase
                .from('services')
                .select('*, service_knowledge(id)')
                .eq('clinica_id', currentUser.clinica_id)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
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
            setServiceForm({ name: '', price: 0, description: '', keywords: '' })
        },
        onError: (error: any) => {
            console.error('Error adding service:', error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
        }
    })

    const handleSaveService = () => {
        if (!serviceForm.name || !currentUser?.clinica_id) return;
        addServiceMutation.mutate({
            name: serviceForm.name,
            price: serviceForm.price,
            description: serviceForm.description || null,
            keywords: serviceForm.keywords
                ? serviceForm.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
                : [],
            scripts: [],
            support_material: [],
            clinica_id: currentUser.clinica_id,
        });
    }

    const filtered = myServices.filter((svc: any) =>
        svc.name.toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando servicios...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-clinical-500 to-clinical-700 rounded-2xl shadow-lg shadow-clinical-200">
                        <LucideBriefcase className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Servicios y Tratamientos</h1>
                        <p className="text-sm text-gray-500">Gestiona servicios, precios y guiones del chatbot</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm font-medium"
                >
                    <LucidePlus className="w-4 h-4" />
                    <span>Nuevo Servicio</span>
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar servicio..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent"
                />
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 && (
                    <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <LucideBriefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin servicios</h3>
                        <p className="text-sm text-gray-500">Agrega servicios y tratamientos para tu clínica.</p>
                    </div>
                )}
                {filtered.map((svc: any) => {
                    const qaCount = svc.service_knowledge?.length || 0
                    return (
                        <button
                            key={svc.id}
                            onClick={() => navigate(`/servicios/${svc.id}`)}
                            className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-clinical-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-bold text-gray-900 text-sm group-hover:text-clinical-700 transition-colors">{svc.name}</h3>
                                <LucideChevronRight className="w-4 h-4 text-gray-300 group-hover:text-clinical-500 transition-colors shrink-0 mt-0.5" />
                            </div>
                            {svc.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{svc.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(svc.keywords || []).slice(0, 3).map((kw: string, i: number) => (
                                    <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <LucideTag className="w-2.5 h-2.5" />
                                        {kw}
                                    </span>
                                ))}
                                {(svc.keywords?.length || 0) > 3 && (
                                    <span className="text-[10px] font-medium text-gray-400">+{svc.keywords.length - 3} más</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-900">${Number(svc.price).toLocaleString()}</span>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-semibold bg-clinical-50 text-clinical-600 px-2 py-1 rounded-lg border border-clinical-100 flex items-center gap-1">
                                        <LucideMessageCircle className="w-3 h-3" />
                                        {qaCount} Q&A
                                    </span>
                                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100">
                                        {svc.scripts?.length || 0} Guiones
                                    </span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* New Service Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Nuevo Servicio</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                <LucideX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
                                <input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    placeholder="Ej: Tratamiento de Tiroides" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                                <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm resize-none h-20"
                                    value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                                    placeholder="Breve descripción del servicio..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Palabras Clave (separadas por coma)</label>
                                <input type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 focus:border-transparent text-sm"
                                    value={serviceForm.keywords} onChange={e => setServiceForm({ ...serviceForm, keywords: e.target.value })}
                                    placeholder="hipotiroidismo, hashimoto, tsh, tiroides" />
                            </div>
                            <button onClick={handleSaveService} disabled={addServiceMutation.isPending}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl mt-4 disabled:opacity-50 transition-colors">
                                {addServiceMutation.isPending ? 'Guardando...' : 'Guardar Servicio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
