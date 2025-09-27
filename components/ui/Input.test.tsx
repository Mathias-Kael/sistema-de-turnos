import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        const containerElement = screen.getByTestId('test-input').parentElement?.parentElement;
        expect(containerElement).toHaveClass('extra-container-class');
    });
test('debe llamar a la función onChange cuando se escribe', async () => {
    const handleChange = jest.fn();
    render(<Input data-testid="test-input" onChange={handleChange} />);
    const inputElement = screen.getByTestId('test-input');
    await userEvent.type(inputElement, 'test');
    expect(handleChange).toHaveBeenCalledTimes(4); // userEvent.type dispara un evento por cada caracter
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
describe('Input con Label e Icono', () => {
    test('debe renderizar el label cuando se proporciona', () => {
        render(<Input label="Nombre" id="name" />);
        const labelElement = screen.getByText(/Nombre/i);
        expect(labelElement).toBeInTheDocument();
        expect(labelElement).toHaveAttribute('for', 'name');
    });

    test('debe renderizar un icono cuando se proporciona', () => {
        const Icon = () => <svg data-testid="test-icon"></svg>;
        render(<Input icon={<Icon />} />);
        const iconElement = screen.getByTestId('test-icon');
        expect(iconElement).toBeInTheDocument();
    });

    test('el input debe tener el foco cuando se hace clic en el label', async () => {
        const user = userEvent.setup();
        render(<Input label="Nombre" id="name" data-testid="test-input" />);
        const labelElement = screen.getByText(/Nombre/i);
        const inputElement = screen.getByTestId('test-input');
        
        await user.click(labelElement);
        
        expect(inputElement).toHaveFocus();
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

    test('debe manejar eventos focus/blur', async () => {
        const user = userEvent.setup();
        const handleFocus = jest.fn();
        const handleBlur = jest.fn();
        render(
            <Input
                onFocus={handleFocus}
                onBlur={handleBlur}
                data-testid="test-input"
            />
        );
        const input = screen.getByTestId('test-input');
        
        await user.click(input);
        expect(handleFocus).toHaveBeenCalled();
        
        await user.click(document.body); // Clic fuera para disparar blur
        expect(handleBlur).toHaveBeenCalled();
    });
});
});