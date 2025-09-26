import React from 'react';

/**
 * Props para el componente Input.
 * @interface InputProps
 * @extends React.InputHTMLAttributes<HTMLInputElement>
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * Clases de CSS adicionales para el contenedor del input.
     * @type {string}
     */
    containerClassName?: string;
}

/**
 * Un componente de input reutilizable con estilos base.
 *
 * @param {InputProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de input renderizado.
 */
export const Input: React.FC<InputProps> = ({ className, containerClassName, ...props }) => {
    const baseClasses = 'w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary focus:ring-primary focus:border-primary';

    return (
        <div className={containerClassName}>
            <input
                className={`${baseClasses} ${className}`}
                {...props}
            />
        </div>
    );
};