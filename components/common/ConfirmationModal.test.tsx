import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationModal } from './ConfirmationModal';
import { Business, Service, Employee } from '../../types';

// Mock del dispatch del contexto para que el componente no requiera BusinessProvider real
jest.mock('../../context/BusinessContext', () => ({
  useBusinessDispatch: () => async () => {},
}));

// Helper mínimo para construir un Business de prueba
const buildBusiness = (employees: Employee[], phone = '5491112345678'): Business => ({
  id: 'b1',
  name: 'Salon Test',
  description: 'Desc',
  profileImageUrl: '',
  phone,
  branding: { primaryColor: '#000', secondaryColor: '#fff', textColor: '#000', font: 'Arial' },
  employees,
  services: [],
  categories: [],
  hours: {
    monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    friday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    saturday: { enabled: false, intervals: [] },
    sunday: { enabled: false, intervals: [] },
  },
  bookings: []
});

const mockService: Service = {
  id: 's1',
  businessId: 'b1',
  name: 'Corte',
  description: '',
  duration: 30,
  buffer: 0,
  price: 1000,
  employeeIds: ['e1']
};

describe('ConfirmationModal WhatsApp destino', () => {
  // Mock window.open
  const mockWindowOpen = jest.fn();
  let originalWindowOpen: any;

  beforeAll(() => {
    originalWindowOpen = window.open;
    window.open = mockWindowOpen;
  });

  afterAll(() => {
    window.open = originalWindowOpen;
  });

  beforeEach(() => {
    mockWindowOpen.mockClear();
  });

  it('usa el whatsapp del empleado cuando está disponible', async () => {
    const baseHours = buildBusiness([]).hours;
    const business = buildBusiness([
      { id: 'e1', businessId: 'b1', name: 'Carlos', avatarUrl: '', whatsapp: '+54 9 11 2222 3333', hours: baseHours }
    ]);
    const mockOnClose = jest.fn();

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[mockService]}
        employeeId="e1"
        business={business}
        onClose={mockOnClose}
      />
    );
    // Completar formulario mínimo y confirmar
    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 5555 0000');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me/5491122223333'), '_blank');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('hace fallback al negocio cuando el empleado no tiene whatsapp', async () => {
    const baseHours = buildBusiness([]).hours;
    const business = buildBusiness([
      { id: 'e1', businessId: 'b1', name: 'Lucía', avatarUrl: '', hours: baseHours }
    ]);
    const mockOnClose = jest.fn();

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[{ ...mockService, employeeIds: ['e1'] }]}
        employeeId="e1"
        business={business}
        onClose={mockOnClose}
      />
    );
    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Lucia Cliente');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 4444 2222');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me/5491112345678'), '_blank');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('usa wa.me/?text= cuando no hay teléfono de negocio ni de empleado', async () => {
    const baseHours = buildBusiness([]).hours;
    // Empleado sin whatsapp y negocio sin phone
    const businessSinTelefono = buildBusiness([
      { id: 'e1', businessId: 'b1', name: 'Ana', avatarUrl: '', hours: baseHours }
    ], '');
    const mockOnClose = jest.fn();

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[{ ...mockService, employeeIds: ['e1'] }]}
        employeeId="e1"
        business={businessSinTelefono}
        onClose={mockOnClose}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Pepe');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 9999 0000');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('wa.me/?text=');
      expect(decodeURIComponent(url)).toMatch(/Hola Salon Test/);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
