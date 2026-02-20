export const USERS = [
    { id: 'u1', name: 'Admin User', email: 'admin@clinica.com', role: 'admin', avatar: 'https://i.pravatar.cc/150?u=admin' },
    { id: 'u2', name: 'Laura Asesora', email: 'asesora1@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=laura' },
    { id: 'u3', name: 'Sofia Asesora', email: 'asesora2@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=sofia' },
    { id: 'u4', name: 'Elena Asesora', email: 'asesora3@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=elena' },
];

export const LEADS = [
    { id: 'l1', name: 'Carlos Mendoza', status: 'Nuevo', service: 'Odontología', phone: '+57 300 123 4567', email: 'carlos@example.com', assignedTo: 'u2', createdAt: '2026-02-15T10:00:00Z', sucursal_id: 'S-001' },
    { id: 'l2', name: 'Maria Rodriguez', status: 'Contactado', service: 'Dermatología', phone: '+57 321 987 6543', email: 'maria@example.com', assignedTo: 'u3', createdAt: '2026-02-16T11:30:00Z', sucursal_id: 'S-001' },
    { id: 'l3', name: 'Jorge Perez', status: 'En validación', service: 'Cardiología', phone: '+57 315 555 1212', email: 'jorge@example.com', assignedTo: 'u4', createdAt: '2026-02-17T09:15:00Z', sucursal_id: 'S-002' },
    { id: 'l4', name: 'Ana Gomez', status: 'Cita Agendada', service: 'Nutrición', phone: '+57 310 444 8888', email: 'ana@example.com', assignedTo: 'u2', createdAt: '2026-02-14T14:45:00Z', sucursal_id: 'S-001' },
    { id: 'l5', name: 'Luis Martinez', status: 'Perdido', service: 'Pediatría', phone: '+57 312 333 9999', email: 'luis@example.com', assignedTo: 'u3', createdAt: '2026-02-13T08:20:00Z', sucursal_id: 'S-001' },
    { id: 'l6', name: 'Patricia Ortiz', status: 'Perdido', service: 'Odontología', phone: '+57 318 222 7777', email: 'patricia@example.com', assignedTo: 'u4', createdAt: '2026-02-12T16:10:00Z', sucursal_id: 'S-002' },
    { id: 'l7', name: 'Roberto Diaz', status: 'Nuevo', service: 'Dermatología', phone: '+57 301 666 5555', email: 'roberto@example.com', assignedTo: 'u2', createdAt: '2026-02-18T10:05:00Z', sucursal_id: 'S-001' },
    { id: 'l8', name: 'Lucía Silva', status: 'Contactado', service: 'Psicología', phone: '+57 314 777 4444', email: 'lucia@example.com', assignedTo: 'u3', createdAt: '2026-02-17T15:20:00Z', sucursal_id: 'S-001' },
    { id: 'l9', name: 'Fernando Ruiz', status: 'Nuevo', service: 'Cardiología', phone: '+57 317 888 3333', email: 'fernando@example.com', assignedTo: 'u4', createdAt: '2026-02-18T11:30:00Z', sucursal_id: 'S-001' },
    { id: 'l10', name: 'Sandra Lopez', status: 'Contactado', service: 'Nutrición', phone: '+57 311 999 2222', email: 'sandra@example.com', assignedTo: 'u2', createdAt: '2026-02-16T12:00:00Z', sucursal_id: 'S-001' },
    { id: 'l11', name: 'Ricardo Santos', status: 'Nuevo', service: 'Odontología', phone: '+57 315 000 1111', email: 'ricardo@example.com', assignedTo: 'u3', createdAt: '2026-02-18T12:45:00Z', sucursal_id: 'S-001' },
    { id: 'l12', name: 'Gloria Herrera', status: 'Cita Agendada', service: 'Dermatología', phone: '+57 316 111 2222', email: 'gloria@example.com', assignedTo: 'u4', createdAt: '2026-02-15T09:30:00Z', sucursal_id: 'S-001' },
    { id: 'l13', name: 'Oscar Vargas', status: 'Nuevo', service: 'Cardiología', phone: '+57 319 222 3333', email: 'oscar@example.com', assignedTo: 'u2', createdAt: '2026-02-18T13:15:00Z', sucursal_id: 'S-002' },
    { id: 'l14', name: 'Diana Moreno', status: 'Perdido', service: 'Psicología', phone: '+57 320 333 4444', email: 'diana@example.com', assignedTo: 'u3', createdAt: '2026-02-16T14:50:00Z', sucursal_id: 'S-001' },
    { id: 'l15', name: 'Andrés Castro', status: 'Nuevo', service: 'Nutrición', phone: '+57 321 444 5555', email: 'andres@example.com', assignedTo: 'u4', createdAt: '2026-02-18T14:10:00Z', sucursal_id: 'S-001' },
    { id: 'l16', name: 'Beatriz Peña', status: 'Contactado', service: 'Pediatría', phone: '+57 322 555 6666', email: 'beatriz@example.com', assignedTo: 'u2', createdAt: '2026-02-17T11:25:00Z', sucursal_id: 'S-001' },
    { id: 'l17', name: 'Guillermo Mora', status: 'Contactado', service: 'Odontología', phone: '+57 323 666 7777', email: 'guillermo@example.com', assignedTo: 'u3', createdAt: '2026-02-16T10:40:00Z', sucursal_id: 'S-001' },
    { id: 'l18', name: 'Mónica Soto', status: 'Nuevo', service: 'Dermatología', phone: '+57 324 777 8888', email: 'monica@example.com', assignedTo: 'u4', createdAt: '2026-02-18T14:45:00Z', sucursal_id: 'S-002' },
    { id: 'l19', name: 'Felipe Roja', status: 'Cita Agendada', service: 'Cardiología', phone: '+57 325 888 9999', email: 'felipe@example.com', assignedTo: 'u2', createdAt: '2026-02-15T15:10:00Z', sucursal_id: 'S-001' },
    { id: 'l20', name: 'Irene Blanca', status: 'Nuevo', service: 'Nutrición', phone: '+57 326 999 0000', email: 'irene@example.com', assignedTo: 'u3', createdAt: '2026-02-18T15:20:00Z', sucursal_id: 'S-001' },
];

