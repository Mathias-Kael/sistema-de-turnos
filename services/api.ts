import { Business, Service, Booking } from '../types';
import { calcularTurnosDisponibles, ReservaOcupada } from '../utils/availability';
import { mockBackend } from './mockBackend';

// This is a mock function. In a real application, this would make a network request.
const getBookingsForDate = async (date: Date): Promise<Booking[]> => {
    const dateString = date.toISOString().split('T')[0];
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockBackend.getBookingsForDate(dateString);
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

    // 4. Calculate available slots based on employee selection.
    let finalAvailableSlots: Set<string> = new Set();

    if (employeeId === 'any') {
        // Find employees who can perform all selected services
        const qualifiedEmployees = business.employees.filter(emp =>
            services.every(service => service.employeeIds.includes(emp.id))
        );

        for (const emp of qualifiedEmployees) {
            const employeeBookings = allBookingsForDay.filter(b => b.employeeId === emp.id);
            const occupiedSlots: ReservaOcupada[] = employeeBookings.map(b => ({
                date: b.date,
                start: b.start,
                end: b.end,
            }));

            const slotsForEmployee = calcularTurnosDisponibles({
                fecha: date,
                duracionTotal: totalDuration,
                horarioDelDia: businessHoursForDay,
                reservasOcupadas: occupiedSlots,
            });
            slotsForEmployee.forEach(slot => finalAvailableSlots.add(slot));
        }
    } else {
        // Specific employee selected, use existing logic
        const relevantBookings = allBookingsForDay.filter(b => b.employeeId === employeeId);
        const occupiedSlots: ReservaOcupada[] = relevantBookings.map(b => ({
            date: b.date,
            start: b.start,
            end: b.end,
        }));

        const slots = calcularTurnosDisponibles({
            fecha: date,
            duracionTotal: totalDuration,
            horarioDelDia: businessHoursForDay,
            reservasOcupadas: occupiedSlots,
        });
        slots.forEach(slot => finalAvailableSlots.add(slot));
    }

    // 5. Return sorted unique available slots
    return Array.from(finalAvailableSlots).sort();
};
