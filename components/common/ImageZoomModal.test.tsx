import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageZoomModal } from './ImageZoomModal';

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

describe('ImageZoomModal', () => {
    const mockImageUrl = 'https://example.com/avatar.jpg';
    const mockAltText = 'Ana García';

    it('debe renderizar correctamente con imagen y alt text', () => {
        const onClose = jest.fn();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', mockImageUrl);
        expect(image).toHaveAttribute('alt', mockAltText);

        // Verificar caption
        expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    it('debe cerrar modal al hacer click en overlay', async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();

        const { container } = render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        // Click en overlay (primer div)
        const overlay = container.firstChild as HTMLElement;
        await user.click(overlay);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar modal al hacer click en botón cerrar', async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        const closeButton = screen.getByRole('button', { name: /cerrar/i });
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('NO debe cerrar al hacer click en la imagen', async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        const image = screen.getByRole('img');
        await user.click(image);

        // No debe llamar onClose porque stopPropagation previene el cierre
        expect(onClose).not.toHaveBeenCalled();
    });

    it('debe cerrar modal al presionar tecla Escape', () => {
        const onClose = jest.fn();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        // Simular presión de Escape
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('debe push estado al history para capturar back button', () => {
        const onClose = jest.fn();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        expect(mockHistoryPushState).toHaveBeenCalledWith(
            { modal: 'image-zoom', __modalInternal: true },
            ''
        );
    });

    it('debe prevenir scroll del body cuando está abierto', () => {
        const onClose = jest.fn();

        const { unmount } = render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        expect(document.body.style.overflow).toBe('hidden');

        unmount();

        expect(document.body.style.overflow).toBe('');
    });

    it('debe tener cursor zoom-out en overlay', () => {
        const onClose = jest.fn();

        const { container } = render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        const overlay = container.firstChild as HTMLElement;
        expect(overlay).toHaveClass('cursor-zoom-out');
    });

    it('debe aplicar estilos de animación fadeIn', () => {
        const onClose = jest.fn();

        render(
            <ImageZoomModal
                imageUrl={mockImageUrl}
                altText={mockAltText}
                onClose={onClose}
            />
        );

        const image = screen.getByRole('img');
        expect(image).toHaveStyle({ animation: 'fadeIn 0.3s ease-out' });
    });
});
