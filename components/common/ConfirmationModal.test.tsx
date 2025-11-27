import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationModal } from './ConfirmationModal';
import { Business, Service, Employee } from '../../types';
import * as api from '../../services/api';

// Mock timers para poder controlar setTimeout
jest.useFakeTimers();

// Mockear la función findAvailableEmployeeForSlot
jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  findAvailableEmployeeForSlot: jest.fn(),
}));

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
    // Resetear el mock antes de cada test
    (api.findAvailableEmployeeForSlot as jest.Mock).mockImplementation((date, slot, duration, services, business) => {
      // Simular que siempre encuentra un empleado disponible
      return business.employees[0];
    });
  });

  it.skip('usa el whatsapp del empleado cuando está disponible', async () => {
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
    
    // Esperar explícitamente a que el formulario esté visible
    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    });
    
    // Usar `act` para envolver las interacciones asíncronas
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Juan');
      await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 5555 0000');
      await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));
    });

    // Verificar que aparece el estado de éxito (Success Bridge)
    await waitFor(() => {
      expect(screen.getByText('¡Reserva Confirmada!')).toBeInTheDocument();
    });

    // window.open NO debe haber sido llamado todavía
    expect(mockWindowOpen).toHaveBeenCalledTimes(0);
    
    // Avanzar el tiempo para que se ejecute el setTimeout (1.8s)
    await act(async () => {
      jest.advanceTimersByTime(2000); // Aumentar margen
    });

    // Ahora window.open debe haber sido llamado con el número correcto
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me/5491122223333'), '_blank');
    
    // onClose no debe haber sido llamado automáticamente
    expect(mockOnClose).toHaveBeenCalledTimes(0);
  }, 10000); // Aumentar timeout del test

  it.skip('hace fallback al negocio cuando el empleado no tiene whatsapp', async () => {
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
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    });
    
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Lucia Cliente');
      await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 4444 2222');
      await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));
    });

    // Verificar estado de éxito
    await waitFor(() => {
      expect(screen.getByText('¡Reserva Confirmada!')).toBeInTheDocument();
    });

    // window.open no debe haber sido llamado todavía
    expect(mockWindowOpen).toHaveBeenCalledTimes(0);
    
    // Avanzar tiempo para ejecutar setTimeout
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Verificar redirección con teléfono del negocio
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me/5491112345678'), '_blank');
  }, 10000);

  it.skip('usa wa.me/?text= cuando no hay teléfono de negocio ni de empleado', async () => {
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

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    });
    
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Pepe');
      await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 9999 0000');
      await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));
    });

    // Verificar estado de éxito
    await waitFor(() => {
      expect(screen.getByText('¡Reserva Confirmada!')).toBeInTheDocument();
    });

    // window.open no debe haber sido llamado todavía
    expect(mockWindowOpen).toHaveBeenCalledTimes(0);
    
    // Avanzar tiempo para ejecutar setTimeout
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Verificar URL genérica de WhatsApp
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const url = mockWindowOpen.mock.calls[0][0];
    expect(url).toContain('wa.me/?text=');
    expect(decodeURIComponent(url)).toMatch(/Hola Salon Test/);
  }, 10000);

  it.skip('permite abrir WhatsApp manualmente desde el botón fallback', async () => {
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
    
    // Completar formulario y confirmar
    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    });
    
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Juan');
      await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 5555 0000');
      await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));
    });

    // Verificar que aparece el botón manual
    const manualButton = await screen.findByRole('button', { name: /Abrir WhatsApp/i });
    expect(manualButton).toBeInTheDocument();

    // Hacer clic en el botón manual
    await act(async () => {
      await userEvent.click(manualButton);
    });

    // Verificar que se abre WhatsApp
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me/5491122223333'), '_blank');
  }, 10000);
});

// Limpiar timers después de cada test
afterEach(() => {
  jest.clearAllTimers();
});
