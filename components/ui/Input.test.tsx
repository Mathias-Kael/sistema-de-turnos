import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from './Input';

describe('Input Component', () => {
    test('debe renderizar el input', () => {
        render(<Input data-testid="test-input" />);
        const inputElement = screen.getByTestId('test-input');
        expect(inputElement).toBeInTheDocument();
    });

    test('debe aplicar las clases base', () => {
        render(<Input data-testid="test-input" />);
        const inputElement = screen.getByTestId('test-input');
        expect(inputElement).toHaveClass('w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary focus:ring-primary focus:border-primary');
    });

    test('debe aceptar y aplicar clases adicionales', () => {
        render(<Input data-testid="test-input" className="extra-class" />);
        const inputElement = screen.getByTestId('test-input');
        expect(inputElement).toHaveClass('extra-class');
    });

    test('debe aceptar y aplicar clases adicionales al contenedor', () => {
        render(<Input data-testid="test-input" containerClassName="extra-container-class" />);
        const containerElement = screen.getByTestId('test-input').parentElement;
        expect(containerElement).toHaveClass('extra-container-class');
    });

    test('debe llamar a la función onChange cuando se escribe', () => {
        const handleChange = jest.fn();
        render(<Input data-testid="test-input" onChange={handleChange} />);
        const inputElement = screen.getByTestId('test-input');
        fireEvent.change(inputElement, { target: { value: 'test' } });
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('debe mostrar el valor por defecto', () => {
        render(<Input data-testid="test-input" defaultValue="default value" />);
        const inputElement = screen.getByTestId('test-input');
        expect(inputElement).toHaveValue('default value');
    });
test('debe estar deshabilitado cuando la prop "disabled" es verdadera', () => {
    render(<Input data-testid="test-input" disabled />);
    const inputElement = screen.getByTestId('test-input');
    expect(inputElement).toBeDisabled();
});

describe('Input Validation and Events', () => {
    test('debe mostrar estado de error', () => {
        render(
            <Input
                data-testid="test-input"
                aria-invalid={true}
                className="error"
            />
        );
        const input = screen.getByTestId('test-input');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    test('debe manejar eventos focus/blur', () => {
        const handleFocus = jest.fn();
        const handleBlur = jest.fn();
        render(
            <Input
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        );
        const input = screen.getByRole('textbox');
        
        fireEvent.focus(input);
        expect(handleFocus).toHaveBeenCalled();
        
        fireEvent.blur(input);
        expect(handleBlur).toHaveBeenCalled();
    });
});

    describe('Input Validation and Events', () => {
        test('debe mostrar estado de error', () => {
            render(
                <Input
                    data-testid="test-input"
                    aria-invalid={true}
                    className="error"
                />
            );
            const input = screen.getByTestId('test-input');
            expect(input).toHaveAttribute('aria-invalid', 'true');
        });
    
        test('debe manejar eventos focus/blur', () => {
            const handleFocus = jest.fn();
            const handleBlur = jest.fn();
            render(
                <Input
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
            );
            const input = screen.getByRole('textbox');
            
            fireEvent.focus(input);
            expect(handleFocus).toHaveBeenCalled();
            
            fireEvent.blur(input);
            expect(handleBlur).toHaveBeenCalled();
        });
    });
});