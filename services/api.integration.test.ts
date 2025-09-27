import { mockBackend } from './mockBackend';
import { getAvailableSlots } from './api';
import { Business, Booking, Service, Employee } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { MOCK_BOOKINGS } from './mockData';

// Helper para clonar profundamente los datos y evitar la mutación entre pruebas
const clone = <T>(data: T): T => JSON.parse(JSON.stringify(data));

describe('API Integration Tests - Business Logic', () => {
    let testBusinessData: Business;
    let testBookingsData: Booking[];

    beforeEach(() => {
        // Limpiar localStorage para asegurar un estado limpio
        localStorage.clear();

        // Cargar un conjunto de datos predecible antes de cada prueba
        testBusinessData = clone(INITIAL_BUSINESS_DATA);
        testBookingsData = clone(MOCK_BOOKINGS);

        // Sembrar datos en el mockBackend (simulando una base de datos limpia)
        // Nota: Esto se hace accediendo directamente a las funciones de guardado del mockBackend,
        // lo cual es aceptable para tests de integración.
        localStorage.setItem('businessData', JSON.stringify(testBusinessData));
        localStorage.setItem('bookingsData', JSON.stringify(testBookingsData));

        // Recargar los datos en el backend para que use nuestro estado sembrado
        mockBackend.loadDataForTests(); 
    });

    describe('Booking Creation Scenarios', () => {
        it('should return no available slots if the employee does not offer the selected service', async () => {
            // Escenario: Intentar reservar "Lavado Premium" (s3) con "Lucía" (e2).
            // Modificamos los datos de prueba para asegurar que "Lucía" NO ofrece "Lavado Premium".
            const serviceToModify = testBusinessData.services.find(s => s.id === 's3');
            if (serviceToModify) {
                serviceToModify.employeeIds = serviceToModify.employeeIds.filter(id => id !== 'e2');
            }

            const service = testBusinessData.services.find(s => s.id === 's3'); // Lavado Premium
            const employeeId = 'e2'; // Lucía
            const date = new Date(); // Fecha de hoy

            expect(service).toBeDefined();
            if (!service) return;

            // Ahora esta aserción es correcta gracias a la modificación de los datos de prueba.
            expect(service.employeeIds.includes(employeeId)).toBe(false);

            const slots = await getAvailableSlots(date, [service], testBusinessData, employeeId);

            // El resultado debe ser un array vacío porque la combinación es inválida.
            expect(slots).toEqual([]);
        });

        it('should return no available slots if the business is closed on that day', async () => {
            // Escenario: Intentar reservar en domingo, que está deshabilitado.
            const service = testBusinessData.services.find(s => s.id === 's1'); // Lavado Básico
            const employeeId = 'e1'; // Carlos
            
            // Forzar la fecha a ser un domingo
            let date = new Date();
            date.setDate(date.getDate() + (7 - date.getDay())); // Ir al próximo domingo
            
            expect(date.getDay()).toBe(0); // 0 = Domingo
            expect(testBusinessData.hours.sunday.enabled).toBe(false);
            expect(service).toBeDefined();
            if (!service) return;

            const slots = await getAvailableSlots(date, [service], testBusinessData, employeeId);

            expect(slots).toEqual([]);
        });

        it('should not return slots that conflict with an existing booking', async () => {
            // Escenario: "Carlos" (e1) tiene una reserva de 10:00 a 11:00 en una fecha específica.
            const testDate = new Date('2025-10-20T10:00:00.000Z'); // Lunes
            const testDateString = testDate.toISOString().split('T')[0];

            // Modificar la reserva existente para que coincida con nuestra fecha de prueba
            const bookingIndex = testBookingsData.findIndex(b => b.id === 'res_1');
            if (bookingIndex !== -1) {
                testBookingsData[bookingIndex].date = testDateString;
                testBookingsData[bookingIndex].start = '10:00';
                testBookingsData[bookingIndex].end = '11:00';
                testBookingsData[bookingIndex].employeeId = 'e1';
            }
            
            // Recargar el backend con los datos modificados
            localStorage.setItem('bookingsData', JSON.stringify(testBookingsData));
            mockBackend.loadDataForTests();

            const service = testBusinessData.services.find(s => s.id === 's1'); // Lavado Básico (30 min)
            const employeeId = 'e1'; // Carlos

            expect(service).toBeDefined();
            if (!service) return;

            const slots = await getAvailableSlots(testDate, [service], testBusinessData, employeeId);

            // El turno de las 10:00 no debería estar.
            // Tampoco 10:30, porque un servicio de 30 min empezando a las 10:30 chocaría con la reserva que termina a las 11:00.
            // El de las 09:30 sí debería estar, porque termina a las 10:00.
            expect(slots).not.toContain('10:00');
            expect(slots).not.toContain('10:30');
            expect(slots).toContain('09:30');
            expect(slots).toContain('11:00');
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

            await mockBackend.createBooking(newBooking);

            // Ahora, intentamos modificar el horario del Lunes para que cierre antes de la reserva.
            const updatedBusinessData = clone(testBusinessData);
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

            await mockBackend.createBooking(newBooking);

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

            await mockBackend.createBooking(newBooking);

            // Esperamos que esta operación falle.
            await expect(mockBackend.deleteService('s1'))
                .rejects
                .toThrow('No se puede eliminar el servicio porque tiene reservas futuras.');
        });
    });

    describe('Business Hours Validation Scenarios', () => {
        it('should throw an error if an interval is invalid (start >= end)', async () => {
            const invalidBusinessData = clone(testBusinessData);
            invalidBusinessData.hours.monday.intervals = [{ open: '14:00', close: '12:00' }];

            await expect(mockBackend.updateBusinessData(invalidBusinessData))
                .rejects
                .toThrow('El horario de inicio debe ser anterior al de fin para el día monday.');
        });

        it('should throw an error if intervals overlap', async () => {
            const overlappingBusinessData = clone(testBusinessData);
            overlappingBusinessData.hours.tuesday.intervals = [
                { open: '09:00', close: '12:00' },
                { open: '11:00', close: '15:00' } // Solapamiento de 11:00 a 12:00
            ];

            await expect(mockBackend.updateBusinessData(overlappingBusinessData))
                .rejects
                .toThrow('Los intervalos de horario para el día tuesday se solapan.');
        });
    });
});