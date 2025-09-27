import React from 'react';

/**
 * Props para el componente Input.
 * @interface InputProps
 * @extends React.InputHTMLAttributes<HTMLInputElement>
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * El texto del label a mostrar sobre el input.
     * @type {string}
     */
    label?: string;
    /**
     * Un icono a mostrar dentro del input.
     * @type {React.ReactNode}
     */
    icon?: React.ReactNode;
    /**
     * Clases de CSS adicionales para el contenedor del input.
     * @type {string}
     */
    containerClassName?: string;
}

/**
 * Un componente de input reutilizable con estilos base, soporte para label e icono.
 *
 * @param {InputProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de input renderizado.
 */
export const Input: React.FC<InputProps> = ({
    className,
    containerClassName,
    label,
    icon,
    id,
    ...props
}) => {
    const baseClasses = 'w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary focus:ring-primary focus:border-primary';
    const iconPadding = icon ? 'pl-10' : '';

    return (
        <div className={containerClassName}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-primary mb-1">{label}</label>}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    id={id}
                    className={`${baseClasses} ${iconPadding} ${className}`}
                    {...props}
                />
            </div>
        </div>
    );
};