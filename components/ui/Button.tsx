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
 * ```
 *
 * @param {ButtonProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de botón renderizado.
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className,
    ...props
}) => {
    const baseClasses = 'rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
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
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        />
    );
};