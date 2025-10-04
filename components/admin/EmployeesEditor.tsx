import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee } from '../../types';
import EmployeeHoursEditor from './EmployeeHoursEditor';
import { EmployeeItem } from './EmployeeItem';
import { EmployeeEditModal } from './EmployeeEditModal';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { ImageUploader } from '../common/ImageUploader';
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
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); // Nuevo estado para el empleado en edición
    const [error, setError] = useState<string | null>(null);
    
    const handleAddEmployee = async () => {
        setError(null);
        if (!newEmployee.name.trim()) {
            setError('El nombre del empleado es obligatorio.');
            return;
        }
        const employeeToAdd: Employee = {
            id: `e${Date.now()}`,
            businessId: business.id,
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
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium">Gestión de Empleados</h3>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'} className="w-full sm:w-auto">
                    {isAdding ? 'Cancelar' : 'Añadir Empleado'}
                </Button>
            </div>
            
            {error && <ErrorMessage message={error} />}

            {isAdding && (
                 <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Empleado</h4>
                                        <input type="text" placeholder="Nombre Completo" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                                        <div>
                                                <ImageUploader
                                                    currentImageUrl={newEmployee.avatarUrl}
                                                    type="avatar"
                                                    label="Avatar del Empleado"
                                                    onImageChange={(imageId) => setNewEmployee({...newEmployee, avatarUrl: imageId })}
                                                    onError={(err) => console.error('Error avatar empleado:', err)}
                                                />
                                        </div>
                    <Button onClick={handleAddEmployee} className="w-full">Guardar Empleado</Button>
                </div>
            )}
            
            <div className="space-y-4">
                {business.employees.map(emp => (
                    <EmployeeItem
                        key={emp.id}
                        employee={emp}
                        onEdit={setEditingEmployee} // Pasa la función para abrir el modal de edición
                        onDeleteEmployee={handleDeleteEmployee}
                        onEditHours={setEditingEmployeeHours}
                    />
                ))}
            </div>

            {editingEmployee && (
                <EmployeeEditModal
                    employee={editingEmployee}
                    isOpen={!!editingEmployee}
                    onClose={() => setEditingEmployee(null)}
                    onSave={async (updatedEmployee) => {
                        try {
                            await dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
                            setEditingEmployee(null); // Cierra el modal al guardar
                        } catch (e: any) {
                            setError(e.message);
                        }
                    }}
                    error={error}
                    setError={setError}
                />
            )}

            {editingEmployeeHours && (
                <EmployeeHoursEditor
                    employee={editingEmployeeHours}
                    onClose={() => setEditingEmployeeHours(null)}
                />
            )}
        </div>
    );
};
