import React from 'react';

interface SecondaryTextProps {
    size?: 'sm' | 'base' | 'xs';
    children: React.ReactNode;
    className?: string;
    as?: 'span' | 'p' | 'div';
}

/**
 * Componente de utilidad para texto secundario con estilos consistentes
 * Centraliza los patrones repetitivos de text-sm text-secondary
 */
export const SecondaryText: React.FC<SecondaryTextProps> = ({ 
    size = 'sm', 
    children, 
    className = '', 
    as: Component = 'span' 
}) => {
    const sizeClass = {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base'
    }[size];

    return (
        <Component className={`${sizeClass} text-secondary ${className}`}>
            {children}
        </Component>
    );
};