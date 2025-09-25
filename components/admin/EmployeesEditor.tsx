import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee } from '../../types';

const newEmployeeTemplate: Omit<Employee, 'id'> = {
    name: '',
    avatarUrl: '',
};

export const EmployeesEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState(newEmployeeTemplate);

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
            ...newEmployee
        };
        const updatedEmployees = [...business.employees, employeeToAdd];
        dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
        setIsAdding(false);
        setNewEmployee(newEmployeeTemplate);
    };

    const handleDeleteEmployee = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar a este empleado? También se desasignará de todos los servicios.')) {
            const updatedEmployees = business.employees.filter(emp => emp.id !== id);
            // Desasignar de los servicios
            const updatedServices = business.services.map(service => {
                const employeeIds = service.employeeIds?.filter(empId => empId !== id);
                return { ...service, employeeIds };
            });
            dispatch({ type: 'SET_EMPLOYEES_AND_SERVICES', payload: { employees: updatedEmployees, services: updatedServices } });
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gestión de Empleados</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark">
                    {isAdding ? 'Cancelar' : 'Añadir Empleado'}
                </button>
            </div>
            
            {isAdding && (
                 <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Empleado</h4>
                    <input type="text" placeholder="Nombre Completo" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <input type="text" placeholder="URL del Avatar" value={newEmployee.avatarUrl} onChange={(e) => setNewEmployee({...newEmployee, avatarUrl: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <button onClick={handleAddEmployee} className="w-full py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700">Guardar Empleado</button>
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
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:text-red-700 ml-4 p-1 rounded-full hover:bg-red-100 transition-colors">&#x1F5D1;</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
