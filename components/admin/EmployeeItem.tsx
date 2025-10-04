import React from 'react';
import { Employee } from '../../types';
import { Button } from '../ui/Button';
import { imageStorage } from '../../services/imageStorage';

interface EmployeeItemProps {
    employee: Employee;
    onEdit: (employee: Employee) => void; // Nuevo prop para abrir el modal de edición
    onDeleteEmployee: (employeeId: string) => void;
    onEditHours: (employee: Employee) => void;
}

export const EmployeeItem: React.FC<EmployeeItemProps> = ({ employee, onEdit, onDeleteEmployee, onEditHours }) => {
    const avatarUrl = employee.avatarUrl ? imageStorage.getImageUrl(employee.avatarUrl) : undefined;
    return (
        <div className="p-4 border border-default rounded-md flex items-center gap-4 bg-surface">
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={employee.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-default"
                />
            ) : (
                <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-secondary border-2 border-default text-xl">
                    👤
                </div>
            )}
            <div className="flex-grow min-w-0">
                <p className="text-md font-semibold text-primary truncate">{employee.name}</p>
                <p className="text-xs text-secondary truncate">{avatarUrl ? 'Avatar personalizado' : 'Sin avatar'}</p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
                <Button onClick={() => onEdit(employee)} variant="secondary" size="sm">
                    Editar
                </Button>
                <Button onClick={() => onEditHours(employee)} variant="secondary" size="sm">
                    Horarios
                </Button>
                <button onClick={() => onDeleteEmployee(employee.id)} className="text-state-danger-text hover:text-state-danger-strong p-1 rounded-full hover:bg-state-danger-bg transition-colors" aria-label="Eliminar empleado">&#x1F5D1;</button>
            </div>
        </div>
    );
};