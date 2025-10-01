import { mockBackend } from './mockBackend';
import { getAvailableSlots, findAvailableEmployeeForSlot } from './api';
import { Business, Booking, Service, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { MOCK_BOOKINGS } from './mockData';

// Helper para clonar profundamente los datos y evitar la mutación entre pruebas
const clone = <T>(data: T): T => JSON.parse(JSON.stringify(data));

describe('API Integration Tests - Business Logic', () => {
    let initialTestBusinessState: Business;

    beforeEach(() => {
        // Limpiar localStorage para asegurar un estado limpio
        localStorage.clear();

        // Cargar un conjunto de datos predecible antes de cada prueba
        // Ahora el estado es unificado, pero sin reservas futuras por defecto para evitar interferencias
        initialTestBusinessState = clone(INITIAL_BUSINESS_DATA);
        initialTestBusinessState.bookings = []; // Vaciar reservas futuras por defecto

        // Sembrar datos en el mockBackend (simulando una base de datos limpia)
        localStorage.setItem('businessData', JSON.stringify(initialTestBusinessState));

        // Recargar los datos en el backend para que use nuestro estado sembrado
        mockBackend.loadDataForTests();
    });

    describe('Booking Creation Scenarios', () => {
        it('should return no available slots if the employee does not offer the selected service', async () => {
            // Escenario: Intentar reservar "Lavado Premium" (s3) con "Lucía" (e2).
            // Modificamos los datos de prueba para asegurar que "Lucía" NO ofrece "Lavado Premium".
            const serviceToModify = initialTestBusinessState.services.find(s => s.id === 's3');
            if (serviceToModify) {
                serviceToModify.employeeIds = serviceToModify.employeeIds.filter(id => id !== 'e2');
            }

            const service = initialTestBusinessState.services.find(s => s.id === 's3'); // Lavado Premium
            const employeeId = 'e2'; // Lucía
            const date = new Date(); // Fecha de hoy

            expect(service).toBeDefined();
            if (!service) return;

            // Ahora esta aserción es correcta gracias a la modificación de los datos de prueba.
            expect(service.employeeIds.includes(employeeId)).toBe(false);

            const slots = await getAvailableSlots(date, [service], initialTestBusinessState, employeeId);

            // El resultado debe ser un array vacío porque la combinación es inválida.
            expect(slots).toEqual([]);
        });

        it('should return no available slots if the business is closed on that day', async () => {
            // Escenario: Intentar reservar en domingo, que está deshabilitado.
            const service = initialTestBusinessState.services.find(s => s.id === 's1'); // Lavado Básico
            const employeeId = 'e1'; // Carlos
            
            // Forzar la fecha a ser un domingo
            let date = new Date();
            date.setDate(date.getDate() + (7 - date.getDay())); // Ir al próximo domingo
            
            expect(date.getDay()).toBe(0); // 0 = Domingo
            expect(initialTestBusinessState.hours.sunday.enabled).toBe(false);
            expect(service).toBeDefined();
            if (!service) return;

            const slots = await getAvailableSlots(date, [service], initialTestBusinessState, employeeId);

            expect(slots).toEqual([]);
        });

        it('should not return slots that conflict with an existing booking', async () => {
            // Escenario: "Carlos" (e1) tiene una reserva de 10:00 a 11:00 en una fecha específica.
            const testDate = new Date('2025-10-20T10:00:00.000Z'); // Lunes
            const testDateString = testDate.toISOString().split('T')[0];

            // Modificar la reserva existente para que coincida con nuestra fecha de prueba
            const updatedBusinessState = clone(initialTestBusinessState);
            // Crear una nueva reserva para este test, ya que initialTestBusinessState.bookings está vacío
            const newConflictingBooking: Booking = {
                id: 'res_1',
                client: { name: 'Juan Perez', email: 'juan.perez@example.com', phone: '1122334455' },
                date: testDateString,
                start: '10:00',
                end: '11:00',
                services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
                employeeId: 'e1',
                status: 'confirmed',
            };
            updatedBusinessState.bookings.push(newConflictingBooking);
            
            // Recargar el backend con los datos modificados
            localStorage.setItem('businessData', JSON.stringify(updatedBusinessState));
            mockBackend.loadDataForTests();

            const service = updatedBusinessState.services.find(s => s.id === 's1'); // Lavado Básico (30 min)
            const employeeId = 'e1'; // Carlos

            expect(service).toBeDefined();
            if (!service) return;

            const slots = await getAvailableSlots(testDate, [service], updatedBusinessState, employeeId);

            // El turno de las 10:00 no debería estar.
            // Tampoco 10:30, porque un servicio de 30 min empezando a las 10:30 chocaría con la reserva que termina a las 11:00.
            // El de las 09:30 sí debería estar, porque termina a las 10:00.
            expect(slots).not.toContain('10:00');
            expect(slots).not.toContain('10:30');
            expect(slots).toContain('09:30');
            expect(slots).toContain('11:00');
        });

        it('should return no slots if business is closed, even if an employee has personal hours', async () => {
            // Escenario: El negocio cierra los martes, pero un empleado se configura un horario personal.
            const businessWithClosedDay = clone(initialTestBusinessState);
            
            // 1. Cerrar el negocio los martes
            businessWithClosedDay.hours.tuesday.enabled = false;
            
            // 2. Darle a un empleado un horario personal ese día
            const employeeWithHours = businessWithClosedDay.employees.find(e => e.id === 'e1')!;
            employeeWithHours.hours = {
                ...employeeWithHours.hours,
                tuesday: { enabled: true, intervals: [{ open: '10:00', close: '12:00' }] }
            };

            // 3. Intentar obtener turnos para ese martes
            const service = businessWithClosedDay.services.find(s => s.id === 's1')!;
            let testDate = new Date();
            const dayOffset = (2 - testDate.getDay() + 7) % 7; // Offset para llegar al próximo martes
            testDate.setDate(testDate.getDate() + dayOffset);

            const slots = await getAvailableSlots(testDate, [service], businessWithClosedDay, 'any');

            // El resultado debe ser vacío porque el negocio está cerrado.
            expect(slots).toEqual([]);
        });
    });

    describe('Entity Modification Scenarios', () => {
        it('should throw an error when updating hours if it conflicts with a future booking', async () => {
            // Escenario: Hay una reserva para el Lunes 2025-10-20 a las 17:00.
            // Intentaremos cambiar el horario del lunes para que cierre a las 16:00.
            const testDate = new Date('2025-10-20T10:00:00.000Z'); // Lunes
            const testDateString = testDate.toISOString().split('T')[0];

            const newBooking: Booking = {
                id: 'future_booking_1',
                client: { name: 'Cliente Futuro', email: 'future@test.com', phone: '123456789' },
                date: testDateString,
                start: '17:00',
                end: '18:00',
                services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
                employeeId: 'e1',
                status: 'confirmed',
            };

            // Crear la reserva directamente en el estado inicial para el test
            const businessWithFutureBooking = clone(initialTestBusinessState);
            businessWithFutureBooking.bookings.push(newBooking);
            localStorage.setItem('businessData', JSON.stringify(businessWithFutureBooking));
            mockBackend.loadDataForTests();

            // Ahora, intentamos modificar el horario del Lunes para que cierre antes de la reserva.
            const updatedBusinessData = clone(businessWithFutureBooking); // Clonar el estado con la reserva
            updatedBusinessData.hours.monday.intervals = [{ open: '09:00', close: '16:00' }];

            // Esperamos que esta operación falle y lance un error.
            await expect(mockBackend.updateBusinessData(updatedBusinessData))
                .rejects
                .toThrow('El nuevo horario para el monday entra en conflicto con la reserva #future_booking_1 de 17:00 a 18:00 el día 2025-10-20.');
        });
    });

    describe('Entity Deletion Scenarios', () => {
        it('should throw an error when deleting an employee with future bookings', async () => {
            // Escenario: El empleado "Carlos" (e1) tiene una reserva futura.
            // Intentaremos eliminarlo.
            const testDate = new Date();
            testDate.setDate(testDate.getDate() + 5); // 5 días en el futuro
            const testDateString = testDate.toISOString().split('T')[0];

            const newBooking: Booking = {
                id: 'future_booking_2',
                client: { name: 'Cliente para Borrado', email: 'delete@test.com', phone: '987654321' },
                date: testDateString,
                start: '11:00',
                end: '12:00',
                services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
                employeeId: 'e1', // Carlos
                status: 'confirmed',
            };

            // Crear la reserva directamente en el estado inicial para el test
            const businessWithFutureBooking = clone(initialTestBusinessState);
            businessWithFutureBooking.bookings.push(newBooking);
            localStorage.setItem('businessData', JSON.stringify(businessWithFutureBooking));
            mockBackend.loadDataForTests();

            // Esperamos que esta operación falle.
            await expect(mockBackend.deleteEmployee('e1'))
                .rejects
                .toThrow('No se puede eliminar el empleado porque tiene reservas futuras.');
        });

        it('should throw an error when deleting a service with future bookings', async () => {
            // Escenario: El servicio "Lavado Básico Exterior" (s1) tiene una reserva futura.
            // Intentaremos eliminarlo.
            const testDate = new Date();
            testDate.setDate(testDate.getDate() + 6); // 6 días en el futuro
            const testDateString = testDate.toISOString().split('T')[0];

            const newBooking: Booking = {
                id: 'future_booking_3',
                client: { name: 'Cliente para Borrado de Servicio', email: 'delete_service@test.com', phone: '111222333' },
                date: testDateString,
                start: '14:00',
                end: '15:00',
                services: [{ id: 's1', name: 'Lavado Básico Exterior', price: 20 }],
                employeeId: 'e1',
                status: 'confirmed',
            };

            // Crear la reserva directamente en el estado inicial para el test
            const businessWithFutureBooking = clone(initialTestBusinessState);
            businessWithFutureBooking.bookings.push(newBooking);
            localStorage.setItem('businessData', JSON.stringify(businessWithFutureBooking));
            mockBackend.loadDataForTests();

            // Esperamos que esta operación falle.
            await expect(mockBackend.deleteService('s1'))
                .rejects
                .toThrow('No se puede eliminar el servicio porque tiene reservas futuras.');
        });
    });

    describe('Business Hours Validation Scenarios', () => {
        it('should throw an error if an interval is invalid (start >= end)', async () => {
            const invalidBusinessData = clone(initialTestBusinessState);
            invalidBusinessData.hours.monday.intervals = [{ open: '14:00', close: '12:00' }];

            await expect(mockBackend.updateBusinessData(invalidBusinessData))
                .rejects
                .toThrow('El horario de inicio debe ser anterior al de fin para el día monday.');
        });

        it('should throw an error if intervals overlap', async () => {
            const overlappingBusinessData = clone(initialTestBusinessState);
            overlappingBusinessData.hours.tuesday.intervals = [
                { open: '09:00', close: '12:00' },
                { open: '11:00', close: '15:00' } // Solapamiento de 11:00 a 12:00
            ];

            await expect(mockBackend.updateBusinessData(overlappingBusinessData))
                .rejects
                .toThrow('Los intervalos de horario para el día tuesday se solapan.');
        });
    });

    describe('findAvailableEmployeeForSlot Scenarios', () => {
        let testDate: Date;
        let service: Service;
        let totalDuration: number;

        beforeEach(() => {
            testDate = new Date('2025-10-20T10:00:00.000Z'); // Lunes
            service = initialTestBusinessState.services.find(s => s.id === 's1')!; // Lavado Básico (30 min)
            totalDuration = service.duration + service.buffer; // 30 + 0 = 30

            // Para estos tests, aseguramos que SOLO Carlos (e1) y Lucía (e2) pueden hacer el servicio 's1'
            const serviceToModify = initialTestBusinessState.services.find(s => s.id === 's1');
            if (serviceToModify) {
                serviceToModify.employeeIds = ['e1', 'e2'];
            }
            localStorage.setItem('businessData', JSON.stringify(initialTestBusinessState));
            mockBackend.loadDataForTests();
        });

        it('should return the first qualified and available employee when multiple are free', () => {
            const availableEmployee = findAvailableEmployeeForSlot(testDate, '10:00', totalDuration, [service], initialTestBusinessState);
            
            // Esperamos que devuelva a Carlos (e1) porque es el primero en la lista de empleados calificados
            expect(availableEmployee).not.toBeNull();
            expect(availableEmployee?.id).toBe('e1');
        });

        it('should return the next available employee if the first one is booked', () => {
            // Escenario: Carlos (e1) tiene una reserva de 10:00 a 10:30
            const businessWithBooking = clone(initialTestBusinessState);
            businessWithBooking.bookings.push({
                id: 'booking-e1',
                date: testDate.toISOString().split('T')[0],
                start: '10:00',
                end: '10:30',
                employeeId: 'e1',
                client: { name: 'Test Client', email: '', phone: '' },
                services: [service],
                status: 'confirmed'
            });

            const availableEmployee = findAvailableEmployeeForSlot(testDate, '10:00', totalDuration, [service], businessWithBooking);

            // Carlos está ocupado, así que debería devolver a Lucía (e2)
            expect(availableEmployee).not.toBeNull();
            expect(availableEmployee?.id).toBe('e2');
        });

        it('should return null if all qualified employees are booked', () => {
            // Escenario: Carlos (e1) y Lucía (e2) tienen reservas que chocan con el slot de 10:00
            const businessWithBookings = clone(initialTestBusinessState);
            businessWithBookings.bookings.push({
                id: 'booking-e1',
                date: testDate.toISOString().split('T')[0],
                start: '09:45',
                end: '10:15', // Ocupa el slot de 10:00
                employeeId: 'e1',
                client: { name: 'Client 1', email: '', phone: '' },
                services: [service],
                status: 'confirmed'
            });
            businessWithBookings.bookings.push({
                id: 'booking-e2',
                date: testDate.toISOString().split('T')[0],
                start: '10:00',
                end: '10:30',
                employeeId: 'e2',
                client: { name: 'Client 2', email: '', phone: '' },
                services: [service],
                status: 'confirmed'
            });

            const availableEmployee = findAvailableEmployeeForSlot(testDate, '10:00', totalDuration, [service], businessWithBookings);

            // Ambos están ocupados, así que no debería encontrar a nadie
            expect(availableEmployee).toBeNull();
        });

        it('should not return an employee who is not qualified for the service', () => {
            // Escenario: Solo Carlos (e1) puede hacer el servicio. Él está ocupado.
            const businessWithBooking = clone(initialTestBusinessState);
            const serviceOnlyForE1 = businessWithBooking.services.find(s => s.id === 's1')!;
            serviceOnlyForE1.employeeIds = ['e1']; // Solo Carlos puede

            businessWithBooking.bookings.push({
                id: 'booking-e1',
                date: testDate.toISOString().split('T')[0],
                start: '10:00',
                end: '10:30',
                employeeId: 'e1',
                client: { name: 'Test Client', email: '', phone: '' },
                services: [serviceOnlyForE1],
                status: 'confirmed'
            });

            const availableEmployee = findAvailableEmployeeForSlot(testDate, '10:00', totalDuration, [serviceOnlyForE1], businessWithBooking);

            // Lucía (e2) está libre, pero no calificada. Carlos está calificado, pero ocupado.
            // El resultado debe ser null.
            expect(availableEmployee).toBeNull();
        });

        it('should return the correct employee when only one is on schedule', () => {
            // Escenario: Carlos (e1) y Lucía (e2) están calificados.
            // Carlos trabaja de 14:00 a 18:00. Lucía de 09:00 a 13:00.
            // El slot solicitado es a las 10:00. Debería elegir a Lucía.
            const businessWithCustomHours = clone(initialTestBusinessState);
            
            const carlos = businessWithCustomHours.employees.find(e => e.id === 'e1')!;
            const lucia = businessWithCustomHours.employees.find(e => e.id === 'e2')!;

            // Horario de Carlos (solo tarde)
            carlos.hours = {
                ...carlos.hours,
                monday: { enabled: true, intervals: [{ open: '14:00', close: '18:00' }] }
            };
            // Horario de Lucía (solo mañana)
            lucia.hours = {
                ...lucia.hours,
                monday: { enabled: true, intervals: [{ open: '09:00', close: '13:00' }] }
            };

            const availableEmployee = findAvailableEmployeeForSlot(testDate, '10:00', totalDuration, [service], businessWithCustomHours);

            // Aunque Carlos es el primero en la lista, no está de turno. Debe devolver a Lucía.
            expect(availableEmployee).not.toBeNull();
            expect(availableEmployee?.id).toBe('e2');
        });
    });

    describe('Advanced findAvailableEmployeeForSlot Scenarios', () => {
        it('should assign the correct employee when their schedules do not overlap', () => {
            // Escenario del bug reportado:
            // Carlos (e1) trabaja de 09:00-18:00. Carla (e2) de 19:00-21:00.
            // El turno es a las 19:00. Debe ser asignado a Carla.
            const businessWithNonOverlappingHours = clone(initialTestBusinessState);
            const service = businessWithNonOverlappingHours.services.find(s => s.id === 's1')!;
            const totalDuration = service.duration + service.buffer;

            const carlos = businessWithNonOverlappingHours.employees.find(e => e.id === 'e1')!;
            const carla = businessWithNonOverlappingHours.employees.find(e => e.id === 'e2')!;
            
            // Asegurarse que ambos están calificados
            service.employeeIds = ['e1', 'e2'];

            // Horario de Carlos (mañana/tarde)
            carlos.hours = {
                ...carlos.hours,
                monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] }
            };
            // Horario de Carla (noche)
            carla.hours = {
                ...carla.hours,
                monday: { enabled: true, intervals: [{ open: '19:00', close: '21:00' }] }
            };

            const testDate = new Date('2025-10-20T10:00:00.000Z'); // Lunes

            // Primero, verificamos que getAvailableSlots ofrece el turno de las 19:00 (gracias a Carla)
            const availableSlots = getAvailableSlots(testDate, [service], businessWithNonOverlappingHours, 'any');
            expect(availableSlots).resolves.toContain('19:00');

            // Ahora, el test clave: a quién se le asigna el turno de las 19:00.
            const assignedEmployee = findAvailableEmployeeForSlot(testDate, '19:00', totalDuration, [service], businessWithNonOverlappingHours);

            // Debe ser Carla (e2), no Carlos (e1).
            expect(assignedEmployee).not.toBeNull();
            expect(assignedEmployee?.id).toBe('e2');
        });

        it('should assign correct employee when one has a split schedule (bug reproduction)', () => {
            // Escenario del bug reportado con el horario partido de Carlos.
            const businessData = clone(initialTestBusinessState);
            const service = businessData.services.find(s => s.id === 's1')!;
            const totalDuration = service.duration + service.buffer;

            const carlos = businessData.employees.find(e => e.id === 'e1')!;
            const carla = businessData.employees.find(e => e.id === 'e2')!;
            
            service.employeeIds = ['e1', 'e2'];

            // Horario de Carlos para el Jueves (con hueco de 17:00 a 20:00)
            carlos.hours = {
                ...carlos.hours,
                thursday: { enabled: true, intervals: [
                    { open: '09:00', close: '12:00' },
                    { open: '12:10', close: '17:00' },
                    { open: '20:00', close: '23:59' }
                ]}
            };
            // Horario de Carla para el Jueves (cubre el hueco)
            carla.hours = {
                ...carla.hours,
                thursday: { enabled: true, intervals: [{ open: '17:00', close: '21:00' }] }
            };

            // Forzar la fecha a ser un Jueves (ej. 2 de Octubre de 2025)
            const testDate = new Date('2025-10-02T12:00:00.000Z'); // Jueves
            
            // Test clave: a quién se le asigna el turno de las 18:00.
            const assignedEmployee = findAvailableEmployeeForSlot(testDate, '18:00', totalDuration, [service], businessData);

            // Debe ser Carla (e2), no Carlos (e1).
            // Esta es la aserción que esperamos que falle.
            expect(assignedEmployee).not.toBeNull();
            expect(assignedEmployee?.id).toBe('e2');
        });
    });
});