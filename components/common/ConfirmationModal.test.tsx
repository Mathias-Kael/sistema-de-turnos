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
  logoUrl: '',
  phone,
  branding: { primaryColor: '#000', secondaryColor: '#fff', textColor: '#000', font: 'Arial' },
  employees,
  services: [],
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
  name: 'Corte',
  description: '',
  duration: 30,
  buffer: 0,
  price: 1000,
  employeeIds: ['e1']
};

describe('ConfirmationModal WhatsApp destino', () => {
  it('usa el whatsapp del empleado cuando está disponible', async () => {
    const baseHours = buildBusiness([]).hours;
    const business = buildBusiness([
      { id: 'e1', name: 'Carlos', avatarUrl: '', whatsapp: '+54 9 11 2222 3333', hours: baseHours }
    ]);

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[mockService]}
        employeeId="e1"
        business={business}
        onClose={() => {}}
      />
    );
    // Completar formulario mínimo y confirmar
    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Juan');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 5555 0000');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    // Esperar a la pantalla de confirmación
    await waitFor(() => {
      expect(screen.getByText(/Confirmar con el empleado/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Contacto directo con Carlos/i)).toBeInTheDocument();
  });

  it('hace fallback al negocio cuando el empleado no tiene whatsapp', async () => {
    const baseHours = buildBusiness([]).hours;
    const business = buildBusiness([
      { id: 'e1', name: 'Lucía', avatarUrl: '', hours: baseHours }
    ]);

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[{ ...mockService, employeeIds: ['e1'] }]}
        employeeId="e1"
        business={business}
        onClose={() => {}}
      />
    );
    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Lucia Cliente');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 4444 2222');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));
    await waitFor(() => {
      expect(screen.getByText(/Confirmar por WhatsApp/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/número general del negocio/i)).toBeInTheDocument();
  });

  it('usa wa.me/?text= cuando no hay teléfono de negocio ni de empleado', async () => {
    const baseHours = buildBusiness([]).hours;
    // Empleado sin whatsapp y negocio sin phone
    const businessSinTelefono = buildBusiness([
      { id: 'e1', name: 'Ana', avatarUrl: '', hours: baseHours }
    ], '');

    render(
      <ConfirmationModal
        date={new Date('2025-10-10T12:00:00')}
        slot="10:00"
        selectedServices={[{ ...mockService, employeeIds: ['e1'] }]}
        employeeId="e1"
        business={businessSinTelefono}
        onClose={() => {}}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nombre Completo/i), 'Pepe');
    await userEvent.type(screen.getByLabelText(/Teléfono \(WhatsApp\)/i), '+54 9 11 9999 0000');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar Reserva/i }));

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Confirmar por WhatsApp/i });
      expect(link).toHaveAttribute('href');
      const href = link.getAttribute('href') || '';
      expect(href.startsWith('https://wa.me/?text=')).toBe(true);
      // Debe contener texto codificado con "Hola" al menos
      expect(decodeURIComponent(href)).toMatch(/Hola/);
    });
  });
});
