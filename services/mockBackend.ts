import { Business, Booking, Service, Employee } from '../types';
import { validarIntervalos } from '../utils/availability';
import { INITIAL_BUSINESS_DATA } from '../constants';
import {
  sanitizeWhatsappNumber,
  sanitizeInstagramUsername,
  sanitizeFacebookPage,
} from '../utils/socialMedia';

const BUSINESS_STORAGE_KEY = 'businessData';

// --- Estado Unificado ---
let state: Business = loadState();

function loadState(): Business {
    try {
        const storedData = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (storedData) {
            const parsed: Business = { ...INITIAL_BUSINESS_DATA, ...JSON.parse(storedData) };
            const bizId = parsed.id;
            let mutated = false;

            parsed.employees = parsed.employees.map(e => {
                if (!(e as any).businessId) { mutated = true; return { ...e, businessId: bizId }; }
                return e;
            });
            parsed.services = parsed.services.map(s => {
                if (!(s as any).businessId) { mutated = true; return { ...s, businessId: bizId }; }
                return s;
            });
            parsed.bookings = parsed.bookings.map(b => {
                const migratedServices = b.services.map(bs => (!(bs as any).businessId ? ({ ...bs, businessId: bizId }) : bs));
                if (!(b as any).businessId) { mutated = true; return { ...b, businessId: bizId, services: migratedServices }; }
                if (migratedServices.some(ms => ms !== b.services.find(o => o.id === ms.id))) mutated = true;
                return { ...b, services: migratedServices };
            });

            if (mutated) {
                console.warn('[MIGRATION] Se añadieron businessId faltantes a entidades.');
                try { localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(parsed)); } catch {}
            }
            return parsed;
        }
    } catch (error) {
        console.error("Failed to parse business data from localStorage", error);
    }
    return INITIAL_BUSINESS_DATA;
}

function saveState(data: Business) {
    try {
        localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save business data to localStorage", error);
    }
}

// --- Funciones de la API simulada ---

