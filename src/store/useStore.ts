import { create } from 'zustand'
import { LEADS, PATIENTS, APPOINTMENTS, CHATS, CONFIG, CLINICS, BRANCHES, TEAM_MEMBERS, DOCTORS, SERVICES } from '../data/mockData'

interface Document {
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal';
    avatarUrl: string;
    clinica_id?: string;
    sucursal_id?: string;
}

export interface Clinic {
    id: string;
    name: string;
    email_contacto: string;
    status: 'activa' | 'pendiente' | 'suspendida';
    plan: 'Free' | 'Pro' | 'Enterprise';
    createdAt: string;
}

export interface Branch {
    id: string;
    name: string;
    address: string;
    status: string;
    clinica_id: string;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    sucursal_id: string;
    clinica_id: string;
    avatar?: string;
}

export interface Doctor {
    id: string;
    name: string;
    specialty: string;
    clinica_id: string;
    phone?: string;
    email?: string;
}

export interface Service {
    id: string;
    name: string;
    price: number;
    color?: string;
    clinica_id: string;
}

export interface Lead {
    id: string;
    name: string;
    status: 'Nuevo' | 'Contactado' | 'Cita Agendada' | 'Perdido';
    service: string;
    phone: string;
    email: string;
    assignedTo: string;
    createdAt: string;
    sucursal_id: string;
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

export interface Appointment {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    doctorId?: string;
    specialty: string;
    serviceName: string;
    serviceId?: string;
    date: string;
    time: string;
    status: 'Por Confirmar' | 'Confirmada' | 'Atendida' | 'Cancelada';
    avatar: string;
    sucursal_id: string;
}

export interface Patient {
    id: string;
    name: string;
    age: number;
    lastVisit: string;
    condition: string;
    assignedTo: string;
    sucursal_id: string;
    email?: string;
    phone?: string;
    createdAt?: string;
    assignedToName?: string; // Helper for display
}

interface StoreState {
    currentUser: User | null;
    leads: Lead[];
    patients: Patient[];
    appointments: Appointment[];
    chats: Record<string, Message[]>;
    clinics: Clinic[];
    branches: Branch[];
    team: TeamMember[];
    doctors: Doctor[];
    services: Service[];
    config: any;

    // Actions
    loginAs: (role: 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal') => void;
    logout: () => void;

    // CRM Actions
    updateLeadStatus: (leadId: string, newStatus: string) => void;
    moveLead: (id: string, newStatus: Lead['status']) => void;
    convertLeadToPatient: (leadId: string) => void;

    addMessage: (leadId: string, message: Message) => void;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'assignedTo'>) => void;
    addDocument: (leadId: string, document: Document) => void;

    importLeads: () => void;
    importPatients: () => void;

    updateAppointmentStatus: (id: string, newStatus: string) => void; // Legacy generic
    moveAppointment: (id: string, newStatus: Appointment['status']) => void;

    // Super Admin Actions
    updateClinicStatus: (id: string, newStatus: string) => void;

