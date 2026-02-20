import { useState } from 'react'
import { LucideMail, LucideMoreVertical, LucidePlus, LucideSearch, LucideUser, LucideX } from 'lucide-react'
import { useStore } from '../store/useStore'

export const TeamManagement = () => {
    const { currentUser, team, branches, addTeamMember } = useStore()
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Asesor', sucursal_id: '' })

    // Filter team for current clinic
    const myTeam = team.filter(t => t.clinica_id === currentUser?.clinica_id)
    const myBranches = branches.filter(b => b.clinica_id === currentUser?.clinica_id)

    const handleSave = () => {
        if (!formData.name || !formData.email || !formData.sucursal_id) return;

        addTeamMember({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            sucursal_id: formData.sucursal_id,
            clinica_id: currentUser?.clinica_id || ''
        })
        setShowModal(false)
        setFormData({ name: '', email: '', role: 'Asesor', sucursal_id: '' })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mi Equipo</h1>
                    <p className="text-gray-500">Administra el talento humano de tu clínica.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative hidden md:block">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar miembro..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-clinical-500 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 bg-clinical-600 hover:bg-clinical-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                        <LucidePlus className="w-5 h-5" />
                        <span>Invitar Asesor</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium tracking-wider">
                            <th className="p-6">Nombre</th>
                            <th className="p-6">Email</th>
                            <th className="p-6">Rol</th>
                            <th className="p-6">Sucursal</th>
                            <th className="p-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {myTeam.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center space-x-3">
                                        <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} alt="" className="w-10 h-10 rounded-full" />
                                        <span className="font-medium text-gray-900">{member.name}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-sm text-gray-500">{member.email}</td>
                                <td className="p-6">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                        {member.role}
                                    </span>
                                </td>
                                <td className="p-6">
                                    {myBranches.find(b => b.id === member.sucursal_id)?.name || 'Sin Asignar'}
                                </td>
                                <td className="p-6 text-right">
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <LucideMoreVertical className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Invitar Miembro</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <LucideX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (Google)</label>
                                <div className="relative">
                                    <LucideMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:border-transparent outline-none"
                                        placeholder="usuario@gmail.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 outline-none"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="Asesor">Asesor</option>
                                        <option value="Gerente">Gerente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clinical-500 outline-none"
                                        value={formData.sucursal_id}
                                        onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                                    >
                                        <option value="">Seleccionar</option>
                                        {myBranches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white font-medium py-3 rounded-xl transition-colors mt-4"
                            >
                                Enviar Invitación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