export const mockBackend = {
    getBusinessData: async (): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        // Filtrar empleados y servicios archivados
        return {
            ...state,
            employees: state.employees.filter(e => !e.archived),
            services: state.services.filter(s => !s.archived)
        };
    },

    /**
     * Obtiene el negocio asociado a un token público compartido.
     * La lógica actual almacena los datos del enlace compartido en localStorage
     * bajo la key 'shareToken' (no dentro de businessData). Validamos:
     *  - Coincidencia exacta de token
     *  - No expirado (si expiresAt !== null)
     *  - Status no sea 'revoked'
     * Si el enlace está 'paused' igualmente devolvemos el negocio (la UI decidirá qué mostrar).
     */
    getBusinessByToken: async (token: string): Promise<Business | null> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
            const raw = localStorage.getItem('shareToken');
            if (!raw || raw === 'null') return null;
            const link = JSON.parse(raw);
            if (!link || typeof link !== 'object') return null;
            if (link.token !== token) return null;
            const now = Date.now();
            const isExpired = link.expiresAt !== null && now > link.expiresAt;
            if (isExpired) return null;
            if (link.status === 'revoked') return null;
            // status 'active' o 'paused' -> devolvemos el negocio actual
            // Filtrar empleados y servicios archivados
            return {
                ...state,
                employees: state.employees.filter(e => !e.archived),
                services: state.services.filter(s => !s.archived)
            };
        } catch (e) {
            console.error('[mockBackend.getBusinessByToken] Error parseando shareToken', e);
            return null;
        }
    },

    updateBusinessData: async (newData: Business): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Lógica de Validación de Integridad ---
        // 1. Validar la integridad de los nuevos intervalos (inicio < fin, sin solapamientos)
        for (const [day, dayHours] of Object.entries(newData.hours)) {
            if (dayHours.enabled) {
                // Validar que open < close en todos los intervalos
                for (const interval of dayHours.intervals) {
                    if (!interval.open || !interval.close || interval.open >= interval.close) {
                        throw new Error(`El horario de inicio debe ser anterior al de fin para el día ${day}.`);
                    }
                }
                // Validar solapamiento
                if (!validarIntervalos(dayHours.intervals)) {
                    throw new Error(`Los intervalos de horario para el día ${day} se solapan.`);
                }
            }
        }

        // 2. Validar que un cambio de horario no invalide reservas futuras.
        const changedDays = Object.keys(newData.hours).filter(day =>
            JSON.stringify(newData.hours[day as keyof Business['hours']]) !== JSON.stringify(state.hours[day as keyof Business['hours']])
        );

        if (changedDays.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const futureBookings = state.bookings.filter(b => b.date >= today);

            for (const day of changedDays) {
                const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
                // TODO: Bug conocido - validación de horarios con zona horaria
                // La conversión de fecha puede fallar dependiendo de timezone
                // Mejora sugerida: Mostrar warning al admin: 
                // "Si cambia los horarios para el día [X], hay reservas que quedarán por fuera del nuevo horario. ¿Desea continuar de todas formas?"
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
        
        // Sanitizar campos de redes sociales antes de guardar
        const sanitizedWhatsapp = newData.whatsapp ? sanitizeWhatsappNumber(newData.whatsapp) : undefined;
        const sanitizedInstagram = newData.instagram ? sanitizeInstagramUsername(newData.instagram) : undefined;
        const sanitizedFacebook = newData.facebook ? sanitizeFacebookPage(newData.facebook) : undefined;
        
        const sanitizedData = {
            ...newData,
            // Solo guardar si el valor sanitizado no está vacío
            whatsapp: sanitizedWhatsapp && sanitizedWhatsapp.length > 0 ? sanitizedWhatsapp : undefined,
            instagram: sanitizedInstagram && sanitizedInstagram.length > 0 ? sanitizedInstagram : undefined,
            facebook: sanitizedFacebook && sanitizedFacebook.length > 0 ? sanitizedFacebook : undefined,
        };
        
        state = { ...state, ...sanitizedData };
        saveState(state);
        return state;
    },

    getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return state.bookings.filter(booking => booking.date === dateString);
    },

    createBooking: async (newBookingData: Omit<Booking, 'id'>): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const withBizId = (newBookingData as any).businessId ? newBookingData : { ...newBookingData, businessId: state.id };
        const newBooking: Booking = {
            ...withBizId,
            services: withBizId.services.map(s => (s as any).businessId ? s : { ...s, businessId: state.id }),
            id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        const updatedState = { ...state, bookings: [...state.bookings, newBooking] };
        state = updatedState;
        saveState(state);
        return state;
    },

    updateBooking: async (updatedBooking: Booking): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedState = { ...state, bookings: state.bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b) };
        state = updatedState;
        saveState(state);
        return state;
    },

    deleteBooking: async (bookingId: string): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedState = { ...state, bookings: state.bookings.filter(b => b.id !== bookingId) };
        state = updatedState;
        saveState(state);
        return state;
    },

    addEmployee: async (employee: Employee): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (employee.businessId !== state.id) throw new Error('businessId del empleado no coincide');
        
        // Verificar si ya existe un empleado con el mismo nombre
        const existing = state.employees.find(e => e.name.toLowerCase() === employee.name.toLowerCase());
        
        if (existing) {
            if (existing.archived) {
                // Si está archivado, desarchivarlo y actualizar
                const updatedState = {
                    ...state,
                    employees: state.employees.map(e => 
                        e.id === existing.id 
                            ? { ...employee, id: existing.id, archived: false }
                            : e
                    )
                };
                state = updatedState;
                saveState(state);
                return state;
            } else {
                // Si ya existe y no está archivado, error
                throw new Error(`Ya existe un empleado con el nombre "${employee.name}"`);
            }
        }
        
        // Si no existe, crear nuevo
        const updatedState = { ...state, employees: [...state.employees, employee] };
        state = updatedState;
        saveState(state);
        return state;
    },

    updateEmployee: async (updatedEmployee: Employee): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedState = { ...state, employees: state.employees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp) };
        state = updatedState;
        saveState(state);
        return state;
    },

    deleteEmployee: async (employeeId: string): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const today = new Date().toISOString().split('T')[0];
        
        // Validar que no tenga reservas futuras confirmadas o pendientes
        const hasFutureActiveBookings = state.bookings.some(
            b => b.employeeId === employeeId && 
                 b.date >= today && 
                 (b.status === 'confirmed' || b.status === 'pending')
        );
        
        if (hasFutureActiveBookings) {
            throw new Error('No se puede eliminar el empleado porque tiene reservas futuras confirmadas o pendientes.');
        }
        
        // Soft delete: marcar como archived
        const updatedState = {
            ...state,
            employees: state.employees.map(emp => 
                emp.id === employeeId ? { ...emp, archived: true } : emp
            )
        };
        state = updatedState;
        saveState(state);
        return state;
    },

    addService: async (service: Service): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (service.businessId !== state.id) throw new Error('businessId del servicio no coincide');
        
        // Validar que el servicio tenga al menos un empleado asignado
        if (!service.employeeIds || service.employeeIds.length === 0) {
            throw new Error('El servicio debe tener al menos un empleado asignado');
        }
        
        // Verificar si ya existe un servicio con el mismo nombre
        const existing = state.services.find(s => s.name.toLowerCase() === service.name.toLowerCase());
        
        if (existing) {
            if (existing.archived) {
                // Si está archivado, desarchivarlo y actualizar
                const updatedState = {
                    ...state,
                    services: state.services.map(s => 
                        s.id === existing.id 
                            ? { ...service, id: existing.id, archived: false }
                            : s
                    )
                };
                state = updatedState;
                saveState(state);
                return state;
            } else {
                // Si ya existe y no está archivado, error
                throw new Error(`Ya existe un servicio con el nombre "${service.name}"`);
            }
        }
        
        // Si no existe, crear nuevo
        const updatedState = { ...state, services: [...state.services, service] };
        state = updatedState;
        saveState(state);
        return state;
    },

    updateService: async (updatedService: Service): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedState = { ...state, services: state.services.map(s => s.id === updatedService.id ? updatedService : s) };
        state = updatedState;
        saveState(state);
        return state;
    },

    deleteService: async (serviceId: string): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const today = new Date().toISOString().split('T')[0];
        
        // Validar que no tenga reservas futuras confirmadas o pendientes
        const hasFutureActiveBookings = state.bookings.some(
            b => b.date >= today && 
                 (b.status === 'confirmed' || b.status === 'pending') &&
                 b.services.some(s => s.id === serviceId)
        );
        
        if (hasFutureActiveBookings) {
            throw new Error('No se puede eliminar el servicio porque tiene reservas futuras confirmadas o pendientes.');
        }
        
        // Soft delete: marcar como archived
        const updatedState = {
            ...state,
            services: state.services.map(s => 
                s.id === serviceId ? { ...s, archived: true } : s
            )
        };
        state = updatedState;
        saveState(state);
        return state;
    },

    loadDataForTests: () => {
        state = loadState();
    }
};