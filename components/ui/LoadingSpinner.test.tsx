import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
    test('debe renderizar el spinner', () => {
        render(<LoadingSpinner />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toBeInTheDocument();
    });

    test('debe tener el rol "status" y una etiqueta aria', () => {
        render(<LoadingSpinner />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveAttribute('aria-label', 'Cargando');
    });

    test('debe aplicar las clases de tamaño "md" por defecto', () => {
        render(<LoadingSpinner />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveClass('h-8 w-8');
    });

    test('debe aplicar las clases de tamaño "sm"', () => {
        render(<LoadingSpinner size="sm" />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveClass('h-5 w-5');
    });

    test('debe aplicar las clases de tamaño "lg"', () => {
        render(<LoadingSpinner size="lg" />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveClass('h-12 w-12');
    });

    test('debe aplicar las clases base de animación y borde', () => {
        render(<LoadingSpinner />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveClass('animate-spin rounded-full border-4 border-primary border-t-transparent');
    });

    test('debe aceptar y aplicar clases adicionales', () => {
        render(<LoadingSpinner className="extra-class" />);
        const spinnerElement = screen.getByRole('status');
        expect(spinnerElement).toHaveClass('extra-class');
    });
});