import React from 'react';

export type StatusType = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'active' | 'inactive' | 'default';

interface StatusBadgeProps {
    status: StatusType;
    children: React.ReactNode;
    className?: string;
    size?: 'xs' | 'sm' | 'base';
}

/**
 * Componente de utilidad para badges de estado con estilos consistentes
 * Centraliza los patrones repetitivos de badges con bordes y colores
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
    status, 
    children, 
    className = '', 
    size = 'sm' 
}) => {
    const statusClasses = {
        pending: 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-300 dark:bg-yellow-900/20',
        confirmed: 'border-green-500 text-green-700 bg-green-50 dark:border-green-400 dark:text-green-300 dark:bg-green-900/20',
        cancelled: 'border-red-500 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-300 dark:bg-red-900/20',
        completed: 'border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-900/20',
        active: 'border-green-500 text-green-700 bg-green-50 dark:border-green-400 dark:text-green-300 dark:bg-green-900/20',
        inactive: 'border-gray-400 text-gray-700 bg-gray-50 dark:border-gray-500 dark:text-gray-300 dark:bg-gray-800',
        default: 'border-primary text-primary bg-surface'
    }[status];

    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-sm',
        base: 'px-3 py-1 text-base'
    }[size];

    return (
        <span className={`inline-flex items-center rounded-full font-semibold border ${statusClasses} ${sizeClasses} ${className}`}>
            {children}
        </span>
    );
};