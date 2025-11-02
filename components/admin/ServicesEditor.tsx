import React, { useState, useCallback } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Service } from '../../types';
import ServiceAssignmentEditor from './ServiceAssignmentEditor';
import { ErrorMessage } from '../ui/ErrorMessage'; 
import { Button } from '../ui/Button';
import { DurationInput } from '../ui/DurationInput';
import { Employee } from '../../types'; // Importar Employee

const newServiceTemplate: Omit<Service, 'id' | 'businessId'> = {
    name: '',
    description: '',
    duration: 30,
    buffer: 0,
    price: 0,
    requiresDeposit: false,
    employeeIds: [],
    categoryIds: undefined,
};

export const ServicesEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState(newServiceTemplate);
    const [newServiceAssignedEmployeeIds, setNewServiceAssignedEmployeeIds] = useState<string[]>([]); // Nuevo estado
    const [newServiceCategoryIds, setNewServiceCategoryIds] = useState<string[]>([]); // Estado para categorías
    const [editingServiceAssignment, setEditingServiceAssignment] = useState<Service | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Estado para cambios de categoría pendientes
    const [pendingCategoryChanges, setPendingCategoryChanges] = useState<Record<string, string[]>>({});

    const handleServiceChange = (id: string, field: keyof Service, value: any) => {
        setError(null);
        const serviceToUpdate = business.services.find(s => s.id === id);
        if (serviceToUpdate) {
            if (field === 'duration' || field === 'buffer' || field === 'price') {
                value = Number(value) || 0;
            }
            const updatedService = { ...serviceToUpdate, [field]: value };
            dispatch({ type: 'UPDATE_SERVICE', payload: updatedService }).catch(e => setError(e.message));
        }
    };

    const handleToggleCategory = (serviceId: string, categoryId: string) => {
        setPendingCategoryChanges(prev => {
            const currentAssigned = business.services.find(s => s.id === serviceId)?.categoryIds || [];
            const currentChanges = prev[serviceId] ?? currentAssigned;
            
            const newChanges = currentChanges.includes(categoryId)
                ? currentChanges.filter(id => id !== categoryId)
                : [...currentChanges, categoryId];

            return { ...prev, [serviceId]: newChanges };
        });
    };

    const handleSaveChanges = async (serviceId: string) => {
        setError(null);
        const newCategoryIds = pendingCategoryChanges[serviceId];
        if (!newCategoryIds) return;

        try {
            await dispatch({
                type: 'UPDATE_SERVICE_CATEGORIES',
                payload: { serviceId, categoryIds: newCategoryIds }
            });
            // Limpiar solo los cambios para este servicio
            setPendingCategoryChanges(prev => {
                const { [serviceId]: _, ...rest } = prev;
                return rest;
            });
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleAddService = async () => {
        setError(null);
        if (!newService.name.trim()) {
            setError('El nombre del servicio es obligatorio.');
            return;
        }
        if (newServiceAssignedEmployeeIds.length === 0) { // Usar el nuevo estado
            setError('Debes asignar al menos un empleado a este servicio.');
            return;
        }
        const serviceToAdd: Service = {
            id: `s${Date.now()}`,
            businessId: business.id,
            ...newService,
            employeeIds: newServiceAssignedEmployeeIds,
            categoryIds: newServiceCategoryIds.length > 0 ? newServiceCategoryIds : undefined,
        };
        try {
            await dispatch({ type: 'ADD_SERVICE', payload: serviceToAdd });
            setIsAdding(false);
            setNewService(newServiceTemplate);
            setNewServiceAssignedEmployeeIds([]); // Reiniciar el estado
            setNewServiceCategoryIds([]); // Reiniciar categorías
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDeleteService = async (id: string) => {
        setError(null);
        if (window.confirm('¿Seguro que quieres eliminar este servicio?')) {
            try {
                await dispatch({ type: 'DELETE_SERVICE', payload: id });
            } catch (e: any) {
                setError(e.message);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium text-primary">Gestión de Servicios</h3>
                <Button onClick={() => {
                    setIsAdding(!isAdding);
                    setNewService(newServiceTemplate); // Resetear el formulario al cancelar
                    setNewServiceAssignedEmployeeIds([]); // Resetear los empleados asignados
                    setNewServiceCategoryIds([]); // Resetear categorías
                }} variant={isAdding ? 'secondary' : 'primary'} className="w-full sm:w-auto">
                    {isAdding ? 'Cancelar' : 'Añadir Servicio'}
                </Button>
            </div>

            {error && <ErrorMessage message={error} />}

            {isAdding && (
                <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Servicio</h4>
                    <input type="text" placeholder="Nombre del Servicio" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <textarea placeholder="Descripción" value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" rows={2}></textarea>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Duración</label>
                            <DurationInput
                                value={newService.duration}
                                onChange={(minutes) => setNewService({...newService, duration: minutes})}
                                hoursPlaceholder="Horas"
                                minutesPlaceholder="Min"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Buffer</label>
                            <DurationInput
                                value={newService.buffer}
                                onChange={(minutes) => setNewService({...newService, buffer: minutes})}
                                hoursPlaceholder="Horas"
                                minutesPlaceholder="Min"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Precio</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none select-none opacity-70">$</span>
                                <input type="number" placeholder="0" value={newService.price} onChange={(e) => setNewService({...newService, price: Number(e.target.value)})} className="w-full p-2 pl-8 border border-default rounded bg-background text-primary" />
                            </div>
                        </div>
                    </div>
                    <label className="flex items-center space-x-2 text-secondary">
                        <input type="checkbox" checked={newService.requiresDeposit} onChange={(e) => setNewService({...newService, requiresDeposit: e.target.checked})} className="rounded accent-primary"/>
                        <span>Requiere depósito</span>
                    </label>

                    {/* Sección de asignación de empleados para nuevo servicio */}
                    <div className="border border-default p-4 rounded-md bg-background">
                        <h5 className="font-semibold text-primary mb-2">Asignar Empleados</h5>
                        {business.employees.length === 0 ? (
                            <p className="text-secondary">No hay empleados registrados. Por favor, añade empleados primero.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {business.employees.map(employee => (
                                    <div key={employee.id} className="flex items-center p-2 border border-default rounded-md bg-surface">
                                        <input
                                            type="checkbox"
                                            id={`new-service-employee-${employee.id}`}
                                            checked={newServiceAssignedEmployeeIds.includes(employee.id)}
                                            onChange={() => {
                                                setNewServiceAssignedEmployeeIds(prevIds => {
                                                    if (prevIds.includes(employee.id)) {
                                                        return prevIds.filter(id => id !== employee.id);
                                                    } else {
                                                        return [...prevIds, employee.id];
                                                    }
                                                });
                                            }}
                                            className="rounded accent-primary mr-2"
                                        />
                                        <label htmlFor={`new-service-employee-${employee.id}`} className="text-primary cursor-pointer">{employee.name}</label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sección de asignación de categorías para nuevo servicio */}
                    {business.categories.length > 0 && (
                        <div className="border border-default p-4 rounded-md bg-background">
                            <h5 className="font-semibold text-primary mb-2">Asignar a Categorías (opcional)</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {business.categories.map(category => (
                                    <div key={category.id} className="flex items-center p-2 border border-default rounded-md bg-surface">
                                        <input
                                            type="checkbox"
                                            id={`new-service-category-${category.id}`}
                                            checked={newServiceCategoryIds.includes(category.id)}
                                            onChange={() => {
                                                setNewServiceCategoryIds(prevIds => {
                                                    if (prevIds.includes(category.id)) {
                                                        return prevIds.filter(id => id !== category.id);
                                                    } else {
                                                        return [...prevIds, category.id];
                                                    }
                                                });
                                            }}
                                            className="rounded accent-primary mr-2"
                                        />
                                        <label htmlFor={`new-service-category-${category.id}`} className="text-primary cursor-pointer">{category.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button onClick={handleAddService} className="w-full">Guardar Servicio</Button>
                </div>
            )}

            <div className="space-y-4">
                {business.services.map(service => (
                    <div key={service.id} className="p-4 border border-default rounded-md space-y-3 bg-surface">
                        <div className="flex justify-between items-start">
                            <input type="text" defaultValue={service.name} onBlur={(e) => handleServiceChange(service.id, 'name', e.target.value)} className="text-md font-semibold border-b border-transparent focus:border-b-primary w-full focus:outline-none bg-surface text-primary" />
                            <button onClick={() => handleDeleteService(service.id)} className="text-state-danger-text hover:text-state-danger-strong ml-4 p-1 rounded-full hover:bg-state-danger-bg transition-colors" aria-label="Eliminar servicio">&#x1F5D1;</button>
                        </div>
                        <textarea defaultValue={service.description} onBlur={(e) => handleServiceChange(service.id, 'description', e.target.value)} className="w-full text-sm text-secondary border border-default rounded-md p-2 focus:ring-primary focus:border-primary bg-surface" rows={2}></textarea>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Duración</label>
                                <DurationInput
                                    value={service.duration}
                                    onChange={(minutes) => handleServiceChange(service.id, 'duration', minutes)}
                                    hoursPlaceholder="Horas"
                                    minutesPlaceholder="Min"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Buffer</label>
                                <DurationInput
                                    value={service.buffer}
                                    onChange={(minutes) => handleServiceChange(service.id, 'buffer', minutes)}
                                    hoursPlaceholder="Horas"
                                    minutesPlaceholder="Min"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Precio</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none select-none opacity-70">$</span>
                                    <input type="number" defaultValue={service.price} onBlur={(e) => handleServiceChange(service.id, 'price', e.target.value)} className="w-full p-2 pl-8 border border-default rounded bg-surface text-primary" title="Precio" />
                                </div>
                            </div>
                        </div>
                         <label className="flex items-center space-x-2 text-sm cursor-pointer text-secondary">
                            <input type="checkbox" defaultChecked={!!service.requiresDeposit} onChange={(e) => handleServiceChange(service.id, 'requiresDeposit', e.target.checked)} className="rounded accent-primary"/>
                            <span>Requiere depósito</span>
                        </label>

                        {/* Categorías asignadas */}
                        {business.categories.length > 0 && (
                            <div className="pt-2">
                                <h6 className="text-sm font-medium text-secondary mb-2">Categorías:</h6>
                                <div className="flex flex-wrap gap-2">
                                    {business.categories.map(category => {
                                        const currentCategoryIds = pendingCategoryChanges[service.id] ?? service.categoryIds ?? [];
                                        const isAssigned = currentCategoryIds.includes(category.id);
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => handleToggleCategory(service.id, category.id)}
                                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                    isAssigned
                                                        ? 'bg-primary text-brand-text border-primary'
                                                        : 'bg-surface text-secondary border-default hover:border-primary'
                                                }`}
                                            >
                                                {category.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {pendingCategoryChanges[service.id] && (
                                    <div className="mt-3">
                                        <Button
                                            onClick={() => handleSaveChanges(service.id)}
                                            variant="primary"
                                            size="sm"
                                        >
                                            Guardar Cambios de Categoría
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <Button
                                onClick={() => setEditingServiceAssignment(service)}
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                            >
                                Asignar Empleados ({service.employeeIds?.length || 0})
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {editingServiceAssignment && (
                <ServiceAssignmentEditor
                    service={editingServiceAssignment}
                    onSave={(updatedEmployeeIds) => {
                        const serviceToUpdate = { ...editingServiceAssignment, employeeIds: updatedEmployeeIds };
                        dispatch({ type: 'UPDATE_SERVICE', payload: serviceToUpdate }).catch(e => setError(e.message));
                        setEditingServiceAssignment(null);
                    }}
                    onClose={() => setEditingServiceAssignment(null)}
                />
            )}
        </div>
    );
};
