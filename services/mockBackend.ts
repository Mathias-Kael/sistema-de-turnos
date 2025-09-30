import { Business, Booking, Service, Employee, DayHours, Interval } from '../types';
import { validarIntervalos } from '../utils/availability';
import { INITIAL_BUSINESS_DATA } from '../constants';

const BUSINESS_STORAGE_KEY = 'businessData';

// --- Estado Unificado ---
let state: Business = loadState();

function loadState(): Business {
    try {
        const storedData = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Asegurarse de que los datos cargados tengan la estructura completa
            return { ...INITIAL_BUSINESS_DATA, ...parsedData };
        }
    } catch (error) {
        console.error("Failed to parse business data from localStorage", error);
    }
    // Si no hay nada, se retorna el estado inicial completo
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
        return state;
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
        saveState(state);
        return state;
    },

    getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return state.bookings.filter(booking => booking.date === dateString);
    },

    createBooking: async (newBookingData: Omit<Booking, 'id'>): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const newBooking: Booking = {
            ...newBookingData,
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
        const hasFutureBookings = state.bookings.some(b => b.employeeId === employeeId && b.date >= today);
        if (hasFutureBookings) {
            throw new Error(`No se puede eliminar el empleado porque tiene reservas futuras.`);
        }
        const updatedState = {
            ...state,
            employees: state.employees.filter(emp => emp.id !== employeeId),
            services: state.services.map(service => ({
                ...service,
                employeeIds: service.employeeIds.filter(id => id !== employeeId)
            }))
        };
        state = updatedState;
        saveState(state);
        return state;
    },

    addService: async (service: Service): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));
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
        const hasFutureBookings = state.bookings.some(b => b.date >= today && b.services.some(s => s.id === serviceId));
        if (hasFutureBookings) {
            throw new Error(`No se puede eliminar el servicio porque tiene reservas futuras.`);
        }
        const updatedState = { ...state, services: state.services.filter(s => s.id !== serviceId) };
        state = updatedState;
        saveState(state);
        return state;
    },

    loadDataForTests: () => {
        state = loadState();
    }
};