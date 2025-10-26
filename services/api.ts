import { Business, Service, Booking, Employee } from '../types';
import { calcularTurnosDisponibles, ReservaOcupada, timeToMinutes, getEffectiveDayHours } from '../utils/availability';
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

    // Si el negocio está cerrado ese día, no hay nada más que hacer.
    if (!businessHoursForDay.enabled) {
        return [];
    }

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
            const effectiveHours = getEffectiveDayHours(emp, businessHoursForDay, dayOfWeek);

            if (!effectiveHours) {
                continue;
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

        const effectiveHours = getEffectiveDayHours(selectedEmployee, businessHoursForDay, dayOfWeek);

        if (!effectiveHours) {
            return [];
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
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as keyof Business['hours'];
    const dateString = date.toISOString().split('T')[0];
    const slotStartMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotStartMinutes + totalDuration;
    const businessHoursForDay = business.hours[dayOfWeek];

    // 1. Find employees qualified for all selected services
    const qualifiedEmployees = business.employees.filter(emp =>
        services.every(service => service.employeeIds.includes(emp.id))
    );

    // 2. Find an employee who is available during the requested slot
    for (const emp of qualifiedEmployees) {
        // A. Check if the employee is scheduled to work during the slot
        const effectiveHours = getEffectiveDayHours(emp, businessHoursForDay, dayOfWeek);
        if (!effectiveHours) {
            continue; // Not scheduled to work at all on this day
        }

        const isWithinWorkingHours = effectiveHours.intervals.some(interval => {
            const intervalStartMinutes = timeToMinutes(interval.open);
            const intervalEndMinutes = timeToMinutes(interval.close);
            return slotStartMinutes >= intervalStartMinutes && slotEndMinutes <= intervalEndMinutes;
        });

        if (!isWithinWorkingHours) {
            continue; // The requested slot is outside of this employee's working hours
        }

        // B. Check for any overlapping booking
        const employeeBookings = business.bookings.filter(
            b => b.employeeId === emp.id && b.date === dateString
        );

        const isOverlapping = employeeBookings.some(booking => {
            const bookingStartMinutes = timeToMinutes(booking.start);
            const bookingEndMinutes = timeToMinutes(booking.end);
            return slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes;
        });

        // If the employee is working and has no overlapping bookings, they are available
        if (!isOverlapping) {
            return emp; // Return the first available employee found
        }
    }

    // If no available employee is found
    return null;
};


import { supabase } from '../lib/supabase';

export const createBookingSafe = async (bookingData: {
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  business_id: string;
  service_ids: string[];
}) => {
  const { data, error } = await supabase.rpc('create_booking_safe', {
    p_employee_id: bookingData.employee_id,
    p_date: bookingData.date,
    p_start: bookingData.start_time,
    p_end: bookingData.end_time,
    p_client_name: bookingData.client_name,
    p_client_phone: bookingData.client_phone,
    p_business_id: bookingData.business_id,
    p_service_ids: bookingData.service_ids
  });
  
  if (error) throw new Error(error.message);
  return data;
};
