import { Business, Branding, ImageConstraints, ImageType } from './types';
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
    name: '',
    description: '',
    profileImageUrl: undefined,
    coverImageUrl: undefined,
    phone: '',
    whatsapp: undefined,
    instagram: undefined,
    facebook: undefined,
    branding: {
        primaryColor: '#1a202c',    // Dark gray/black
        secondaryColor: '#edf2f7',  // Light gray
        textColor: '#2d3748',       // Darker text
        font: "'Poppins', sans-serif",
    },
    employees: [],
    services: [],
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

// ===== IMAGE SYSTEM CONSTANTS =====
// Configuración de restricciones por tipo de imagen

// Configuración de restricciones por tipo de imagen
export const IMAGE_CONSTRAINTS: Record<ImageType, ImageConstraints> = {
    cover: {
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        maxWidth: 1200,
        maxHeight: 400,
        aspectRatio: 3, // 3:1 ratio (1200/400)
        quality: 0.8,
    },
    profile: {
        maxSizeBytes: 1 * 1024 * 1024, // 1MB
        maxWidth: 400,
        maxHeight: 400,
        aspectRatio: 1, // 1:1 ratio (square)
        quality: 0.8,
    },
    avatar: {
        maxSizeBytes: 1 * 1024 * 1024, // 1MB
        maxWidth: 400,
        maxHeight: 400,
        aspectRatio: 1, // 1:1 ratio (square)
        quality: 0.8,
    },
};

// Formatos de imagen soportados
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Mensajes de error estándar
export const IMAGE_ERROR_MESSAGES = {
    INVALID_FORMAT: 'Formato no soportado. Usa JPG, PNG o WebP.',
    FILE_TOO_LARGE: 'El archivo es demasiado grande.',
    UPLOAD_FAILED: 'Error al cargar la imagen.',
    PROCESSING_FAILED: 'Error al procesar la imagen.',
    STORAGE_FULL: 'No hay espacio suficiente en el almacenamiento.',
} as const;