export const PATIENTS = [
    { id: 'p1', name: 'Alicia Wonder', age: 34, lastVisit: '2026-01-10', condition: 'Control Anual', assignedTo: 'u2', sucursal_id: 'S-001', email: 'alicia@example.com', phone: '+57 300 111 2222', createdAt: '2024-01-15' },
    { id: 'p2', name: 'Bob Constructor', age: 45, lastVisit: '2026-02-01', condition: 'Dolor Lumbar', assignedTo: 'u3', sucursal_id: 'S-001', email: 'bob@example.com', phone: '+57 300 222 3333', createdAt: '2024-03-20' },
    { id: 'p3', name: 'Clara Clara', age: 28, lastVisit: '2026-01-25', condition: 'Limpieza', assignedTo: 'u4', sucursal_id: 'S-002', email: 'clara@example.com', phone: '+57 300 333 4444', createdAt: '2024-05-10' },
    { id: 'p4', name: 'David Bowie', age: 67, lastVisit: '2025-12-15', condition: 'Seguimiento', assignedTo: 'u2', sucursal_id: 'S-001', email: 'david@example.com', phone: '+57 300 444 5555', createdAt: '2023-11-05' },
    { id: 'p5', name: 'Eva Green', age: 39, lastVisit: '2026-02-05', condition: 'Dermatitis', assignedTo: 'u3', sucursal_id: 'S-001', email: 'eva@example.com', phone: '+57 300 555 6666', createdAt: '2024-08-12' },
    { id: 'p6', name: 'Frank Sinatra', age: 82, lastVisit: '2026-01-20', condition: 'Cardiología', assignedTo: 'u4', sucursal_id: 'S-002', email: 'frank@example.com', phone: '+57 300 666 7777', createdAt: '2023-09-30' },
    { id: 'p7', name: 'Grace Kelly', age: 25, lastVisit: '2026-02-10', condition: 'Nutrición', assignedTo: 'u2', sucursal_id: 'S-001', email: 'grace@example.com', phone: '+57 300 777 8888', createdAt: '2025-01-05' },
    { id: 'p8', name: 'Harry Potter', age: 17, lastVisit: '2026-02-12', condition: 'Ortodoncia', assignedTo: 'u3', sucursal_id: 'S-001', email: 'harry@example.com', phone: '+57 300 888 9999', createdAt: '2025-02-01' },
    { id: 'p9', name: 'Iris West', age: 31, lastVisit: '2026-02-14', condition: 'Control', assignedTo: 'u4', sucursal_id: 'S-002', email: 'iris@example.com', phone: '+57 300 999 0000', createdAt: '2024-12-20' },
    { id: 'p10', name: 'Jack Sparrow', age: 42, lastVisit: '2026-01-05', condition: 'Vista', assignedTo: 'u2', sucursal_id: 'S-001', email: 'jack@example.com', phone: '+57 300 000 1111', createdAt: '2023-07-15' },
];

export const CONFIG = {
    // Legacy doctors/services for fallback, but we will use the new dedicated arrays for management
    doctors: [
        { id: 'd1', name: 'Dr. Julian Rangel', specialty: 'Odontología' },
        { id: 'd2', name: 'Dra. Angela Mejia', specialty: 'Dermatología' },
        { id: 'd3', name: 'Dr. Roberto Gomez', specialty: 'Cardiología' },
    ],
    services: [
        { id: 's1', name: 'Odontología General', price: 150000 },
        { id: 's2', name: 'Consulta Dermatológica', price: 200000 },
        { id: 's3', name: 'Plan Nutricional', price: 120000 },
    ],
    quickResponses: [
        { id: 'qr1', title: 'Saludo Inicial', text: 'Hola, habla con la Clínica Rangel. ¿En qué podemos ayudarte hoy?' },
        { id: 'qr2', title: 'Agendar Cita', text: 'Claro que sí, tenemos disponibilidad para esta semana. ¿Qué horario prefieres?' },
        { id: 'qr3', title: 'Precios', text: 'Nuestros precios varían según el tratamiento. ¿Te gustaría agendar una valoración gratuita?' },
        { id: 'qr4', title: 'Ubicación', text: 'Estamos ubicados en la Av. Principal #123, Edificio Médico. Contamos con parqueadero.' },
    ]
};