    // Clinic Admin Actions
    addBranch: (branch: Omit<Branch, 'id' | 'status'>) => void;
    addTeamMember: (member: Omit<TeamMember, 'id' | 'avatar'>) => void;
    addDoctor: (doctor: Omit<Doctor, 'id'>) => void;
    addService: (service: Omit<Service, 'id'>) => void;
}

// Mock Users Data
const MOCK_USERS: Record<string, User> = {
    'Super_Admin': {
        id: 'sa-001',
        name: 'Roberto Super Admin',
        email: 'superadmin@platform.com',
        role: 'Super_Admin',
        avatarUrl: 'https://i.pravatar.cc/150?u=superadmin'
    },
    'Admin_Clinica': {
        id: 'ac-001',
        name: 'Dr. Alejandro Rangel',
        email: 'director@clinicarangel.com',
        role: 'Admin_Clinica',
        avatarUrl: 'https://i.pravatar.cc/150?u=director',
        clinica_id: 'C-001'
    },
    'Asesor_Sucursal': {
        id: 'as-001',
        name: 'Laura Recepción',
        email: 'laura@clinicarangel.com',
        role: 'Asesor_Sucursal',
        avatarUrl: 'https://i.pravatar.cc/150?u=laura',
        clinica_id: 'C-001',
        sucursal_id: 'S-001'
    }
};

export const useStore = create<StoreState>((set) => ({
    currentUser: null,
    leads: LEADS as Lead[],
    patients: PATIENTS.map(p => ({ ...p, assignedTo: p.assignedTo || 'u1' })) as Patient[],
    appointments: APPOINTMENTS as Appointment[],
    chats: CHATS,
    clinics: CLINICS,
    branches: BRANCHES,
    team: TEAM_MEMBERS,
    doctors: DOCTORS,
    services: SERVICES,
    config: CONFIG,

    loginAs: (role) => {
        const user = MOCK_USERS[role];
        if (user) {
            set({ currentUser: user });
        }
    },

    logout: () => set({ currentUser: null }),

    updateLeadStatus: (leadId, newStatus) => set((state) => ({
        leads: state.leads.map(lead => lead.id === leadId ? { ...lead, status: newStatus as any } : lead)
    })),

    moveLead: (id, newStatus) => set((state) => ({
        leads: state.leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead)
    })),

    convertLeadToPatient: (leadId) => set((state) => {
        const lead = state.leads.find(l => l.id === leadId);
        if (!lead) return {};

        const newPatient: Patient = {
            id: `p-${Date.now()}`,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            age: 0, // Placeholder
            lastVisit: new Date().toISOString().split('T')[0],
            condition: 'Evaluación Inicial',
            assignedTo: state.currentUser?.id || lead.assignedTo,
            sucursal_id: lead.sucursal_id,
            createdAt: new Date().toISOString()
        };

        // Remove lead and add patient
        return {
            leads: state.leads.filter(l => l.id !== leadId),
            patients: [newPatient, ...state.patients]
        };
    }),

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
        const newLead: Lead = {
            ...leadData,
            id: `l${state.leads.length + 1}`,
            status: 'Nuevo',
            createdAt: new Date().toISOString(),
            assignedTo: state.currentUser?.id || 'as-001',
            sucursal_id: state.currentUser?.sucursal_id || 'S-001',
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
            assignedTo: state.currentUser?.id || 'as-001',
            sucursal_id: state.currentUser?.sucursal_id || 'S-001',
            createdAt: new Date().toISOString(),
            documents: []
        }));
        return { leads: [...newLeads, ...state.leads] as Lead[] };
    }),

    importPatients: () => set((state) => {
        const newPatients = Array.from({ length: 5 }).map((_, i) => ({
            id: `p-imp-${state.patients.length + i}`,
            name: `Paciente Importado ${state.patients.length + i}`,
            age: 20 + Math.floor(Math.random() * 40),
            lastVisit: new Date().toISOString().split('T')[0],
            condition: 'Control General',
            assignedTo: state.currentUser?.id || 'as-001',
            sucursal_id: state.currentUser?.sucursal_id || 'S-001',
            createdAt: new Date().toISOString()
        }));
        return { patients: [...newPatients, ...state.patients] as Patient[] };
    }),

    updateAppointmentStatus: (id: string, newStatus: string) => set((state) => ({
        appointments: state.appointments.map(app => app.id === id ? { ...app, status: newStatus as any } : app)
    })),

    moveAppointment: (id, newStatus) => set((state) => ({
        appointments: state.appointments.map(app => app.id === id ? { ...app, status: newStatus } : app)
    })),

    updateClinicStatus: (id: string, newStatus: string) => set((state) => ({
        clinics: state.clinics.map(clinic =>
            clinic.id === id ? { ...clinic, status: newStatus as any } : clinic
        )
    })),

    // Clinic Admin Actions
    addBranch: (branchData) => set((state) => ({
        branches: [...state.branches, { ...branchData, id: `b${Date.now()}`, status: 'Activa' }]
    })),

    addTeamMember: (memberData) => set((state) => ({
        team: [...state.team, { ...memberData, id: `tm${Date.now()}`, avatar: `https://i.pravatar.cc/150?u=${memberData.email}` }]
    })),

    addDoctor: (doctorData) => set((state) => ({
        doctors: [...state.doctors, { ...doctorData, id: `d${Date.now()}` }]
    })),

    addService: (serviceData) => set((state) => ({
        services: [...state.services, { ...serviceData, id: `s${Date.now()}` }]
    }))
}));
