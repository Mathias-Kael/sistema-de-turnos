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
        <div className="p-4 border border-default rounded-md flex items-center gap-4 bg-surface">
            <img
                src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${employee.name.replace(' ', '+')}&background=random`}
                alt={employee.name}
                className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-grow">
                <p className="text-md font-semibold text-primary">{employee.name}</p>
                <p className="text-sm text-secondary">{employee.avatarUrl || 'Sin URL de Avatar'}</p>
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