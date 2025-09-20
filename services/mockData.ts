import { Booking } from '../types';

// Helper function to create a date string
const d = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
};

export const MOCK_BOOKINGS: Booking[] = [
    {
        id: 'res_1',
        client: {
            name: 'Juan Perez',
            email: 'juan.perez@example.com',
            phone: '1122334455',
        },
        date: d(0),
        start: '10:00',
        end: '11:00',
        services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
        employeeId: 'e1',
        status: 'confirmed',
        notes: 'Cliente frecuente.',
    },
    {
        id: 'res_2',
        client: {
            name: 'Maria Garcia',
            email: 'maria.g@example.com',
            phone: '5566778899',
        },
        date: d(0),
        start: '14:30',
        end: '15:30',
        services: [{ id: 's2', name: 'Limpieza Interior Completa', price: 40 }],
        employeeId: 'e2',
        status: 'pending',
        notes: 'Requiere confirmación de depósito.',
    },
    {
        id: 'res_3',
        client: {
            name: 'Pedro Rodriguez',
            email: 'pedro.r@example.com',
            phone: '9988776655',
        },
        date: d(1),
        start: '09:00',
        end: '10:30',
        services: [{ id: 's3', name: 'Lavado Premium (Completo)', price: 55 }],
        employeeId: 'e1',
        status: 'confirmed',
    },
     {
        id: 'res_4',
        client: {
            name: 'Ana Lopez',
            email: 'ana.l@example.com',
            phone: '1234567890',
        },
        date: d(-1),
        start: '16:00',
        end: '17:00',
        services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
        employeeId: 'e3',
        status: 'confirmed', // Completed booking
    },
];
