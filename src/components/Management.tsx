import React from 'react'
import { useStore } from '../store/useStore'
import { LucideStethoscope, LucideClipboardList, LucidePackage, LucidePlus, LucideMoreVertical, LucideMessageSquare } from 'lucide-react'

export const Management = () => {
    const { config } = useStore()

    const sections = [
        { name: 'Médicos', icon: LucideStethoscope, data: config.doctors, fields: ['name', 'specialty'] },
        { name: 'Servicios', icon: LucideClipboardList, data: config.services, fields: ['name', 'price'] },
        { name: 'Productos', icon: LucidePackage, data: config.products, fields: ['name', 'price'] },
        { name: 'Respuestas Rápidas', icon: LucideMessageSquare, data: config.quickResponses || [], fields: ['title', 'text'] },
    ]

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {sections.map((section) => (
                <div key={section.name} className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-clinical-100 rounded-xl">
                                <section.icon className="w-6 h-6 text-clinical-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">{section.name}</h3>
                        </div>
                        <button className="p-2 bg-clinical-600 text-white rounded-full hover:bg-clinical-700 transition-all shadow-md">
                            <LucidePlus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 flex-1 space-y-3">
                        {section.data.map((item: any) => (
                            <div key={item.id} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/30 flex items-center justify-between hover:bg-white hover:border-gray-200 transition-all group">
                                <div className="flex-1 mr-4">
                                    <p className="font-bold text-gray-800 text-sm">{item[section.fields[0]]}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                        {section.fields[1] === 'price'
                                            ? `$${item.price.toLocaleString()}`
                                            : item[section.fields[1]]}
                                    </p>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-gray-600">
                                    <LucideMoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
