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
    role: 'Platform_Owner' | 'Super_Admin' | 'Admin_Clinica' | 'Asesor_Sucursal';
    avatarUrl: string;
    avatarThumbUrl: string;
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
    status?: string; // Legacy fallback, source of truth is stage_id
    service: string;
    phone: string;
    email: string;
    assigned_to?: string;
    created_at: string;
    sucursal_id: string;
    documents?: Document[];
    source?: 'Bot WhatsApp' | 'Manual' | 'Web';
    // Pipeline fields
    stage_id?: string;
    substage_id?: string;
    stage_entered_at?: string;
    closed_at?: string;
    sale_value?: number;
    lost_reason?: string;
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
    patient_name: string;
    patient_id: string;
    doctor_name: string;
    doctor_id?: string;
    specialty: string;
    service_name: string;
    service_id?: string;
    appointment_date: string;
    appointment_time: string;
    phone?: string;
    status?: string; // Legacy fallback
    sucursal_id: string;
    assigned_to?: string;
    // Pipeline fields
    stage_id?: string;
    substage_id?: string;
    stage_entered_at?: string;
    closed_at?: string;
    closed_by?: string;
}

export interface Deal {
    id: string;
    title: string;
    estimated_value: number;
    status?: string; // Legacy fallback
    created_at: string;
    patient_id?: string;
    // Pipeline fields
    stage_id?: string;
    substage_id?: string;
    stage_entered_at?: string;
    closed_at?: string;
    closed_by?: string;
}

export type TaskCategory = 'llamada' | 'mensaje' | 'reunion' | 'cotizacion' | 'otro';
export type TaskPriority = 'alta' | 'normal' | 'baja';

export interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
    uploaded_by?: string;
    created_at?: string;
}

export interface CrmTask {
    id: string;
    title: string;
    description?: string;
    task_type: TaskCategory;
    priority: TaskPriority;
    due_date: string;
    is_completed: boolean;
    completed_at?: string;
    lead_id?: string;
    patient_id?: string;
    assigned_to?: string;
    assigned_to_name?: string; // Joined from profiles, not in DB
    sucursal_id?: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
    extra_fields?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    attachments?: TaskAttachment[];
}

// Legacy alias for backwards compatibility
export type ActivityTask = CrmTask;

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
