import { Business, Service, Booking } from '../types';
import { calcularTurnosDisponibles, ReservaOcupada } from '../utils/availability';
import { MOCK_BOOKINGS } from './mockData';

// This is a mock function. In a real application, this would make a network request.
const getBookingsForDate = async (date: Date): Promise<Booking[]> => {
    const dateString = date.toISOString().split('T')[0];
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_BOOKINGS.filter(booking => booking.date === dateString);
};


/**
 * Calculates available time slots for a given day, services, and employee.
 */
export const getAvailableSlots = async (
    date: Date,
    services: Service[],
    business: Business,
    employeeId: string | 'any'
): Promise<string[]> => {
    // 1. Calculate total duration including buffers
    const totalDuration = services.reduce((acc, s) => acc + s.duration + s.buffer, 0);
    if (totalDuration <= 0) {
        return [];
    }

    // 2. Determine the day of the week to get the correct business hours
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as keyof Business['hours'];
    const businessHoursForDay = business.hours[dayOfWeek];

    if (!businessHoursForDay || !businessHoursForDay.enabled) {
        return [];
    }

    // 3. Fetch all bookings for the selected date to check for conflicts
    const allBookingsForDay = await getBookingsForDate(date);

    // 4. Filter bookings to consider only relevant ones for conflict checking.
    // If a specific employee is chosen, we only need to check their schedule.
    // If 'any' employee is chosen, we need to find an employee who can perform all services
    // and then check their availability. For simplicity here, we'll assume that if 'any'
    // is selected, we should check against all bookings. A more complex system might
    // check each available employee's schedule. For this mock, we'll keep it simple:
    // if a specific employee is selected, only their bookings matter. If 'any', all bookings matter
    // as we need to find *any* free slot for *any* qualified employee. The logic in the component
    // already pre-filters employees, so we can trust `employeeId` is valid.
    
    const relevantBookings = (employeeId === 'any')
        ? allBookingsForDay
        : allBookingsForDay.filter(b => b.employeeId === employeeId);

    const occupiedSlots: ReservaOcupada[] = relevantBookings.map(b => ({
        date: b.date,
        start: b.start,
        end: b.end,
    }));
    
    // 5. Calculate available slots using the utility function
    const availableSlots = calcularTurnosDisponibles({
        fecha: date,
        duracionTotal: totalDuration,
        horarioDelDia: businessHoursForDay,
        reservasOcupadas: occupiedSlots,
    });

    return availableSlots;
};
