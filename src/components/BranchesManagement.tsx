import { useState } from 'react'
import { LucideBuilding, LucideMapPin, LucidePlus, LucideUsers, LucideX } from 'lucide-react'
import { useStore } from '../store/useStore'

export const BranchesManagement = () => {
    const { currentUser, branches, team, addBranch } = useStore()
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', address: '' })

    // Filter branches for current clinic
    const myBranches = branches.filter(b => b.clinica_id === currentUser?.clinica_id)

    const handleSave = () => {
        if (!formData.name || !formData.address) return;

        addBranch({
            name: formData.name,
            address: formData.address,
            clinica_id: currentUser?.clinica_id || ''
        })
        setShowModal(false)
        setFormData({ name: '', address: '' })
    }

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
                    const staffCount = team.filter(t => t.sucursal_id === branch.id).length
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
                            <div className="flex items-center text-gray-500 text-sm mb-4">
                                <LucideMapPin className="w-4 h-4 mr-1" />
                                {branch.address}
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <LucideUsers className="w-4 h-4 mr-2" />
                                    <span>{staffCount} Asesores</span>
                                </div>
                                <button className="text-clinical-600 text-sm font-medium hover:underline">
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
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

                            <button
                                onClick={handleSave}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl transition-colors mt-4"
                            >
                                Guardar Sucursal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
