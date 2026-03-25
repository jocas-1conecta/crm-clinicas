import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  LucideMessageCircle,
  LucideBrain,
  LucideMapPin,
  LucideSparkles,
  LucideBot,
} from 'lucide-react'
import { ChatbotTestChat } from './ChatbotTestChat'
import { ChatbotPersonality } from './ChatbotPersonality'
import { KnowledgeBaseManager } from './KnowledgeBaseManager'
import { BranchInfoManager } from './BranchInfoManager'

type TabId = 'chat' | 'knowledge' | 'branches' | 'personality'

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'chat', label: 'Chat de Prueba', icon: LucideMessageCircle, description: 'Conversa con tu bot' },
  { id: 'knowledge', label: 'Base de Conocimiento', icon: LucideBrain, description: 'Información de la empresa' },
  { id: 'branches', label: 'Info Sucursales', icon: LucideMapPin, description: 'Datos por ubicación' },
  { id: 'personality', label: 'Personalidad', icon: LucideSparkles, description: 'Tono y comportamiento' },
]

export const ChatbotModule: React.FC = () => {
  const { currentUser } = useStore()
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  if (!currentUser?.clinica_id) {
    return <div className="p-8 text-center text-gray-500">No se encontró la clínica.</div>
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-clinical-500 to-clinical-700 rounded-2xl shadow-lg shadow-clinical-200">
            <LucideBot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Chatbot AI</h1>
            <p className="text-sm text-gray-500">Asistente virtual de atención al cliente</p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
          🧪 Modo Test
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
                  : 'bg-transparent text-gray-500 border-transparent hover:bg-white/60 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-4.5 h-4.5 ${isActive ? 'text-clinical-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' && <ChatbotTestChat clinicaId={currentUser.clinica_id} />}
        {activeTab === 'knowledge' && <KnowledgeBaseManager clinicaId={currentUser.clinica_id} />}
        {activeTab === 'branches' && <BranchInfoManager clinicaId={currentUser.clinica_id} />}
        {activeTab === 'personality' && <ChatbotPersonality clinicaId={currentUser.clinica_id} />}
      </div>
    </div>
  )
}
