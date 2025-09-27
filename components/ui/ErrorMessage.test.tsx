import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage Component', () => {
    test('debe renderizar el mensaje de error', () => {
        render(<ErrorMessage message="Este es un error" />);
        const errorElement = screen.getByText(/Este es un error/i);
        expect(errorElement).toBeInTheDocument();
    });

    test('no debe renderizar nada si el mensaje está vacío', () => {
        const { container } = render(<ErrorMessage message="" />);
        expect(container).toBeEmptyDOMElement();
    });

    test('no debe renderizar nada si el mensaje es nulo', () => {
        // @ts-ignore
        const { container } = render(<ErrorMessage message={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('debe tener el rol "alert"', () => {
        render(<ErrorMessage message="Alerta de error" />);
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
    });

    test('debe aplicar las clases base de estilo', () => {
        render(<ErrorMessage message="Error con estilo" />);
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveClass('p-4 rounded-md bg-state-danger-bg text-state-danger-text');
    });

    test('debe aceptar y aplicar clases adicionales', () => {
        render(<ErrorMessage message="Error con clase extra" className="extra-class" />);
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveClass('extra-class');
    });
});