import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../services/supabase'
import { LucideRefreshCw } from 'lucide-react'

interface ServiceHealth {
    name: string
    status: 'online' | 'offline' | 'checking'
    responseMs?: number
}

const checkDatabaseHealth = async (): Promise<ServiceHealth> => {
    const start = performance.now()
    try {
        const { error } = await supabase.from('clinicas').select('id').limit(1)
        const responseMs = Math.round(performance.now() - start)
        return { name: 'Base de Datos', status: error ? 'offline' : 'online', responseMs }
    } catch {
        return { name: 'Base de Datos', status: 'offline' }
    }
}

const checkApiHealth = async (): Promise<ServiceHealth> => {
    const start = performance.now()
    try {
        // Check Supabase REST API by calling the health endpoint via an RPC or simple auth check
        const { error } = await supabase.auth.getSession()
        const responseMs = Math.round(performance.now() - start)
        return { name: 'API Gateway', status: error ? 'offline' : 'online', responseMs }
    } catch {
        return { name: 'API Gateway', status: 'offline' }
    }
}

const checkStorageHealth = async (): Promise<ServiceHealth> => {
    const start = performance.now()
    try {
        const { error } = await supabase.storage.listBuckets()
        const responseMs = Math.round(performance.now() - start)
        return { name: 'Storage', status: error ? 'offline' : 'online', responseMs }
    } catch {
        return { name: 'Storage', status: 'offline' }
    }
}

export const SystemStatus: React.FC = () => {
    const { data: services = [], isLoading, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['system-health'],
        queryFn: async () => {
            const results = await Promise.all([
                checkDatabaseHealth(),
                checkApiHealth(),
                checkStorageHealth(),
            ])
            return results
        },
        refetchInterval: 60000, // Auto-refresh every 60s
        staleTime: 30000,
    })

    const allOnline = services.every(s => s.status === 'online')
    const lastCheck = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">Estado del Sistema</h3>
                <button onClick={() => refetch()} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    title="Verificar ahora">
                    <LucideRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <p className="text-indigo-100 text-sm mb-6">
                {isLoading ? 'Verificando servicios...' : allOnline ? 'Todos los servicios operando normalmente.' : '⚠️ Algunos servicios presentan problemas.'}
            </p>

            <div className="space-y-4">
                {services.map(service => (
                    <div key={service.name} className="flex items-center justify-between text-sm">
                        <span>{service.name}</span>
                        <span className={`flex items-center ${service.status === 'online' ? 'text-emerald-300' : 'text-red-300'}`}>
                            {service.responseMs && (
                                <span className="text-[10px] text-white/40 mr-2">{service.responseMs}ms</span>
                            )}
                            <span className={`w-2 h-2 rounded-full mr-2 ${service.status === 'online' ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`}></span>
                            {service.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                ))}
            </div>

            {lastCheck && (
                <p className="text-[10px] text-white/30 mt-4 text-right">Última verificación: {lastCheck}</p>
            )}
        </div>
    )
}
