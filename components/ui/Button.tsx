import React from 'react';

/**
 * Props para el componente Button.
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * La variante de estilo del botón.
     * @type {'primary' | 'secondary' | 'ghost'}
     * @default 'primary'
     */
    variant?: 'primary' | 'secondary' | 'ghost';
    /**
     * El tamaño del botón.
     * @type {'sm' | 'md' | 'lg'}
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * Si es true, muestra un spinner de carga y deshabilita el botón.
     * @type {boolean}
     * @default false
     */
    loading?: boolean;
}
/**
 * Un componente de botón reutilizable con variantes de estilo y tamaño.
 *
 * @example
 * ```tsx
 * // Botón primario
 * <Button variant="primary" onClick={() => console.log('clicked')}>
 *   Click me
 * </Button>
 *
 * // Botón secundario deshabilitado
 * <Button variant="secondary" disabled>
 *   Disabled
 * </Button>
 * 
 * // Botón con estado de carga
 * <Button loading>
 *   Guardando...
 * </Button>
 * ```
 *
 * @param {ButtonProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de botón renderizado.
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    ...props
}) => {
    const baseClasses = 'rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center relative';
    
    const variantClasses = {
        primary: 'bg-primary text-brand-text hover:bg-primary-dark',
        secondary: 'bg-surface border border-primary text-primary hover:bg-primary/10',
        ghost: 'text-primary hover:bg-primary/10'
    };

    const sizeClasses = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
};