import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useStore } from '../../store/useStore'
import {
    LucideArrowLeft,
    LucideBuilding,
    LucideSave,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideMapPin,
    LucideGlobe,
    LucideUsers,
    LucideShield,
    LucideUser,
    LucideMail,
    LucideLoader2,
    LucidePower,
} from 'lucide-react'

export const BranchDetail: React.FC = () => {
    const { branchId } = useParams<{ branchId: string }>()
    const navigate = useNavigate()
    const { currentUser } = useStore()
    const queryClient = useQueryClient()
    const [successMsg, setSuccessMsg] = useState('')

    // Fetch branch
    const { data: branch, isLoading, isError } = useQuery({
        queryKey: ['branch_detail', branchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('id', branchId!)
                .single()
            if (error) throw error
            return data
        },
        enabled: !!branchId,
    })

    // Fetch team members for this branch
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['branch_team', branchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, role, is_active, avatar_url')
                .eq('sucursal_id', branchId!)
                .neq('role', 'Super_Admin')
                .order('role', { ascending: true })
            if (error) throw error
            return data
        },
        enabled: !!branchId,
    })

    // Fetch all profiles from this clinic who could be admins
    const { data: potentialAdmins = [] } = useQuery({
        queryKey: ['potential_admins', currentUser?.clinica_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, role, sucursal_id')
                .eq('clinica_id', currentUser!.clinica_id)
                .in('role', ['Admin_Clinica', 'Asesor_Sucursal'])
                .eq('is_active', true)
            if (error) throw error
            return data
        },
        enabled: !!currentUser?.clinica_id,
    })

    // Form state
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [slug, setSlug] = useState('')
    const [status, setStatus] = useState('Activa')
    const [adminId, setAdminId] = useState<string>('')

    useEffect(() => {
        if (branch) {
            setName(branch.name || '')
            setAddress(branch.address || '')
            setSlug(branch.slug || '')
            setStatus(branch.status || 'Activa')
        }
    }, [branch])

    // Find current admin for this branch
    useEffect(() => {
        const admin = teamMembers.find((m: any) => m.role === 'Admin_Clinica')
        if (admin) setAdminId(admin.id)
    }, [teamMembers])

    // Update branch mutation
    const updateMutation = useMutation({
        mutationFn: async (updates: { name: string; address: string; slug: string; status: string }) => {
            const { data, error } = await supabase
                .from('sucursales')
                .update(updates)
                .eq('id', branchId!)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (updatedData) => {
            queryClient.setQueryData(['branch_detail', branchId], updatedData)
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            setSuccessMsg('Sucursal actualizada correctamente')
            setTimeout(() => setSuccessMsg(''), 4000)
        },
    })

    // Assign admin mutation
    const assignAdminMutation = useMutation({
        mutationFn: async (userId: string) => {
            // Remove Admin_Clinica role from previous admin of this branch
            const currentAdmin = teamMembers.find((m: any) => m.role === 'Admin_Clinica')
            if (currentAdmin && currentAdmin.id !== userId) {
                await supabase
                    .from('profiles')
                    .update({ role: 'Asesor_Sucursal' })
                    .eq('id', currentAdmin.id)
            }

            // Assign Admin_Clinica role and branch to new admin
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'Admin_Clinica', sucursal_id: branchId! })
                .eq('id', userId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch_team', branchId] })
            queryClient.invalidateQueries({ queryKey: ['potential_admins'] })
            setSuccessMsg('Administrador de sucursal asignado')
            setTimeout(() => setSuccessMsg(''), 4000)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate({ name, address, slug, status })
    }

    const handleAdminAssign = (userId: string) => {
        if (!userId) return
        if (!confirm('¿Estás seguro de asignar este usuario como administrador de esta sucursal?')) return
        setAdminId(userId)
        assignAdminMutation.mutate(userId)
    }

    const isPristine =
        name === (branch?.name || '') &&
        address === (branch?.address || '') &&
        slug === (branch?.slug || '') &&
        status === (branch?.status || 'Activa')

    if (currentUser?.role !== 'Super_Admin') {
        return <div className="text-red-500 p-8">No tienes permisos para ver esta sección.</div>
    }

    if (isLoading)
        return (
            <div className="flex items-center justify-center h-64">
                <LucideLoader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        )
    if (isError) return <div className="text-red-500 p-8">Error al cargar la sucursal.</div>

    const currentAdmin = teamMembers.find((m: any) => m.role === 'Admin_Clinica')
    const advisors = teamMembers.filter((m: any) => m.role === 'Asesor_Sucursal')

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate('/mis-sucursales')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
                >
                    <LucideArrowLeft className="w-4 h-4" />
                    Volver a Sucursales
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <LucideBuilding className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{branch?.name}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            <LucideMapPin className="w-3.5 h-3.5" />
                            {branch?.address}
                        </p>
                    </div>
                    <span
                        className={`ml-auto px-3 py-1 text-xs font-medium rounded-lg ${
                            branch?.status === 'Activa'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        {branch?.status}
                    </span>
                </div>
            </div>

            {/* Success message */}
            {successMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-3 border border-emerald-100">
                    <LucideCheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {/* Error message */}
            {(updateMutation.isError || assignAdminMutation.isError) && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center space-x-3 border border-red-100">
                    <LucideAlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">
                        {updateMutation.error?.message || assignAdminMutation.error?.message}
                    </p>
                </div>
            )}

            {/* Info General Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <LucideBuilding className="w-4 h-4 text-blue-500" />
                    Información General
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Sede Principal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Av. 4 Norte #23-45"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <LucideGlobe className="w-3.5 h-3.5 inline mr-1" />
                                Slug (identificador)
                            </label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                    setSlug(val)
                                }}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium"
                                placeholder="sede-norte"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Identificador único para esta sucursal. Solo letras, números y guiones.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="Activa">Activa</option>
                                <option value="Inactiva">Inactiva</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending || isPristine}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                                isPristine
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            }`}
                        >
                            <LucideSave className="w-4 h-4" />
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Admin Assignment Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <LucideShield className="w-4 h-4 text-amber-500" />
                    Administrador de Sucursal
                </h2>

                {currentAdmin ? (
                    <div className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                            {currentAdmin.avatar_url ? (
                                <img src={currentAdmin.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                currentAdmin.name?.charAt(0)?.toUpperCase() || 'A'
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{currentAdmin.name}</p>
                            <p className="text-xs text-gray-500">{currentAdmin.email}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg">
                            Admin
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 mb-3">No hay administrador asignado a esta sucursal.</p>
                )}

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {currentAdmin ? 'Cambiar administrador' : 'Asignar administrador'}
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={adminId}
                            onChange={(e) => setAdminId(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        >
                            <option value="">Seleccionar usuario...</option>
                            {potentialAdmins.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.email}) — {p.role === 'Admin_Clinica' ? 'Admin actual' : 'Asesor'}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleAdminAssign(adminId)}
                            disabled={!adminId || adminId === currentAdmin?.id || assignAdminMutation.isPending}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                                adminId && adminId !== currentAdmin?.id
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {assignAdminMutation.isPending ? (
                                <LucideLoader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Asignar'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Team Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <LucideUsers className="w-4 h-4 text-clinical-500" />
                        Equipo ({advisors.length} asesores)
                    </h2>
                    <Link
                        to="/gestion"
                        className="text-xs text-clinical-600 hover:underline font-medium"
                    >
                        Ir a Gestión de Equipo →
                    </Link>
                </div>

                {advisors.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                        No hay asesores asignados a esta sucursal.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {advisors.map((member: any) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold shrink-0">
                                    {member.avatar_url ? (
                                        <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        member.name?.charAt(0)?.toUpperCase() || '?'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                </div>
                                <span
                                    className={`px-2 py-1 text-[10px] font-medium rounded-lg ${
                                        member.is_active
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-red-50 text-red-500'
                                    }`}
                                >
                                    {member.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
