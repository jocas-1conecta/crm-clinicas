import { create } from 'zustand'
import { USERS, LEADS, PATIENTS, APPOINTMENTS, CHATS, CONFIG } from '../data/mockData'

interface Document {
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'asesora';
    avatar: string;
}

interface Lead {
    id: string;
    name: string;
    status: string;
    service: string;
    phone: string;
    email: string;
    assignedTo: string;
    createdAt: string;
    documents?: Document[];
}

interface Message {
    sender: 'lead' | 'asesora';
    text: string;
    time: string;
    type?: 'text' | 'file' | 'image';
    attachment?: {
        name: string;
        size: string;
        url: string;
    };
}

interface Appointment {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    specialty: string;
    serviceName: string;
    date: string;
    time: string;
    status: string;
    avatar: string;
}

interface Patient {
    id: string;
    name: string;
    age: number;
    lastVisit: string;
    condition: string;
    assignedTo: string;
}

interface StoreState {
    currentUser: User | null;
    leads: Lead[];
    patients: Patient[];
    appointments: Appointment[];
    chats: Record<string, Message[]>;
    config: any;

    // Actions
    login: (email: string) => boolean;
    logout: () => void;
    updateLeadStatus: (leadId: string, newStatus: string) => void;
    addMessage: (leadId: string, message: Message) => void;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'assignedTo'>) => void;
    addDocument: (leadId: string, document: Document) => void;
    importLeads: () => void;
    importPatients: () => void;
    updateAppointmentStatus: (id: string, newStatus: string) => void;
}

export const useStore = create<StoreState>((set) => ({
    currentUser: null,
    leads: LEADS,
    patients: PATIENTS.map(p => ({ ...p, assignedTo: p.assignedTo || 'u1' })), // Ensure assignedTo exists
    appointments: APPOINTMENTS,
    chats: CHATS,
    config: CONFIG,

    login: (email: string) => {
        const user = USERS.find(u => u.email === email);
        if (user) {
            set({ currentUser: user as User });
            return true;
        }
        return false;
    },

    logout: () => set({ currentUser: null }),

    updateLeadStatus: (leadId, newStatus) => set((state) => ({
        leads: state.leads.map(lead => lead.id === leadId ? { ...lead, status: newStatus } : lead)
    })),

    addMessage: (leadId, message) => set((state) => ({
        chats: {
            ...state.chats,
            [leadId]: [...(state.chats[leadId] || []), message]
        }
    })),

    addDocument: (leadId, document) => set((state) => ({
        leads: state.leads.map(lead =>
            lead.id === leadId
                ? { ...lead, documents: [...(lead.documents || []), document] }
                : lead
        )
    })),

    addLead: (leadData) => set((state) => {
        const advisors = USERS.filter(u => u.role === 'asesora');
        const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];
        const newLead: Lead = {
            ...leadData,
            id: `l${state.leads.length + 1}`,
            createdAt: new Date().toISOString(),
            assignedTo: randomAdvisor.id,
            documents: []
        };
        return { leads: [newLead, ...state.leads] };
    }),

    importLeads: () => set((state) => {
        const newLeads = Array.from({ length: 5 }).map((_, i) => ({
            id: `l-imp-${state.leads.length + i}`,
            name: `Lead Importado ${state.leads.length + i}`,
            status: 'Nuevo',
            service: 'Odontología',
            phone: '+57 300 000 0000',
            email: 'import@example.com',
            assignedTo: USERS.filter(u => u.role === 'asesora')[Math.floor(Math.random() * 3)].id,
            createdAt: new Date().toISOString(),
            documents: []
        }));
        return { leads: [...newLeads, ...state.leads] };
    }),

    importPatients: () => set((state) => {
        const newPatients = Array.from({ length: 5 }).map((_, i) => ({
            id: `p-imp-${state.patients.length + i}`,
            name: `Paciente Importado ${state.patients.length + i}`,
            age: 20 + Math.floor(Math.random() * 40),
            lastVisit: new Date().toISOString().split('T')[0],
            condition: 'Control General',
            assignedTo: state.currentUser?.id || 'u1'
        }));
        return { patients: [...newPatients, ...state.patients] };
    }),

    updateAppointmentStatus: (id: string, newStatus: string) => set((state) => ({
        appointments: state.appointments.map(app => app.id === id ? { ...app, status: newStatus } : app)
    }))
}));
