import React from 'react';
import { Employee } from '../../types';
import { Button } from '../ui/Button';

interface EmployeeItemProps {
    employee: Employee;
    onEdit: (employee: Employee) => void; // Nuevo prop para abrir el modal de edición
    onDeleteEmployee: (employeeId: string) => void;
    onEditHours: (employee: Employee) => void;
}

export const EmployeeItem: React.FC<EmployeeItemProps> = ({ employee, onEdit, onDeleteEmployee, onEditHours }) => {
    return (
        <div className="p-4 border border-default rounded-md bg-surface flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
                <img
                    src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${employee.name.replace(' ', '+')}&background=random`}
                    alt={employee.name}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-grow">
                    <p className="text-md font-semibold text-primary leading-tight break-words">{employee.name}</p>
                    <p className="text-xs sm:text-sm text-secondary break-all">{employee.avatarUrl || 'Sin URL de Avatar'}</p>
                </div>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:ml-auto">
                <Button onClick={() => onEdit(employee)} variant="secondary" size="sm" className="flex-1 sm:flex-initial">
                    Editar
                </Button>
                <Button onClick={() => onEditHours(employee)} variant="secondary" size="sm" className="flex-1 sm:flex-initial">
                    Horarios
                </Button>
                <button
                    onClick={() => onDeleteEmployee(employee.id)}
                    className="text-state-danger-text hover:text-state-danger-strong p-2 rounded-full hover:bg-state-danger-bg transition-colors flex-shrink-0"
                    aria-label="Eliminar empleado"
                >
                    &#x1F5D1;
                </button>
            </div>
        </div>
    );
};