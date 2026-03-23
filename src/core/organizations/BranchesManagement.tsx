import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LucideBuilding, LucideMapPin, LucidePlus, LucideUsers, LucideX, LucideGlobe } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const BranchesManagement = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', address: '', slug: '' })

    // Fetch branches from Supabase
    const { data: myBranches = [], isLoading, isError } = useQuery({
        queryKey: ['branches', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('clinica_id', currentUser.clinica_id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Fetch profiles to count staff per branch
    const { data: myTeam = [] } = useQuery({
        queryKey: ['team', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('sucursal_id')
                .eq('clinica_id', currentUser.clinica_id)
                .eq('role', 'Asesor_Sucursal');
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Mutation to add a new branch
    const addBranchMutation = useMutation({
        mutationFn: async (newBranch: { name: string, address: string, slug: string, clinica_id: string }) => {
            const { data, error } = await supabase
                .from('sucursales')
                .insert([newBranch])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches', currentUser?.clinica_id] });
            setShowModal(false);
            setFormData({ name: '', address: '', slug: '' });
        },
        onError: (error) => {
            console.error('Error adding branch:', error);
            alert('Error al crear la sucursal');
        }
    })

    const handleSave = () => {
        if (!formData.name || !formData.address || !currentUser?.clinica_id) return;
        addBranchMutation.mutate({
            name: formData.name,
            address: formData.address,
            slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            clinica_id: currentUser.clinica_id
        });
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando sucursales...</div>;
    if (isError) return <div className="p-8 text-center text-red-500">Error al cargar las sucursales.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mis Sucursales</h1>
                    <p className="text-gray-500">Gestiona las ubicaciones físicas de tu clínica.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                    <LucidePlus className="w-5 h-5" />
                    <span>Nueva Sucursal</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBranches.map((branch) => {
                    const staffCount = myTeam.filter(t => t.sucursal_id === branch.id).length
                    return (
                        <div key={branch.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <LucideBuilding className="w-6 h-6" />
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${branch.status === 'Activa' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {branch.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                            <div className="flex items-center text-gray-500 text-sm mb-1">
                                <LucideMapPin className="w-4 h-4 mr-1" />
                                {branch.address}
                            </div>
                            {branch.slug && (
                                <div className="flex items-center text-gray-400 text-xs mb-4">
                                    <LucideGlobe className="w-3 h-3 mr-1" />
                                    {branch.slug}
                                </div>
                            )}
                            {!branch.slug && <div className="mb-4" />}

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <LucideUsers className="w-4 h-4 mr-2" />
                                    <span>{staffCount} Asesores</span>
                                </div>
                                <button
                                    onClick={() => navigate(`/mis-sucursales/${branch.id}`)}
                                    className="text-clinical-600 text-sm font-medium hover:underline"
                                >
                                    Ver Detalles
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Nueva Sucursal</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <LucideX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Sucursal</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none"
                                    placeholder="Ej. Sede Norte"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const newName = e.target.value
                                        const autoSlug = newName
                                            .toLowerCase()
                                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                            .replace(/ñ/g, 'n')
                                            .replace(/[^a-z0-9\s-]/g, '')
                                            .replace(/\s+/g, '-')
                                            .replace(/-+/g, '-')
                                            .replace(/^-|-$/g, '')
                                        setFormData({ ...formData, name: newName, slug: autoSlug })
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none"
                                    placeholder="Ej. Calle 123 #45-67"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <LucideGlobe className="w-3.5 h-3.5 inline mr-1" />
                                    Slug (identificador)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none font-medium"
                                    placeholder="sede-norte (se auto-genera del nombre si lo dejas vacío)"
                                    value={formData.slug}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                        setFormData({ ...formData, slug: val })
                                    }}
                                />
                                <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones.</p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={addBranchMutation.isPending}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl transition-colors mt-4 disabled:opacity-50"
                            >
                                {addBranchMutation.isPending ? 'Guardando...' : 'Guardar Sucursal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
