import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceDescriptionModal } from './ServiceDescriptionModal';
import { Service } from '../../types';
import { LayoutProvider } from '../../contexts/LayoutContext';

// Mock window.history para tests de navegación back
const mockHistoryPushState = jest.fn();
const mockHistoryBack = jest.fn();

beforeAll(() => {
    Object.defineProperty(window, 'history', {
        value: {
            pushState: mockHistoryPushState,
            back: mockHistoryBack,
            state: {},
        },
        writable: true,
    });
});

beforeEach(() => {
    mockHistoryPushState.mockClear();
    mockHistoryBack.mockClear();
});

// Helper para renderizar con LayoutProvider
const renderWithLayout = (ui: React.ReactElement, isInAdminPreview = false) => {
    return render(
        <LayoutProvider isInAdminPreview={isInAdminPreview}>
            {ui}
        </LayoutProvider>
    );
};

const mockService: Service = {
    id: 's1',
    businessId: 'b1',
    name: 'Corte de pelo premium',
    description: 'Servicio de corte de pelo profesional con lavado incluido. Realizamos cortes clásicos, modernos y personalizados según tu estilo. Incluye asesoramiento de imagen.',
    duration: 60,
    buffer: 0,
    price: '$5000',
    employeeIds: [],
    requiresDeposit: true,
};

describe('ServiceDescriptionModal', () => {
    it('debe renderizar correctamente con datos del servicio', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();

        renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        // Verificar título
        expect(screen.getByText('Corte de pelo premium')).toBeInTheDocument();

        // Verificar descripción completa
        expect(screen.getByText(/Servicio de corte de pelo profesional/)).toBeInTheDocument();

        // Verificar metadata (formatDuration convierte 60 min a "1h")
        expect(screen.getByText('1h')).toBeInTheDocument();
        expect(screen.getByText('$5000')).toBeInTheDocument();
        expect(screen.getByText('Requiere seña')).toBeInTheDocument();

        // Verificar botones
        expect(screen.getAllByRole('button', { name: /cerrar/i })).toHaveLength(2); // Header + Footer
        expect(screen.getByRole('button', { name: /seleccionar servicio/i })).toBeInTheDocument();
    });

    it('debe cerrar modal al hacer click en botón Cerrar del footer', async () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();
        const user = userEvent.setup();

        renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        // Obtener el botón "Cerrar" del footer (segundo elemento)
        const closeButtons = screen.getAllByRole('button', { name: /cerrar/i });
        await user.click(closeButtons[1]);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('debe ejecutar onConfirm y cerrar al hacer click en Seleccionar servicio', async () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();
        const user = userEvent.setup();

        renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        const confirmButton = screen.getByRole('button', { name: /seleccionar servicio/i });
        await user.click(confirmButton);

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar modal al presionar tecla Escape', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();

        renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        // Simular presión de Escape
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('debe push estado al history para capturar back button', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();

        renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        expect(mockHistoryPushState).toHaveBeenCalledWith(
            { modal: 'service-description', __modalInternal: true },
            ''
        );
    });

    it('debe prevenir scroll del body cuando está abierto', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();

        const { unmount } = renderWithLayout(
            <ServiceDescriptionModal
                service={mockService}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        expect(document.body.style.overflow).toBe('hidden');

        unmount();

        expect(document.body.style.overflow).toBe('');
    });

    it('debe renderizar servicio sin seña correctamente', () => {
        const serviceWithoutDeposit: Service = {
            ...mockService,
            requiresDeposit: false,
        };

        const onClose = jest.fn();
        const onConfirm = jest.fn();

        renderWithLayout(
            <ServiceDescriptionModal
                service={serviceWithoutDeposit}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        expect(screen.queryByText('Requiere seña')).not.toBeInTheDocument();
    });

    it('debe renderizar descripción vacía con mensaje por defecto', () => {
        const serviceNoDescription: Service = {
            ...mockService,
            description: '',
        };

        const onClose = jest.fn();
        const onConfirm = jest.fn();

        renderWithLayout(
            <ServiceDescriptionModal
                service={serviceNoDescription}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );

        expect(screen.getByText('Sin descripción disponible.')).toBeInTheDocument();
    });
});
