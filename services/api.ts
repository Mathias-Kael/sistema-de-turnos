import { Business, Service, Booking, Employee } from '../types';
import { calcularTurnosDisponibles, ReservaOcupada, timeToMinutes } from '../utils/availability';
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

        // Verificar que el empleado seleccionado puede realizar todos los servicios.
        const isQualified = services.every(service => service.employeeIds.includes(selectedEmployee.id));
        if (!isQualified) {
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

/**
 * Finds an available employee for a specific time slot.
 */
export const findAvailableEmployeeForSlot = (
    date: Date,
    slot: string,
    totalDuration: number,
    services: Service[],
    business: Business
): Employee | null => {
    const dateString = date.toISOString().split('T')[0];
    const slotStartMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotStartMinutes + totalDuration;

    // 1. Find employees qualified for all selected services
    const qualifiedEmployees = business.employees.filter(emp =>
        services.every(service => service.employeeIds.includes(emp.id))
    );

    // 2. Find an employee who is available during the requested slot
    for (const emp of qualifiedEmployees) {
        // Find all bookings for this employee on the given day
        const employeeBookings = business.bookings.filter(
            b => b.employeeId === emp.id && b.date === dateString
        );

        // Check for any overlapping booking
        const isOverlapping = employeeBookings.some(booking => {
            const bookingStartMinutes = timeToMinutes(booking.start);
            const bookingEndMinutes = timeToMinutes(booking.end);
            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            return slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes;
        });

        // If there's no overlap, this employee is available
        if (!isOverlapping) {
            return emp; // Return the first available employee found
        }
    }

    // If no available employee is found
    return null;
};
