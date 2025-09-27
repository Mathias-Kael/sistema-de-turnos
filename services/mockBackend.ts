import { Business, Booking, Service, Employee, DayHours, Interval } from '../types';
import { validarIntervalos } from '../utils/availability';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { MOCK_BOOKINGS } from './mockData'; // Usaremos esto como base inicial para las reservas

const BUSINESS_STORAGE_KEY = 'businessData';
const BOOKINGS_STORAGE_KEY = 'bookingsData';

// Estado interno del "backend" simulado
let businessData: Business = loadBusinessData();
let bookingsData: Booking[] = loadBookingsData();

function loadBusinessData(): Business {
    try {
        const storedData = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            return { ...INITIAL_BUSINESS_DATA, ...parsedData };
        }
    } catch (error) {
        console.error("Failed to parse business data from localStorage", error);
    }
    return INITIAL_BUSINESS_DATA;
}

function saveBusinessData(data: Business) {
    try {
        localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save business data to localStorage", error);
    }
}

function loadBookingsData(): Booking[] {
    try {
        const storedData = localStorage.getItem(BOOKINGS_STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Failed to parse bookings data from localStorage", error);
    }
    // Si no hay reservas guardadas, usamos las de mockData como punto de partida
    return MOCK_BOOKINGS;
}

function saveBookingsData(data: Booking[]) {
    try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save bookings data to localStorage", error);
    }
}

// --- Funciones de la API simulada ---

export const mockBackend = {
    getBusinessData: async (): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simular retardo de red
        return businessData;
    },

    updateBusinessData: async (newData: Business): Promise<Business> => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Lógica de Validación de Integridad ---
        const changedDays = Object.keys(newData.hours).filter(day =>
            JSON.stringify(newData.hours[day as keyof Business['hours']]) !== JSON.stringify(businessData.hours[day as keyof Business['hours']])
        );

        if (changedDays.length > 0) {
            // 1. Validar la integridad de los nuevos intervalos (inicio < fin, sin solapamientos)
            for (const day of changedDays) {
                const dayHours = newData.hours[day as keyof Business['hours']];
                if (dayHours.enabled) {
                    for (const interval of dayHours.intervals) {
                        if (interval.open >= interval.close) {
                            throw new Error(`El horario de inicio debe ser anterior al de fin para el día ${day}.`);
                        }
                    }
                    if (!validarIntervalos(dayHours.intervals)) {
                        throw new Error(`Los intervalos de horario para el día ${day} se solapan.`);
                    }
                }
            }

            // 2. Validar que un cambio de horario no invalide reservas futuras.
            const today = new Date().toISOString().split('T')[0];
            const futureBookings = bookingsData.filter(b => b.date >= today);

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
        
        businessData = { ...businessData, ...newData };
        saveBusinessData(businessData);
        return businessData;
    },

    getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return bookingsData.filter(booking => booking.date === dateString);
    },

    createBooking: async (newBooking: Booking): Promise<Booking> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        // Si la reserva no tiene ID, se le asigna uno. Si lo tiene, se respeta (útil para tests).
        if (!newBooking.id) {
            newBooking.id = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        bookingsData.push(newBooking);
        saveBookingsData(bookingsData);
        return newBooking;
    },

    updateBooking: async (updatedBooking: Booking): Promise<Booking> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        bookingsData = bookingsData.map(b => b.id === updatedBooking.id ? updatedBooking : b);
        saveBookingsData(bookingsData);
        return updatedBooking;
    },

    deleteBooking: async (bookingId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        bookingsData = bookingsData.filter(b => b.id !== bookingId);
        saveBookingsData(bookingsData);
    },

    // Funciones para la gestión de empleados y servicios (se expandirán más adelante)
    addEmployee: async (employee: Employee): Promise<Employee> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        businessData.employees.push(employee);
        saveBusinessData(businessData);
        return employee;
    },

    updateEmployee: async (updatedEmployee: Employee): Promise<Employee> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        businessData.employees = businessData.employees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp);
        saveBusinessData(businessData);
        return updatedEmployee;
    },

    deleteEmployee: async (employeeId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Lógica de Validación de Integridad ---
        const today = new Date().toISOString().split('T')[0];
        const hasFutureBookings = bookingsData.some(b => b.employeeId === employeeId && b.date >= today);

        if (hasFutureBookings) {
            throw new Error(`No se puede eliminar el empleado porque tiene reservas futuras.`);
        }

        businessData.employees = businessData.employees.filter(emp => emp.id !== employeeId);
        // También eliminar al empleado de los servicios si estaba asignado
        businessData.services = businessData.services.map(service => ({
            ...service,
            employeeIds: service.employeeIds.filter(id => id !== employeeId)
        }));
        saveBusinessData(businessData);
    },

    addService: async (service: Service): Promise<Service> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        businessData.services.push(service);
        saveBusinessData(businessData);
        return service;
    },

    updateService: async (updatedService: Service): Promise<Service> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        businessData.services = businessData.services.map(s => s.id === updatedService.id ? updatedService : s);
        saveBusinessData(businessData);
        return updatedService;
    },

    deleteService: async (serviceId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Lógica de Validación de Integridad ---
        const today = new Date().toISOString().split('T')[0];
        const hasFutureBookings = bookingsData.some(b => b.date >= today && b.services.some(s => s.id === serviceId));

        if (hasFutureBookings) {
            throw new Error(`No se puede eliminar el servicio porque tiene reservas futuras.`);
        }

        businessData.services = businessData.services.filter(s => s.id !== serviceId);
        saveBusinessData(businessData);
    },

    // --- Funciones de utilidad para Testing ---
    loadDataForTests: () => {
        businessData = loadBusinessData();
        bookingsData = loadBookingsData();
    }
};