const APPOINTMENT_STAGES = ['Por Confirmar', 'Confirmada', 'Atendida', 'Cancelada'];

export const APPOINTMENTS = Array.from({ length: 30 }).map((_, i) => {
    const stage = APPOINTMENT_STAGES[Math.floor(Math.random() * APPOINTMENT_STAGES.length)];
    const doctor = CONFIG.doctors[Math.floor(Math.random() * CONFIG.doctors.length)];
    const service = CONFIG.services[Math.floor(Math.random() * CONFIG.services.length)];
    const patient = PATIENTS[Math.floor(Math.random() * PATIENTS.length)] || { name: `Paciente ${i + 1}`, id: `p-gen-${i}` };
    const sucursal = i % 5 === 0 ? 'S-002' : 'S-001'; // Most in S-001

    return {
        id: `a${i + 1}`,
        patientName: patient.name,
        patientId: patient.id,
        doctorName: doctor.name,
        doctorId: doctor.id,
        specialty: doctor.specialty,
        serviceName: service.name,
        serviceId: service.id,
        date: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        time: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
        status: stage,
        avatar: `https://i.pravatar.cc/150?u=p${i}`,
        sucursal_id: sucursal
    };
});

export const CHATS = {
    'l1': [
        { sender: 'lead', text: 'Hola, me gustaría agendar una cita para odontología.', time: '10:00' },
        { sender: 'asesora', text: 'Hola Carlos, con gusto. ¿Qué día te queda mejor?', time: '10:05' },
        { sender: 'lead', text: 'El próximo lunes por la mañana.', time: '10:10' },
    ],
    'l2': [
        { sender: 'lead', text: '¿Tienen citas disponibles para dermatología?', time: '11:30' },
        { sender: 'asesora', text: 'Hola Maria, sí tenemos. ¿Prefieres mañana o tarde?', time: '11:35' },
    ],
};

export const CLINICS = [
    { id: 'c1', name: 'Clínica Rangel', email_contacto: 'director@clinicarangel.com', status: 'activa', plan: 'Enterprise', createdAt: '2025-01-15' },
    { id: 'c2', name: 'Dental Vital', email_contacto: 'contacto@dentalvital.com', status: 'activa', plan: 'Pro', createdAt: '2025-02-01' },
    { id: 'c3', name: 'MediSalud Centro', email_contacto: 'admin@medisalud.com', status: 'pendiente', plan: 'Free', createdAt: '2026-02-18' },
    { id: 'c4', name: 'Estética Pura', email_contacto: 'gerencia@esteticapura.com', status: 'suspendida', plan: 'Pro', createdAt: '2025-11-20' },
];

export const BRANCHES = [
    { id: 'b1', name: 'Sede Principal - Norte', address: 'Av. 4 Norte #23-45', status: 'Activa', clinica_id: 'C-001' },
    { id: 'b2', name: 'Sede Centro', address: 'Calle 10 #5-20', status: 'Activa', clinica_id: 'C-001' },
];

export const TEAM_MEMBERS = [
    { id: 'tm1', name: 'Laura Martinez', email: 'laura@clinica.com', role: 'Asesor', sucursal_id: 'b1', clinica_id: 'C-001', avatar: 'https://i.pravatar.cc/150?u=tm1' },
    { id: 'tm2', name: 'Carlos Rubio', email: 'carlos@clinica.com', role: 'Asesor', sucursal_id: 'b2', clinica_id: 'C-001', avatar: 'https://i.pravatar.cc/150?u=tm2' },
    { id: 'tm3', name: 'Ana Maria Torres', email: 'ana@clinica.com', role: 'Gerente', sucursal_id: 'b1', clinica_id: 'C-001', avatar: 'https://i.pravatar.cc/150?u=tm3' },
];

export const DOCTORS = [
    { id: 'd1', name: 'Dr. Julian Rangel', specialty: 'Odontología', clinica_id: 'C-001', phone: '+57 300 123 4567', email: 'julian@clinica.com' },
    { id: 'd2', name: 'Dra. Angela Mejia', specialty: 'Dermatología', clinica_id: 'C-001', phone: '+57 321 654 9870', email: 'angela@clinica.com' },
];

export const SERVICES = [
    { id: 's1', name: 'Odontología General', price: 150000, color: 'blue', clinica_id: 'C-001' },
    { id: 's2', name: 'Ortodoncia Control', price: 120000, color: 'purple', clinica_id: 'C-001' },
    { id: 's3', name: 'Implante Dental', price: 2500000, color: 'emerald', clinica_id: 'C-001' },
];
