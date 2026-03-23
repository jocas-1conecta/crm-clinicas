import React, { useState, useMemo } from 'react'
import { LucideMail, LucideMoreVertical, LucidePlus, LucideSearch, LucideUser, LucideX, LucidePower } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export const TeamManagement: React.FC = () => {
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [invitationLink, setInvitationLink] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Asesor_Sucursal', sucursal_id: '' })

    // Fetch team (profiles for this clinic)
    const { data: myTeam = [], isLoading: isLoadingTeam } = useQuery({
        queryKey: ['team', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('clinica_id', currentUser.clinica_id)
                .neq('role', 'Super_Admin');
            if (error) throw error;
            // Admin_Clinica only sees members from their own sucursal
            if (currentUser.role === 'Admin_Clinica' && currentUser.sucursal_id) {
                return data.filter((m: any) => m.sucursal_id === currentUser.sucursal_id);
            }
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Fetch branches to resolve sucursal_id names
    const { data: myBranches = [] } = useQuery({
        queryKey: ['branches', currentUser?.clinica_id],
        queryFn: async () => {
            if (!currentUser?.clinica_id) return [];
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('clinica_id', currentUser.clinica_id);
            if (error) throw error;
            return data;
        },
        enabled: !!currentUser?.clinica_id,
    })

    const filteredTeam = useMemo(() => {
        return myTeam.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            member.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [myTeam, searchTerm])

    const inviteMutation = useMutation({
        mutationFn: async () => {
            if (!currentUser?.clinica_id || !currentUser?.id) throw new Error("Missing workspace context");
            
            const { data, error } = await supabase
                .from('team_invitations')
                .insert({
                    clinica_id: currentUser.clinica_id,
                    sucursal_id: formData.sucursal_id,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            setShowModal(false)
            // Construct the join link using window location
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/join?token=${data.token}`;
            setInvitationLink(link);
            setSuccessMsg(`¡Invitación generada para ${formData.email}! Comparte el enlace seguro con ellos.`);
            setFormData({ name: '', email: '', role: 'Asesor_Sucursal', sucursal_id: '' })
        },
        onError: (err: any) => {
            setSuccessMsg(`Error: ${err.message || 'No se pudo crear la invitación'}`);
        }
    })

    const handleSave = () => {
        if (!formData.name || !formData.email || !formData.sucursal_id) return;
        inviteMutation.mutate();
    }

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string, newStatus: boolean }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: newStatus })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team', currentUser?.clinica_id] });
        }
    })

    const changeRoleMutation = useMutation({
        mutationFn: async ({ id, newRole }: { id: string, newRole: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team', currentUser?.clinica_id] });
            setSuccessMsg('Rol actualizado correctamente');
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    })

    if (currentUser?.role !== 'Super_Admin' && currentUser?.role !== 'Admin_Clinica') {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                <p>No tienes permisos suficientes para visualizar el equipo.</p>
            </div>
        )
    }

    if (isLoadingTeam) return <div className="p-8 text-center text-gray-500">Cargando equipo...</div>;

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
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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

            {successMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex flex-col space-y-2 border border-emerald-100 animate-in fade-in">
                    <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium">{successMsg}</p>
                    </div>
                    {invitationLink && (
                        <div className="mt-2 bg-white border border-emerald-200 p-3 rounded-lg flex items-center justify-between shadow-sm">
                            <span className="text-sm font-mono text-gray-800 break-all">{invitationLink}</span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(invitationLink);
                                    setSuccessMsg("¡Enlace copiado al portapapeles!");
                                    setTimeout(() => setSuccessMsg(""), 3000);
                                    setInvitationLink("");
                                }}
                                className="ml-4 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0"
                            >
                                Copiar Enlace
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium tracking-wider">
                            <th className="p-6">Nombre</th>
                            <th className="p-6">Email</th>
                            <th className="p-6">Rol</th>
                            <th className="p-6">Estado</th>
                            <th className="p-6">Sucursal</th>
                            <th className="p-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTeam.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center space-x-3">
                                        <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name}`} alt="" className="w-10 h-10 rounded-full" />
                                        <span className="font-medium text-gray-900">{member.name}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-sm text-gray-500">{member.email}</td>
                                <td className="p-6">
                                    {currentUser?.role === 'Super_Admin' ? (
                                        <select
                                            value={member.role}
                                            onChange={(e) => {
                                                if (confirm(`¿Cambiar el rol de ${member.name} a ${e.target.value === 'Admin_Clinica' ? 'Gerente de Sucursal' : 'Asesor de Sucursal'}?`)) {
                                                    changeRoleMutation.mutate({ id: member.id, newRole: e.target.value });
                                                }
                                            }}
                                            className="text-xs font-medium rounded-lg px-2 py-1 border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-clinical-500 outline-none cursor-pointer"
                                            disabled={changeRoleMutation.isPending}
                                        >
                                            <option value="Asesor_Sucursal">Asesor de Sucursal</option>
                                            <option value="Admin_Clinica">Gerente de Sucursal</option>
                                        </select>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                            {member.role === 'Admin_Clinica' ? 'Gerente de Sucursal' : 'Asesor de Sucursal'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-6">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${member.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {member.is_active !== false ? 'Activo' : 'Suspendido'}
                                    </span>
                                </td>
                                <td className="p-6">
                                    {myBranches.find(b => b.id === member.sucursal_id)?.name || 'Sin Asignar'}
                                </td>
                                <td className="p-6 text-right">
                                    <button 
                                        onClick={() => toggleStatusMutation.mutate({ id: member.id, newStatus: member.is_active === false ? true : false })}
                                        className={`transition-colors p-2 rounded-lg ${member.is_active !== false ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                        title={member.is_active !== false ? "Suspender Acceso" : "Restaurar Acceso"}
                                        disabled={toggleStatusMutation.isPending}
                                    >
                                        <LucidePower className="w-5 h-5" />
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
                                        <option value="Asesor_Sucursal">Asesor de Sucursal</option>
                                        {currentUser?.role === 'Super_Admin' && (
                                            <option value="Admin_Clinica">Gerente de Sucursal</option>
                                        )}
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
                                disabled={inviteMutation.isPending}
                                className="w-full bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-4"
                            >
                                {inviteMutation.isPending ? 'Generando Enlace...' : 'Generar Enlace Seguro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
