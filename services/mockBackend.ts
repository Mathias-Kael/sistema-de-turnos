import { Business, Booking, Service, Employee, DayHours, Interval } from '../types';
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
        // Asignar un ID simple para la simulación
        newBooking.id = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        businessData.services = businessData.services.filter(s => s.id !== serviceId);
        saveBusinessData(businessData);
    },
};