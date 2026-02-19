export const USERS = [
    { id: 'u1', name: 'Admin User', email: 'admin@clinica.com', role: 'admin', avatar: 'https://i.pravatar.cc/150?u=admin' },
    { id: 'u2', name: 'Laura Asesora', email: 'asesora1@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=laura' },
    { id: 'u3', name: 'Sofia Asesora', email: 'asesora2@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=sofia' },
    { id: 'u4', name: 'Elena Asesora', email: 'asesora3@clinica.com', role: 'asesora', avatar: 'https://i.pravatar.cc/150?u=elena' },
];

export const LEADS = [
    { id: 'l1', name: 'Carlos Mendoza', status: 'Nuevo', service: 'Odontología', phone: '+57 300 123 4567', email: 'carlos@example.com', assignedTo: 'u2', createdAt: '2026-02-15T10:00:00Z' },
    { id: 'l2', name: 'Maria Rodriguez', status: 'Contactado', service: 'Dermatología', phone: '+57 321 987 6543', email: 'maria@example.com', assignedTo: 'u3', createdAt: '2026-02-16T11:30:00Z' },
    { id: 'l3', name: 'Jorge Perez', status: 'En validación', service: 'Cardiología', phone: '+57 315 555 1212', email: 'jorge@example.com', assignedTo: 'u4', createdAt: '2026-02-17T09:15:00Z' },
    { id: 'l4', name: 'Ana Gomez', status: 'Calificado', service: 'Nutrición', phone: '+57 310 444 8888', email: 'ana@example.com', assignedTo: 'u2', createdAt: '2026-02-14T14:45:00Z' },
    { id: 'l5', name: 'Luis Martinez', status: 'Sin respuesta', service: 'Pediatría', phone: '+57 312 333 9999', email: 'luis@example.com', assignedTo: 'u3', createdAt: '2026-02-13T08:20:00Z' },
    { id: 'l6', name: 'Patricia Ortiz', status: 'No viable', service: 'Odontología', phone: '+57 318 222 7777', email: 'patricia@example.com', assignedTo: 'u4', createdAt: '2026-02-12T16:10:00Z' },
    { id: 'l7', name: 'Roberto Diaz', status: 'Nuevo', service: 'Dermatología', phone: '+57 301 666 5555', email: 'roberto@example.com', assignedTo: 'u2', createdAt: '2026-02-18T10:05:00Z' },
    { id: 'l8', name: 'Lucía Silva', status: 'Contactado', service: 'Psicología', phone: '+57 314 777 4444', email: 'lucia@example.com', assignedTo: 'u3', createdAt: '2026-02-17T15:20:00Z' },
    { id: 'l9', name: 'Fernando Ruiz', status: 'Nuevo', service: 'Cardiología', phone: '+57 317 888 3333', email: 'fernando@example.com', assignedTo: 'u4', createdAt: '2026-02-18T11:30:00Z' },
    { id: 'l10', name: 'Sandra Lopez', status: 'En validación', service: 'Nutrición', phone: '+57 311 999 2222', email: 'sandra@example.com', assignedTo: 'u2', createdAt: '2026-02-16T12:00:00Z' },
    // ... adding more to reach 20 as requested
    { id: 'l11', name: 'Ricardo Santos', status: 'Nuevo', service: 'Odontología', phone: '+57 315 000 1111', email: 'ricardo@example.com', assignedTo: 'u3', createdAt: '2026-02-18T12:45:00Z' },
    { id: 'l12', name: 'Gloria Herrera', status: 'Calificado', service: 'Dermatología', phone: '+57 316 111 2222', email: 'gloria@example.com', assignedTo: 'u4', createdAt: '2026-02-15T09:30:00Z' },
    { id: 'l13', name: 'Oscar Vargas', status: 'Nuevo', service: 'Cardiología', phone: '+57 319 222 3333', email: 'oscar@example.com', assignedTo: 'u2', createdAt: '2026-02-18T13:15:00Z' },
    { id: 'l14', name: 'Diana Moreno', status: 'Sin respuesta', service: 'Psicología', phone: '+57 320 333 4444', email: 'diana@example.com', assignedTo: 'u3', createdAt: '2026-02-16T14:50:00Z' },
    { id: 'l15', name: 'Andrés Castro', status: 'Nuevo', service: 'Nutrición', phone: '+57 321 444 5555', email: 'andres@example.com', assignedTo: 'u4', createdAt: '2026-02-18T14:10:00Z' },
    { id: 'l16', name: 'Beatriz Peña', status: 'Contactado', service: 'Pediatría', phone: '+57 322 555 6666', email: 'beatriz@example.com', assignedTo: 'u2', createdAt: '2026-02-17T11:25:00Z' },
    { id: 'l17', name: 'Guillermo Mora', status: 'En validación', service: 'Odontología', phone: '+57 323 666 7777', email: 'guillermo@example.com', assignedTo: 'u3', createdAt: '2026-02-16T10:40:00Z' },
    { id: 'l18', name: 'Mónica Soto', status: 'Nuevo', service: 'Dermatología', phone: '+57 324 777 8888', email: 'monica@example.com', assignedTo: 'u4', createdAt: '2026-02-18T14:45:00Z' },
    { id: 'l19', name: 'Felipe Roja', status: 'Calificado', service: 'Cardiología', phone: '+57 325 888 9999', email: 'felipe@example.com', assignedTo: 'u2', createdAt: '2026-02-15T15:10:00Z' },
    { id: 'l20', name: 'Irene Blanca', status: 'Nuevo', service: 'Nutrición', phone: '+57 326 999 0000', email: 'irene@example.com', assignedTo: 'u3', createdAt: '2026-02-18T15:20:00Z' },
];

