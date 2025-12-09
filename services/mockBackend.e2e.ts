import { Business, Booking, Service, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { validarIntervalos } from '../utils/availability';

// In-memory state (no red real). Permite sobreescritura desde localStorage si existe 'businessData'.
let state: Business = (() => {
  try {
    const raw = localStorage.getItem('businessData');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_BUSINESS_DATA, ...parsed } as Business;
    }
  } catch {}
  return INITIAL_BUSINESS_DATA;
})();

// Persistir cambios para permitir que navegaciones posteriores mantengan estado durante un mismo test.
const persist = () => {
  try { localStorage.setItem('businessData', JSON.stringify(state)); } catch {}
};

function ensureBusinessIds() {
  const bizId = state.id;
  state.employees = state.employees.map(e => ({ ...e, businessId: bizId }));
  state.services = state.services.map(s => ({ ...s, businessId: bizId }));
  state.bookings = state.bookings.map(b => ({ ...b, businessId: bizId, services: b.services.map(s => ({ ...s, businessId: bizId })) }));
}
ensureBusinessIds();

// Helper validaciones centrales
function validateHours(newData: Business) {
  for (const [day, dayHours] of Object.entries(newData.hours)) {
    if (dayHours.enabled) {
      for (const interval of dayHours.intervals) {
        if (!interval.open || !interval.close || interval.open >= interval.close) {
          throw new Error(`El horario de inicio debe ser anterior al de fin para el día ${day}.`);
        }
      }
      if (!validarIntervalos(dayHours.intervals)) {
        throw new Error(`Los intervalos de horario para el día ${day} se solapan.`);
      }
    }
  }
}

