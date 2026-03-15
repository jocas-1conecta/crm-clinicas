import React from 'react'

export const SystemStatus: React.FC = () => {
    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Estado del Sistema</h3>
            <p className="text-indigo-100 text-sm mb-6">Todos los servicios operando normalmente.</p>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span>Base de Datos</span>
                    <span className="flex items-center text-emerald-300">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                        Online
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span>API Gateway</span>
                    <span className="flex items-center text-emerald-300">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                        Online
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span>Storage</span>
                    <span className="flex items-center text-emerald-300">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                        Online
                    </span>
                </div>
            </div>
        </div>
    )
}