export const PATIENTS = [
    { id: 'p1', name: 'Alicia Wonder', age: 34, lastVisit: '2026-01-10', condition: 'Control Anual', assignedTo: 'u2' },
    { id: 'p2', name: 'Bob Constructor', age: 45, lastVisit: '2026-02-01', condition: 'Dolor Lumbar', assignedTo: 'u3' },
    { id: 'p3', name: 'Clara Clara', age: 28, lastVisit: '2026-01-25', condition: 'Limpieza', assignedTo: 'u4' },
    { id: 'p4', name: 'David Bowie', age: 67, lastVisit: '2025-12-15', condition: 'Seguimiento', assignedTo: 'u2' },
    { id: 'p5', name: 'Eva Green', age: 39, lastVisit: '2026-02-05', condition: 'Dermatitis', assignedTo: 'u3' },
    { id: 'p6', name: 'Frank Sinatra', age: 82, lastVisit: '2026-01-20', condition: 'Cardiología', assignedTo: 'u4' },
    { id: 'p7', name: 'Grace Kelly', age: 25, lastVisit: '2026-02-10', condition: 'Nutrición', assignedTo: 'u2' },
    { id: 'p8', name: 'Harry Potter', age: 17, lastVisit: '2026-02-12', condition: 'Ortodoncia', assignedTo: 'u3' },
    { id: 'p9', name: 'Iris West', age: 31, lastVisit: '2026-02-14', condition: 'Control', assignedTo: 'u4' },
    { id: 'p10', name: 'Jack Sparrow', age: 42, lastVisit: '2026-01-05', condition: 'Vista', assignedTo: 'u2' },
];

export const CONFIG = {
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
    products: [
        { id: 'pr1', name: 'Kit de Blanqueamiento', price: 80000 },
        { id: 'pr2', name: 'Protector Solar FPS 50', price: 95000 },
    ],
    quickResponses: [
        { id: 'qr1', title: 'Saludo Inicial', text: 'Hola, habla con la Clínica Rangel. ¿En qué podemos ayudarte hoy?' },
        { id: 'qr2', title: 'Agendar Cita', text: 'Claro que sí, tenemos disponibilidad para esta semana. ¿Qué horario prefieres?' },
        { id: 'qr3', title: 'Precios', text: 'Nuestros precios varían según el tratamiento. ¿Te gustaría agendar una valoración gratuita?' },
        { id: 'qr4', title: 'Ubicación', text: 'Estamos ubicados en la Av. Principal #123, Edificio Médico. Contamos con parqueadero.' },
    ]
};

const APPOINTMENT_STAGES = ['Solicitada', 'Por Confirmar', 'Confirmada', 'En Sala', 'Atendida', 'Cancelada'];

export const APPOINTMENTS = Array.from({ length: 60 }).map((_, i) => {
    const stage = APPOINTMENT_STAGES[Math.floor(Math.random() * APPOINTMENT_STAGES.length)];
    const doctor = CONFIG.doctors[Math.floor(Math.random() * CONFIG.doctors.length)];
    const service = CONFIG.services[Math.floor(Math.random() * CONFIG.services.length)];
    const patient = PATIENTS[Math.floor(Math.random() * PATIENTS.length)] || { name: `Paciente ${i + 1}` };

    return {
        id: `a${i + 1}`,
        patientName: patient.name,
        patientId: patient.id || `p-gen-${i}`,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        serviceName: service.name,
        date: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        time: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
        status: stage,
        avatar: `https://i.pravatar.cc/150?u=p${i}`
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
    // Add base chats for others or leave empty
};


