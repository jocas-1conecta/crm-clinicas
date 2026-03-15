import { create } from 'zustand'
import { supabase } from '../services/supabase'

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
    tenant_id?: string; // Generic abstraction
    sucursal_id?: string;
    location_id?: string; // Generic abstraction
    clinica_slug?: string;
    tenant_slug?: string; // Generic abstraction
    active_modules?: string[];
}

export interface Organization {
    id: string;
    name: string;
    email_contacto: string;
    status: 'activa' | 'pendiente' | 'suspendida';
    plan: 'Free' | 'Pro' | 'Enterprise';
    createdAt: string;
}

export interface Clinic extends Organization {}

export interface Location {
    id: string;
    name: string;
    address: string;
    status: string;
    tenant_id: string;
}

export interface Branch extends Location {
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
    scripts?: string[];
    supportMaterial?: string[];
}

export interface Lead {
    id: string;
    name: string;
    status: 'Nuevo' | 'En validación' | 'Calificado' | 'Agendado' | 'Asistido/Cerrado';
    service: string;
    phone: string;
    email: string;
    assignedTo: string;
    createdAt: string;
    sucursal_id: string;
    documents?: Document[];
    source?: 'Bot WhatsApp' | 'Manual' | 'Web';
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

export interface Deal {
    id: string;
    title: string;
    estimatedValue: number;
    status: 'Nuevo negocio/oportunidad' | 'Contactado' | 'En validación/seguimiento' | 'Ganado' | 'Perdido';
    createdAt: string;
}

export interface ActivityTask {
    id: string;
    title: string;
    date: string;
    time?: string;
    status: 'Pendiente' | 'Realizada' | 'Reprogramada';
    relType: 'lead' | 'patient';
    relId: string;
    assignedTo: string;
    sucursal_id: string;
}

export interface Patient {
    id: string;
    name: string;
    age: number;
    lastVisit: string;
    status: string;
    tags?: string[];
    deals?: Deal[];
    assignedTo: string;
    sucursal_id: string;
    email?: string;
    phone?: string;
    createdAt?: string;
    assignedToName?: string; // Helper for display
}

interface StoreState {
    currentUser: User | null;

    // Actions
    setCurrentUser: (user: User | null) => void;
    logout: () => void;
}

export const useStore = create<StoreState>((set) => ({
    currentUser: null,

    setCurrentUser: (user) => set({ currentUser: user }),

    logout: async () => {
        await supabase.auth.signOut();
        set({ currentUser: null });
    }
}));
