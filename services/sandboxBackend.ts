/**
 * SandboxBackend - Backend aislado para demo de la landing page
 * 
 * Implementa la interface IBackend con datos ficticios pre-cargados
 * para mostrar la experiencia completa sin tocar la DB de producción.
 * 
 * Features:
 * - Negocio demo "Luna Beauty Studio" con servicios reales
 * - Slots dinámicos generados con algoritmo ASTRA
 * - Auto-reset cada 10 minutos para mantener demo limpio
 * - Simula latencia realista de red (300-800ms)
 */

import {
  Business,
  Booking,
  Service,
  Employee,
  Category,
  Hours,
  Branding,
  BookingClient,
} from '../types';

// --- Demo Business Data ---

const DEMO_BRANDING: Branding = {
  primaryColor: '#8B5CF6', // Purple
  secondaryColor: '#EC4899', // Pink
  textColor: '#1F2937',
  font: 'Poppins',
  terminology: { type: 'person' } as const,
  rating: {
    score: 4.8,
    count: 127,
    googleMapsUrl: 'https://maps.google.com/?cid=123456789',
    visible: true,
  },
};

const DEMO_HOURS: Hours = {
  monday: {
    enabled: true,
    intervals: [{ open: '09:00', close: '19:00' }],
  },
  tuesday: {
    enabled: true,
    intervals: [{ open: '09:00', close: '19:00' }],
  },
  wednesday: {
    enabled: true,
    intervals: [{ open: '09:00', close: '19:00' }],
  },
  thursday: {
    enabled: true,
    intervals: [{ open: '09:00', close: '19:00' }],
  },
  friday: {
    enabled: true,
    intervals: [{ open: '09:00', close: '20:00' }],
  },
  saturday: {
    enabled: true,
    intervals: [{ open: '10:00', close: '18:00' }],
  },
  sunday: { enabled: false, intervals: [] },
};

const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'demo-emp-1',
    businessId: 'demo-business',
    name: 'Sofía Martínez',
    avatarUrl: '',
    hours: DEMO_HOURS,
  },
  {
    id: 'demo-emp-2',
    businessId: 'demo-business',
    name: 'Valentina López',
    avatarUrl: '',
    hours: DEMO_HOURS,
  },
];

const DEMO_CATEGORIES: Category[] = [
  {
    id: 'demo-cat-1',
    businessId: 'demo-business',
    name: 'Tratamientos Faciales',
    icon: 'star',
  },
  {
    id: 'demo-cat-2',
    businessId: 'demo-business',
    name: 'Manicura & Pedicura',
    icon: 'brush',
  },
  {
    id: 'demo-cat-3',
    businessId: 'demo-business',
    name: 'Masajes',
    icon: 'heart',
  },
];

const DEMO_SERVICES: Service[] = [
  {
    id: 'demo-svc-1',
    businessId: 'demo-business',
    name: 'Limpieza Facial Profunda',
    description:
      'Tratamiento completo con limpieza, exfoliación, extracción y mascarilla según tipo de piel',
    duration: 60,
    buffer: 15,
    price: 8500,
    requiresDeposit: true,
    depositAmount: 3000,
    employeeIds: ['demo-emp-1', 'demo-emp-2'],
    categoryIds: ['demo-cat-1'],
  },
  {
    id: 'demo-svc-2',
    businessId: 'demo-business',
    name: 'Manicura Completa',
    description: 'Limado, esmaltado semipermanente y diseño básico',
    duration: 45,
    buffer: 10,
    price: 4500,
    employeeIds: ['demo-emp-1', 'demo-emp-2'],
    categoryIds: ['demo-cat-2'],
  },
  {
    id: 'demo-svc-3',
    businessId: 'demo-business',
    name: 'Masaje Descontracturante',
    description: 'Masaje terapéutico de espalda, cuello y hombros (50 min)',
    duration: 50,
    buffer: 10,
    price: 7000,
    employeeIds: ['demo-emp-1'],
    categoryIds: ['demo-cat-3'],
  },
  {
    id: 'demo-svc-4',
    businessId: 'demo-business',
    name: 'Pedicura Spa',
    description: 'Exfoliación, hidratación y esmaltado con parafina',
    duration: 60,
    buffer: 15,
    price: 5500,
    employeeIds: ['demo-emp-2'],
    categoryIds: ['demo-cat-2'],
  },
];

