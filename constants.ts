import { Business, Branding } from './types';
import { MOCK_BOOKINGS } from './services/mockData';

// Default business data for initialization
export const DEFAULT_HOURS_TEMPLATE = {
    monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    friday: { enabled: true, intervals: [{ open: '09:00', close: '20:00' }] },
    saturday: { enabled: true, intervals: [{ open: '10:00', close: '16:00' }] },
    sunday: { enabled: false, intervals: [] },
};

export const INITIAL_BUSINESS_DATA: Business = {
    id: 'biz_1',
    name: 'Autolavado "El Impecable"',
    description: 'Tu auto, nuestra pasión. Expertos en detailing y cuidado automotriz.',
    logoUrl: 'https://i.imgur.com/gKaImM8.png', // A generic, placeholder logo
    phone: '5491112345678',
    branding: {
        primaryColor: '#1a202c',    // Dark gray/black
        secondaryColor: '#edf2f7',  // Light gray
        textColor: '#2d3748',       // Darker text
        font: "'Poppins', sans-serif",
    },
    employees: [
        { id: 'e1', name: 'Carlos Gomez', avatarUrl: 'https://i.imgur.com/8Km9t4u.png', hours: { ...DEFAULT_HOURS_TEMPLATE } },
        { id: 'e2', name: 'Lucía Fernandez', avatarUrl: 'https://i.imgur.com/DeT4v2s.png', hours: { ...DEFAULT_HOURS_TEMPLATE } },
        { id: 'e3', name: 'Miguel Angel', avatarUrl: 'https://i.imgur.com/tH1iTLA.png', hours: { ...DEFAULT_HOURS_TEMPLATE } },
    ],
    services: [
        { id: 's1', name: 'Lavado Básico Exterior', description: 'Lavado de carrocería y secado a mano.', duration: 25, buffer: 5, price: 20, employeeIds: ['e1', 'e3'] },
        { id: 's2', name: 'Limpieza Interior Completa', description: 'Aspirado profundo, limpieza de tapizados y paneles.', duration: 50, buffer: 10, price: 40, requiresDeposit: true, employeeIds: ['e2'] },
        { id: 's3', name: 'Lavado Premium (Completo)', description: 'Incluye lavado básico y limpieza interior.', duration: 80, buffer: 10, price: 55, requiresDeposit: true, employeeIds: ['e1', 'e2', 'e3'] },
        { id: 's4', name: 'Pulido y Encerado', description: 'Tratamiento para realzar el brillo y proteger la pintura.', duration: 110, buffer: 10, price: 80, employeeIds: ['e1'] },
    ],
    hours: { ...DEFAULT_HOURS_TEMPLATE },
    bookings: MOCK_BOOKINGS, // Inicializar con las reservas mock
};

// Color and style presets for the branding editor
export const BRANDING_PRESETS: { name: string; colors: Branding }[] = [
    {
        name: 'Moderno Oscuro',
        colors: {
            primaryColor: '#1a202c',
            secondaryColor: '#edf2f7',
            textColor: '#2d3748',
            font: "'Poppins', sans-serif",
        },
    },
    {
        name: 'Azul Corporativo',
        colors: {
            primaryColor: '#2b6cb0',
            secondaryColor: '#ebf8ff',
            textColor: '#1a365d',
            font: "'Lato', sans-serif",
        },
    },
    {
        name: 'Verde Natural',
        colors: {
            primaryColor: '#2f855a',
            secondaryColor: '#f0fff4',
            textColor: '#22543d',
            font: "'Merriweather', serif",
        },
    },
    {
        name: 'Púrpura Elegante',
        colors: {
            primaryColor: '#6b46c1',
            secondaryColor: '#faf5ff',
            textColor: '#44337a',
            font: "'Montserrat', sans-serif",
        },
    },
];
