import { getAvailableSlots, findAvailableEmployeeForSlot } from './api';
import { Business, Service, Booking } from '../types';

describe('API - Cancelled Bookings Filter', () => {
  const mockBusiness: Business = {
    id: 'business-1',
    name: 'Test Business',
    description: 'Test',
    phone: '123456789',
    branding: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d', 
      textColor: '#ffffff',
      font: 'Arial'
    },
    employees: [{
      id: 'emp-1',
      businessId: 'business-1',
      name: 'Juan Pérez',
      avatarUrl: '',
      hours: {
        monday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
        tuesday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
        wednesday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
        thursday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
        friday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
        saturday: { enabled: false, intervals: [] },
        sunday: { enabled: false, intervals: [] }
      }
    }],
    services: [{
      id: 'service-1',
      businessId: 'business-1',
      name: 'Corte de cabello',
      description: 'Corte profesional',
      duration: 30,
      buffer: 10,
      price: 1500,
      employeeIds: ['emp-1']
    }],
    categories: [],
    hours: {
      monday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
      tuesday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
      wednesday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
      thursday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
      friday: { enabled: true, intervals: [{ open: '09:00', close: '17:00' }] },
      saturday: { enabled: false, intervals: [] },
      sunday: { enabled: false, intervals: [] }
    },
    bookings: []
  };

  const mockServices: Service[] = [mockBusiness.services[0]];
  const testDate = new Date('2024-01-15'); // Lunes

  describe('getAvailableSlots - cancelled bookings', () => {
    it('should show slot as available when booking is cancelled', async () => {
      // Reserva cancelada no debe bloquear el slot
      const businessWithCancelledBooking: Business = {
        ...mockBusiness,
        bookings: [{
          id: 'booking-1',
          businessId: 'business-1',
          client: { name: 'Cliente Test', phone: '987654321' },
          date: '2024-01-15',
          start: '10:00',
          end: '10:40',
          services: [],
          employeeId: 'emp-1',
          status: 'cancelled' // ✅ Estado cancelado
        }]
      };

      const slots = await getAvailableSlots(testDate, mockServices, businessWithCancelledBooking, 'emp-1');
      
      // El slot 10:00 debe estar disponible porque la reserva está cancelada
      expect(slots).toContain('10:00');
    });

    it('should NOT show slot as available when booking is confirmed', async () => {
      // Reserva confirmada SÍ debe bloquear el slot
      const businessWithConfirmedBooking: Business = {
        ...mockBusiness,
        bookings: [{
          id: 'booking-1',
          businessId: 'business-1',
          client: { name: 'Cliente Test', phone: '987654321' },
          date: '2024-01-15',
          start: '10:00',
          end: '10:40',
          services: [],
          employeeId: 'emp-1',
          status: 'confirmed' // ✅ Estado confirmado
        }]
      };

      const slots = await getAvailableSlots(testDate, mockServices, businessWithConfirmedBooking, 'emp-1');
      
      // El slot 10:00 NO debe estar disponible porque la reserva está confirmada
      expect(slots).not.toContain('10:00');
    });

    it('should handle mix of cancelled and confirmed bookings correctly', async () => {
      const businessWithMixedBookings: Business = {
        ...mockBusiness,
        bookings: [
          {
            id: 'booking-1',
            businessId: 'business-1',
            client: { name: 'Cliente 1', phone: '111111111' },
            date: '2024-01-15',
            start: '10:00',
            end: '10:40',
            services: [],
            employeeId: 'emp-1',
            status: 'cancelled' // ✅ Cancelada - slot debe estar disponible
          },
          {
            id: 'booking-2',
            businessId: 'business-1',
            client: { name: 'Cliente 2', phone: '222222222' },
            date: '2024-01-15',
            start: '11:00',
            end: '11:40',
            services: [],
            employeeId: 'emp-1',
            status: 'confirmed' // ✅ Confirmada - slot NO debe estar disponible
          }
        ]
      };

      const slots = await getAvailableSlots(testDate, mockServices, businessWithMixedBookings, 'emp-1');
      
      expect(slots).toContain('10:00'); // Disponible porque reserva está cancelada
      expect(slots).not.toContain('11:00'); // NO disponible porque reserva está confirmada
    });
  });

  describe('findAvailableEmployeeForSlot - cancelled bookings', () => {
    it('should find employee available when their booking is cancelled', () => {
      const businessWithCancelledBooking: Business = {
        ...mockBusiness,
        bookings: [{
          id: 'booking-1',
          businessId: 'business-1',
          client: { name: 'Cliente Test', phone: '987654321' },
          date: '2024-01-15',
          start: '10:00',
          end: '10:40',
          services: [],
          employeeId: 'emp-1',
          status: 'cancelled' // ✅ Estado cancelado
        }]
      };

      const availableEmployee = findAvailableEmployeeForSlot(
        testDate,
        '10:00',
        40, // duración total
        mockServices,
        businessWithCancelledBooking
      );
      
      // Empleado debe estar disponible porque su reserva está cancelada
      expect(availableEmployee).not.toBeNull();
      expect(availableEmployee?.id).toBe('emp-1');
    });

    it('should NOT find employee available when their booking is confirmed', () => {
      const businessWithConfirmedBooking: Business = {
        ...mockBusiness,
        bookings: [{
          id: 'booking-1',
          businessId: 'business-1',
          client: { name: 'Cliente Test', phone: '987654321' },
          date: '2024-01-15',
          start: '10:00',
          end: '10:40',
          services: [],
          employeeId: 'emp-1',
          status: 'confirmed' // ✅ Estado confirmado
        }]
      };

      const availableEmployee = findAvailableEmployeeForSlot(
        testDate,
        '10:00',
        40, // duración total
        mockServices,
        businessWithConfirmedBooking
      );
      
      // Empleado NO debe estar disponible porque su reserva está confirmada
      expect(availableEmployee).toBeNull();
    });
  });
});