const DEMO_BUSINESS: Business = {
  id: 'demo-business',
  name: 'Luna Beauty Studio',
  description:
    'Espacio de belleza integral en el corazón de Palermo. Especialistas en tratamientos faciales, manicura y masajes relajantes.',
  phone: '+54 9 11 5555-1234',
  instagram: 'lunabeautystudio',
  facebook: 'lunabeautystudio',
  whatsapp: '+5491155551234',
  coverImageUrl: '',
  profileImageUrl: '',
  hours: DEMO_HOURS,
  employees: DEMO_EMPLOYEES,
  services: DEMO_SERVICES,
  bookings: [],
  branding: DEMO_BRANDING,
  categories: DEMO_CATEGORIES,
  paymentAlias: 'luna.beauty.mp',
  paymentCbu: '0000003100010234567890',
  depositInfo: 'Enviá el comprobante por WhatsApp después de reservar',
};

// --- Sandbox State ---

interface SandboxState {
  business: Business;
  bookings: Booking[];
  lastReset: number;
}

class SandboxBackend {
  private state: SandboxState;
  private readonly RESET_INTERVAL = 10 * 60 * 1000; // 10 minutos

  constructor() {
    this.state = {
      business: DEMO_BUSINESS,
      bookings: [],
      lastReset: Date.now(),
    };

    // Auto-reset periódico
    setInterval(() => this.checkAndReset(), 60 * 1000); // Verificar cada 1 minuto
  }

  private checkAndReset() {
    const now = Date.now();
    if (now - this.state.lastReset > this.RESET_INTERVAL) {
      console.log('[SandboxBackend] Auto-reset triggered');
      this.reset();
    }
  }

  private reset() {
    this.state = {
      business: DEMO_BUSINESS,
      bookings: [],
      lastReset: Date.now(),
    };
  }

  private async simulateLatency(ms: number = 500) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- API Implementation ---

  async getBusinessData(): Promise<Business> {
    await this.simulateLatency(300);
    return {
      ...this.state.business,
      bookings: this.state.bookings,
    };
  }

  async getBusinessByToken(token: string): Promise<Business | null> {
    await this.simulateLatency(200);
    
    // Demo token es especial
    if (token === 'DEMO_TOKEN' || token === 'demo') {
      return {
        ...this.state.business,
        bookings: this.state.bookings,
      };
    }
    
    return null;
  }

  async updateBusinessData(newData: Business): Promise<Business> {
    await this.simulateLatency(400);
    
    // En sandbox, no guardamos cambios permanentemente
    console.log('[SandboxBackend] Business update received (not persisted in demo)');
    
    return this.state.business;
  }

  async createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
    await this.simulateLatency(600);

    const newBooking: Booking = {
      ...bookingData,
      id: `demo-booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'confirmed',
    };

    this.state.bookings.push(newBooking);

    console.log('[SandboxBackend] Booking created:', newBooking.id);
    return newBooking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    await this.simulateLatency(400);

    const bookingIndex = this.state.bookings.findIndex((b) => b.id === id);
    if (bookingIndex === -1) {
      throw new Error('Booking not found');
    }

    this.state.bookings[bookingIndex] = {
      ...this.state.bookings[bookingIndex],
      ...updates,
    };

    return this.state.bookings[bookingIndex];
  }

  async deleteBooking(id: string): Promise<void> {
    await this.simulateLatency(300);

    this.state.bookings = this.state.bookings.filter((b) => b.id !== id);
    console.log('[SandboxBackend] Booking deleted:', id);
  }

  // Reset manual (para testing)
  manualReset() {
    this.reset();
  }
}

// Singleton instance
export const sandboxBackend = new SandboxBackend();
