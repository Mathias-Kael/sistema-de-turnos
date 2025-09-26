import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee, Hours } from '../../types';
import EmployeeHoursEditor from './EmployeeHoursEditor';
import { INITIAL_BUSINESS_DATA } from '../../constants';

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

    const handleEmployeeChange = (id: string, field: keyof Employee, value: string) => {
        const updatedEmployees = business.employees.map(emp => {
            if (emp.id === id) {
                return { ...emp, [field]: value };
            }
            return emp;
        });
        dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    };
    
    const handleAddEmployee = () => {
        if (!newEmployee.name.trim()) {
            alert('El nombre del empleado es obligatorio.');
            return;
        }
        const employeeToAdd: Employee = {
            id: `e${Date.now()}`,
            hours: INITIAL_BUSINESS_DATA.hours, // Asignar horarios por defecto al nuevo empleado
            ...newEmployee
        };
        dispatch({ type: 'ADD_EMPLOYEE', payload: employeeToAdd }); // Usar ADD_EMPLOYEE
        setIsAdding(false);
        setNewEmployee(newEmployeeTemplate);
    };

    const handleDeleteEmployee = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar a este empleado? También se desasignará de todos los servicios.')) {
            dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gestión de Empleados</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-primary text-brand-text text-sm font-medium rounded-md hover:bg-primary-dark">
                    {isAdding ? 'Cancelar' : 'Añadir Empleado'}
                </button>
            </div>
            
            {isAdding && (
                 <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Empleado</h4>
                    <input type="text" placeholder="Nombre Completo" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <input type="text" placeholder="URL del Avatar" value={newEmployee.avatarUrl} onChange={(e) => setNewEmployee({...newEmployee, avatarUrl: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <button onClick={handleAddEmployee} className="w-full py-2 bg-[color:var(--color-state-success-bg)] text-brand-text font-bold rounded-md hover:opacity-90">Guardar Empleado</button>
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
                             <input type="text" value={emp.name} onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)} className="text-md font-semibold border-b border-default focus:border-b-primary focus:outline-none w-full bg-surface text-primary" />
                             <input type="text" value={emp.avatarUrl} onChange={(e) => handleEmployeeChange(emp.id, 'avatarUrl', e.target.value)} className="mt-1 w-full text-sm text-secondary border-b border-default focus:border-b-primary focus:outline-none bg-surface" placeholder="URL del Avatar"/>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                            <button onClick={() => setEditingEmployeeHours(emp)} className="btn btn-sm btn-outline btn-info">
                                Horarios
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-[color:var(--color-state-danger-text)] hover:text-[color:var(--color-state-danger-strong)] p-1 rounded-full hover:bg-[color:var(--color-state-danger-bg)] transition-colors">&#x1F5D1;</button>
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
