import React from 'react';

/**
 * Props para el componente ErrorMessage.
 * @interface ErrorMessageProps
 */
interface ErrorMessageProps {
    /**
     * El mensaje de error a mostrar.
     * @type {string}
     */
    message: string;
    /**
     * Clases de CSS adicionales para el contenedor del mensaje.
     * @type {string}
     */
    className?: string;
}

/**
 * Un componente reutilizable para mostrar mensajes de error.
 *
 * @param {ErrorMessageProps} props - Las props para el componente.
 * @returns {React.ReactElement | null} El componente de mensaje de error renderizado, o null si no hay mensaje.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
    if (!message) {
        return null;
    }

    return (
        <div
            className={`p-4 rounded-md bg-state-danger-bg text-state-danger-text ${className}`}
            role="alert"
        >
            <p>{message}</p>
        </div>
    );
};