export const mockBackendTest = {
  getBusinessData: async (): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    return state;
  },
  getBusinessByToken: async (token: string): Promise<Business | null> => {
    await new Promise(r => setTimeout(r, 5));
    try {
      const raw = localStorage.getItem('shareToken');
      if (!raw) return null;
      const link = JSON.parse(raw);
      if (link.token !== token) return null;
      if (link.expiresAt && Date.now() > link.expiresAt) return null;
      if (link.status === 'revoked') return null;
      return state;
    } catch {
      return null;
    }
  },
  updateBusinessData: async (newData: Business): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    validateHours(newData);

    // --- Lógica de Validación de Integridad ---
    const changedDays = Object.keys(newData.hours).filter(day =>
        JSON.stringify(newData.hours[day as keyof Business['hours']]) !== JSON.stringify(state.hours[day as keyof Business['hours']])
    );

    if (changedDays.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const futureBookings = state.bookings.filter(b => b.date >= today);

        for (const day of changedDays) {
            const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
            const bookingsForDay = futureBookings.filter(b => new Date(b.date + 'T12:00:00Z').getDay() === dayIndex);
            
            if (bookingsForDay.length === 0) continue;

            const newDayHours = newData.hours[day as keyof Business['hours']];

            for (const booking of bookingsForDay) {
                if (!newDayHours.enabled) {
                    throw new Error(`Deshabilitar el ${day} cancelaría la reserva #${booking.id} del ${booking.date}.`);
                }
                const bookingStart = parseInt(booking.start.replace(':', ''), 10);
                const bookingEnd = parseInt(booking.end.replace(':', ''), 10);
                const isBookingValid = newDayHours.intervals.some(interval => {
                    const intervalStart = parseInt(interval.open.replace(':', ''), 10);
                    const intervalEnd = parseInt(interval.close.replace(':', ''), 10);
                    return bookingStart >= intervalStart && bookingEnd <= intervalEnd;
                });
                if (!isBookingValid) {
                    throw new Error(`El nuevo horario para el ${day} entra en conflicto con la reserva #${booking.id} de ${booking.start} a ${booking.end} el día ${booking.date}.`);
                }
            }
        }
    }

    state = { ...state, ...newData };
    ensureBusinessIds();
    persist();
    return state;
  },
  getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
    await new Promise(r => setTimeout(r, 5));
    return state.bookings.filter(b => b.date === dateString);
  },
  createBooking: async (data: Omit<Booking, 'id'>): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    const booking: Booking = { ...data, id: `bk_${Date.now()}_${Math.random().toString(36).slice(2,8)}` };
    state = { ...state, bookings: [...state.bookings, booking] };
    persist();
    return state;
  },

  createBookingSafe: async (bookingData: {
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    client_name: string;
    client_phone: string;
    client_email?: string; // ← NUEVO: Opcional
    client_id?: string; // ← NUEVO: Opcional
    business_id: string;
    service_ids: string[];
  }): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    const booking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      businessId: bookingData.business_id,
      employeeId: bookingData.employee_id,
      date: bookingData.date,
      start: bookingData.start_time,
      end: bookingData.end_time,
      client: {
        name: bookingData.client_name,
        phone: bookingData.client_phone,
        email: bookingData.client_email || '',
        id: bookingData.client_id, // ← NUEVO: Incluir client_id
      },
      clientId: bookingData.client_id, // ← NUEVO: Relación con tabla clients
      services: [], // Mocked, not needed for this test
      status: 'confirmed',
      notes: ''
    };
    state = { ...state, bookings: [...state.bookings, booking] };
    persist();
    return state;
  },

  updateBooking: async (updated: Booking): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, bookings: state.bookings.map(b => b.id === updated.id ? updated : b) };
    persist();
    return state;
  },
  updateBookingStatus: async (bookingId: string, status: any, _businessId: string, notes?: string): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = {
      ...state,
      bookings: state.bookings.map(b =>
        b.id === bookingId
          ? { ...b, status: status as any, notes: typeof notes === 'string' ? notes : b.notes }
          : b
      ),
    };
    persist();
    return state;
  },
  deleteBooking: async (bookingId: string): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, bookings: state.bookings.filter(b => b.id !== bookingId) };
    persist();
    return state;
  },
  addEmployee: async (employee: Employee): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, employees: [...state.employees, employee] };
    persist();
    return state;
  },
  updateEmployee: async (employee: Employee): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, employees: state.employees.map(e => e.id === employee.id ? employee : e) };
    persist();
    return state;
  },
  deleteEmployee: async (employeeId: string): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, employees: state.employees.filter(e => e.id !== employeeId), services: state.services.map(s => ({ ...s, employeeIds: s.employeeIds.filter(id => id !== employeeId) })) };
    persist();
    return state;
  },
  addService: async (service: Service): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, services: [...state.services, service] };
    persist();
    return state;
  },
  updateService: async (service: Service): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, services: state.services.map(s => s.id === service.id ? service : s) };
    persist();
    return state;
  },
  deleteService: async (serviceId: string): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    state = { ...state, services: state.services.filter(s => s.id !== serviceId) };
    persist();
    return state;
  },
  loadDataForTests: () => {
    state = (() => {
      try {
        const raw = localStorage.getItem('businessData');
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...INITIAL_BUSINESS_DATA, ...parsed } as Business;
        }
      } catch {}
      return INITIAL_BUSINESS_DATA;
    })();
    ensureBusinessIds();
  },

  // ===== CATEGORIES CRUD =====
  createCategory: async (payload: { name: string; icon: import('../types').CategoryIcon }): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    
    // Validar que no exista una categoría con el mismo nombre
    const exists = state.categories.some(c => c.name.toLowerCase() === payload.name.toLowerCase());
    if (exists) {
      throw new Error(`Ya existe una categoría con el nombre "${payload.name}"`);
    }

    const newCategory = {
      id: `cat_${Date.now()}`,
      businessId: state.id,
      name: payload.name.trim(),
      icon: payload.icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.categories.push(newCategory);
    persist();
    return state;
  },

  updateCategory: async (payload: { categoryId: string; name: string; icon: import('../types').CategoryIcon }): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    
    const index = state.categories.findIndex(c => c.id === payload.categoryId);
    if (index === -1) {
      throw new Error('Categoría no encontrada');
    }

    // Validar que no exista otra categoría con el mismo nombre
    const exists = state.categories.some(c => c.id !== payload.categoryId && c.name.toLowerCase() === payload.name.toLowerCase());
    if (exists) {
      throw new Error(`Ya existe una categoría con el nombre "${payload.name}"`);
    }

    state.categories[index] = {
      ...state.categories[index],
      name: payload.name.trim(),
      icon: payload.icon,
      updatedAt: new Date().toISOString(),
    };

    persist();
    return state;
  },

  deleteCategory: async (categoryId: string): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    
    state.categories = state.categories.filter(c => c.id !== categoryId);
    
    // Eliminar relaciones en servicios
    state.services = state.services.map(s => ({
      ...s,
      categoryIds: s.categoryIds?.filter(id => id !== categoryId),
    }));

    persist();
    return state;
  },

  updateServiceCategories: async (serviceId: string, categoryIds: string[]): Promise<string[]> => {
    await new Promise(r => setTimeout(r, 5));
    
    const serviceIndex = state.services.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) {
      throw new Error('Servicio no encontrado');
    }

    // Simula la actualización de categorías para el servicio
    state.services[serviceIndex] = {
      ...state.services[serviceIndex],
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    };

    persist();
    // Devuelve los IDs actualizados, tal como lo hace el backend real
    return categoryIds;
  },

  updateResourceTerminology: async (config: import('../types').ResourceTerminology): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    
    state = {
      ...state,
      branding: {
        ...state.branding,
        terminology: config
      }
    };

    persist();
    return state;
  },

  updateBusinessRating: async (rating: import('../types').BusinessRating): Promise<Business> => {
    await new Promise(r => setTimeout(r, 5));
    
    state = {
      ...state,
      branding: {
        ...state.branding,
        rating
      }
    };

    persist();
    return state;
  },
};

// Utilidad para tests que necesiten resetear completamente el estado in-memory
export function __resetMockBackendTest(newState?: Business) {
  state = newState ? { ...newState } : INITIAL_BUSINESS_DATA;
  ensureBusinessIds();
  persist();
}