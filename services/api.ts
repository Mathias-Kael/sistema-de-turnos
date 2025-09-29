import { Business, Service, Booking, Employee } from '../types';
import { calcularTurnosDisponibles, ReservaOcupada } from '../utils/availability';
// import { mockBackend } from './mockBackend'; // No longer needed for getAvailableSlots

/**
 * Calculates available time slots for a given day, services, and employee.
 */
export const getAvailableSlots = async (
    date: Date,
    services: Service[],
    business: Business, // Ahora usa este objeto Business para obtener las reservas
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

    // 3. Obtener todas las reservas para la fecha seleccionada directamente del objeto Business
    const dateString = date.toISOString().split('T')[0];
    const allBookingsForDay = business.bookings.filter(booking => booking.date === dateString);

    // 4. Calculate available slots based on employee selection.
    let finalAvailableSlots: Set<string> = new Set();

    if (employeeId === 'any') {
        const qualifiedEmployees = business.employees.filter(emp =>
            services.every(service => service.employeeIds.includes(emp.id))
        );

        for (const emp of qualifiedEmployees) {
            const employeeHoursForDay = emp.hours?.[dayOfWeek];
            const effectiveHours = (employeeHoursForDay && employeeHoursForDay.enabled)
                ? employeeHoursForDay
                : businessHoursForDay;

            if (!effectiveHours || !effectiveHours.enabled || effectiveHours.intervals.length === 0) {
                continue; // Si no hay horarios definidos, no hay slots disponibles
            }

            const employeeBookings = allBookingsForDay.filter(b => b.employeeId === emp.id);
            const occupiedSlots: ReservaOcupada[] = employeeBookings.map(b => ({
                date: b.date,
                start: b.start,
                end: b.end,
            }));

            const slotsForEmployee = calcularTurnosDisponibles({
                fecha: date,
                duracionTotal: totalDuration,
                horarioDelDia: effectiveHours,
                reservasOcupadas: occupiedSlots,
            });
            slotsForEmployee.forEach(slot => finalAvailableSlots.add(slot));
        }
    } else {
        const selectedEmployee = business.employees.find(emp => emp.id === employeeId);
        if (!selectedEmployee) {
            return [];
        }

        const employeeHoursForDay = selectedEmployee.hours?.[dayOfWeek];
        const effectiveHours = (employeeHoursForDay && employeeHoursForDay.enabled)
            ? employeeHoursForDay
            : businessHoursForDay;

        if (!effectiveHours || !effectiveHours.enabled || effectiveHours.intervals.length === 0) {
            return []; // Si no hay horarios definidos, no hay slots disponibles
        }

        const relevantBookings = allBookingsForDay.filter(b => b.employeeId === employeeId);
        const occupiedSlots: ReservaOcupada[] = relevantBookings.map(b => ({
            date: b.date,
            start: b.start,
            end: b.end,
        }));

        const slots = calcularTurnosDisponibles({
            fecha: date,
            duracionTotal: totalDuration,
            horarioDelDia: effectiveHours,
            reservasOcupadas: occupiedSlots,
        });
        slots.forEach(slot => finalAvailableSlots.add(slot));
    }

    // 5. Return sorted unique available slots
    return Array.from(finalAvailableSlots).sort();
};
