import React from 'react';

/**
 * Props para el componente LoadingSpinner.
 * @interface LoadingSpinnerProps
 */
interface LoadingSpinnerProps {
    /**
     * El tamaño del spinner.
     * @type {'sm' | 'md' | 'lg'}
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * Clases de CSS adicionales para el spinner.
     * @type {string}
     */
    className?: string;
}

/**
 * Un componente de spinner de carga reutilizable.
 *
 * @example
 * // Spinner grande con clase personalizada
 * <LoadingSpinner size="lg" className="my-custom-class" />
 *
 * @accessibility
 * - Usa role="status" para anunciar estado de carga
 * - Incluye aria-live="polite" para actualizaciones de screen readers
 *
 * @param {LoadingSpinnerProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de spinner de carga renderizado.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    return (
        <div
            className={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizeClasses[size]} ${className}`}
            role="status"
            aria-live="polite"
            aria-label="Cargando"
        />
    );
};