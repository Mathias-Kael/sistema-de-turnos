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

const newEmployeeTemplate: Omit<Employee, 'id' | 'hours' | 'businessId'> = {
    name: '',
    avatarUrl: '',
    whatsapp: '',
};

export const EmployeesEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState(newEmployeeTemplate);
    const [editingEmployeeHours, setEditingEmployeeHours] = useState<Employee | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); // Nuevo estado para el empleado en edición
    const [error, setError] = useState<string | null>(null);
    const [isUpdatingTerminology, setIsUpdatingTerminology] = useState(false);
    
    const handleAddEmployee = async () => {
        setError(null);
        if (!newEmployee.name.trim()) {
            setError(`El nombre del ${business.branding?.terminology?.type === 'space' ? 'espacio' : 'profesional'} es obligatorio.`);
            return;
        }
        const employeeToAdd: Employee = {
            id: `e${Date.now()}`,
            businessId: business.id,
            hours: {
                monday: { enabled: false, intervals: [] },
                tuesday: { enabled: false, intervals: [] },
                wednesday: { enabled: false, intervals: [] },
                thursday: { enabled: false, intervals: [] },
                friday: { enabled: false, intervals: [] },
                saturday: { enabled: false, intervals: [] },
                sunday: { enabled: false, intervals: [] },
            },
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
        const resourceType = business.branding?.terminology?.type === 'space' ? 'espacio' : 'profesional';
        if (window.confirm(`¿Seguro que quieres eliminar este ${resourceType}? También se desasignará de todos los servicios.`)) {
            try {
                await dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
            } catch (e: any) {
                setError(e.message);
            }
        }
    };

    const handleResourceTypeChange = async (type: 'person' | 'space') => {
        if (isUpdatingTerminology) return;
        setIsUpdatingTerminology(true);
        try {
            await dispatch({
                type: 'UPDATE_RESOURCE_CONFIG',
                payload: { type }
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUpdatingTerminology(false);
        }
    };

    return (
        <div className="space-y-6">
             {/* Configuración de Tipo de Recurso (Simplificada) */}
             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">¿Qué gestionas en tu negocio?</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Esto adaptará los textos de la aplicación (ej: "con Laura" vs "en Cancha 1").
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isUpdatingTerminology && <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">Actualizando...</span>}
                        <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-blue-200 dark:border-blue-700 shadow-sm relative">
                            {isUpdatingTerminology && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 rounded-lg cursor-not-allowed" />
                            )}
                            <button
                                onClick={() => handleResourceTypeChange('person')}
                                disabled={isUpdatingTerminology}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    (!business.branding?.terminology?.type || business.branding?.terminology?.type === 'person')
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                👤 Personas
                            </button>
                            <button
                                onClick={() => handleResourceTypeChange('space')}
                                disabled={isUpdatingTerminology}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    business.branding?.terminology?.type === 'space'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                📍 Espacios
                            </button>
                        </div>
                    </div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium">
                    Gestión de {business.branding?.terminology?.type === 'space' ? 'Espacios' : 'Equipo'}
                </h3>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'} className="w-full sm:w-auto">
                    {isAdding ? 'Cancelar' : `Añadir ${business.branding?.terminology?.type === 'space' ? 'Espacio' : 'Profesional'}`}
                </Button>
            </div>
            
            {error && <ErrorMessage message={error} />}

            {isAdding && (
                 <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo {business.branding?.terminology?.type === 'space' ? 'Espacio' : 'Profesional'}</h4>
                                        <input type="text" placeholder={business.branding?.terminology?.type === 'space' ? "Nombre del Espacio (ej: Cancha 1)" : "Nombre Completo"} value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                                        <div>
                                                <ImageUploader
                                                    currentImageUrl={newEmployee.avatarUrl}
                                                    type="avatar"
                                                    label={business.branding?.terminology?.type === 'space' ? "Foto del Espacio" : "Foto de Perfil"}
                                                    onImageChange={(imageId) => setNewEmployee({...newEmployee, avatarUrl: imageId })}
                                                    onError={(err) => console.error('Error avatar empleado:', err)}
                                                />
                                        </div>
                    <Button onClick={handleAddEmployee} className="w-full">Guardar {business.branding?.terminology?.type === 'space' ? 'Espacio' : 'Profesional'}</Button>
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
