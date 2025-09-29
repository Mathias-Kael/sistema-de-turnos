import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee } from '../../types';
import EmployeeHoursEditor from './EmployeeHoursEditor';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Button } from '../ui/Button';

const newEmployeeTemplate: Omit<Employee, 'id' | 'hours'> = {
    name: '',
    avatarUrl: '',
};

export const EmployeesEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState(newEmployeeTemplate);
    const [editingEmployeeHours, setEditingEmployeeHours] = useState<Employee | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleEmployeeChange = (id: string, field: keyof Employee, value: string) => {
        const employeeToUpdate = business.employees.find(emp => emp.id === id);
        if (employeeToUpdate) {
            const updatedEmployee = { ...employeeToUpdate, [field]: value };
            dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee }).catch(e => setError(e.message));
        }
    };
    
    const handleAddEmployee = async () => {
        setError(null);
        if (!newEmployee.name.trim()) {
            setError('El nombre del empleado es obligatorio.');
            return;
        }
        const employeeToAdd: Employee = {
            id: `e${Date.now()}`,
            hours: INITIAL_BUSINESS_DATA.hours,
            ...newEmployee
        };
        try {
            await dispatch({ type: 'ADD_EMPLOYEE', payload: employeeToAdd });
            setIsAdding(false);
            setNewEmployee(newEmployeeTemplate);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        setError(null);
        if (window.confirm('¿Seguro que quieres eliminar a este empleado? También se desasignará de todos los servicios.')) {
            try {
                await dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
            } catch (e: any) {
                setError(e.message);
            }
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gestión de Empleados</h3>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
                    {isAdding ? 'Cancelar' : 'Añadir Empleado'}
                </Button>
            </div>
            
            {error && <ErrorMessage message={error} />}

            {isAdding && (
                 <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Empleado</h4>
                    <input type="text" placeholder="Nombre Completo" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <input type="text" placeholder="URL del Avatar" value={newEmployee.avatarUrl} onChange={(e) => setNewEmployee({...newEmployee, avatarUrl: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <Button onClick={handleAddEmployee} className="w-full">Guardar Empleado</Button>
                </div>
            )}
            
            <div className="space-y-4">
                {business.employees.map(emp => (
                    <div key={emp.id} className="p-4 border border-default rounded-md flex items-center gap-4 bg-surface">
                         <img
                            src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${emp.name.replace(' ', '+')}&background=random`}
                            alt={emp.name}
                            className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-grow">
                             <input type="text" value={emp.name} onBlur={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)} onChange={() => {}} className="text-md font-semibold border-b border-transparent focus:border-b-primary focus:outline-none w-full bg-surface text-primary" />
                             <input type="text" value={emp.avatarUrl} onBlur={(e) => handleEmployeeChange(emp.id, 'avatarUrl', e.target.value)} onChange={() => {}} className="mt-1 w-full text-sm text-secondary border-b border-transparent focus:border-b-primary focus:outline-none bg-surface" placeholder="URL del Avatar"/>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                            <Button onClick={() => setEditingEmployeeHours(emp)} variant="secondary" size="sm">
                                Horarios
                            </Button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-state-danger-text hover:text-state-danger-strong p-1 rounded-full hover:bg-state-danger-bg transition-colors" aria-label="Eliminar empleado">&#x1F5D1;</button>
                        </div>
                    </div>
                ))}
            </div>

            {editingEmployeeHours && (
                <EmployeeHoursEditor
                    employee={editingEmployeeHours}
                    onClose={() => setEditingEmployeeHours(null)}
                />
            )}
        </div>
    );
};
