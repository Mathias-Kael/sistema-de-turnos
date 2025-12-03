import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentInfoModal } from './PaymentInfoModal';
import { Business, Service } from '../../types';

// Mock buildWhatsappUrl
jest.mock('../../utils/whatsapp', () => ({
  buildWhatsappUrl: jest.fn((phone: string, message: string) => 
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  ),
}));

const mockBusiness: Business = {
  id: 'biz1',
  name: 'Test Business',
  description: 'Test',
  phone: '1234567890',
  paymentAlias: 'test.alias.mp',
  paymentCbu: '1234567890123456789012',
  depositInfo: 'Transferir 50% del total',
  branding: {
    primaryColor: '#000',
    secondaryColor: '#fff',
    textColor: '#000',
    font: 'Arial'
  },
  employees: [],
  services: [],
  categories: [],
  hours: {} as any,
  bookings: [],
};

const mockServices: Service[] = [
  {
    id: 's1',
    businessId: 'biz1',
    name: 'Test Service',
    description: '',
    duration: 60,
    buffer: 0,
    price: 100,
    requiresDeposit: true,
    employeeIds: [],
  }
];

const mockDate = new Date('2025-12-10');

describe('PaymentInfoModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza correctamente con datos de pago', () => {
    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('¿Cómo vas a pagar la seña?')).toBeInTheDocument();
    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
  });

  it('muestra mensaje de advertencia si no hay payment data', () => {
    const businessWithoutPayment = { ...mockBusiness, paymentAlias: undefined, paymentCbu: undefined };
    
    render(
      <PaymentInfoModal
        business={businessWithoutPayment}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Información no disponible/i)).toBeInTheDocument();
  });

  it('flujo efectivo: permite seleccionar y confirmar', () => {
    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Click en efectivo
    const efectivoButton = screen.getByRole('button', { name: /Efectivo/i });
    fireEvent.click(efectivoButton);

    // Debe aparecer botón confirmar
    const confirmarButton = screen.getByRole('button', { name: /Confirmar y Avisar/i });
    expect(confirmarButton).toBeInTheDocument();

    // Click en confirmar
    fireEvent.click(confirmarButton);

    // Debe llamar onConfirm con 'efectivo'
    expect(mockOnConfirm).toHaveBeenCalledWith('efectivo');
  });

  it('flujo transferencia: muestra datos bancarios', () => {
    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Click en transferencia
    const transferenciaButton = screen.getByRole('button', { name: /Transferencia/i });
    fireEvent.click(transferenciaButton);

    // Debe mostrar alias y CBU
    expect(screen.getByDisplayValue('test.alias.mp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890123456789012')).toBeInTheDocument();
    expect(screen.getByText('Transferir 50% del total')).toBeInTheDocument();
  });

  it('copy functionality: muestra wallet buttons después de copiar', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Seleccionar transferencia
    fireEvent.click(screen.getByRole('button', { name: /Transferencia/i }));

    // Click en copiar alias
    const copiarButtons = screen.getAllByRole('button', { name: /Copiar/i });
    fireEvent.click(copiarButtons[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.alias.mp');
    });

    // Wallet buttons deben aparecer
    await waitFor(() => {
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
      expect(screen.getByText('Ualá')).toBeInTheDocument();
    });
  });

  it('permite volver a opciones desde cualquier método', () => {
    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Seleccionar efectivo
    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));

    // Click en volver
    const volverButtons = screen.getAllByRole('button', { name: /Volver/i });
    fireEvent.click(volverButtons[0]);

    // Debe mostrar opciones nuevamente
    expect(screen.getByText('¿Cómo vas a pagar la seña?')).toBeInTheDocument();
  });

  it('botón cancelar cierra el modal', () => {
    render(
      <PaymentInfoModal
        business={mockBusiness}
        totalAmount={100}
        selectedServices={mockServices}
        date={mockDate}
        slot="10:00"
        clientName="Test Client"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const volverButton = screen.getByRole('button', { name: /Volver/i });
    fireEvent.click(volverButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
