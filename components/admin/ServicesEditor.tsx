import React, { useState, useCallback, useMemo } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Service } from '../../types';
import ServiceAssignmentEditor from './ServiceAssignmentEditor';
import { ErrorMessage, Button, DurationInput, SecondaryText, StatusBadge } from '../ui';
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
    // Para alta de nuevo servicio: solo una categoría activa
    const [newServiceCategoryId, setNewServiceCategoryId] = useState<string | null>(null);
    // Estado de error local
    const [error, setError] = useState<string | null>(null);
    const [editingServiceAssignment, setEditingServiceAssignment] = useState<Service | null>(null);
    // (Eliminado: declaración duplicada)

    // Estado para cambios de categoría pendientes
    const [pendingCategoryChanges, setPendingCategoryChanges] = useState<Record<string, string[]>>({});

    // Estado para modal de confirmación de eliminación
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

    // Estado para toggle de tiempo de descanso (buffer) en nuevo servicio
    const [newServiceBufferEnabled, setNewServiceBufferEnabled] = useState(false);

    // Estado para toggle de tiempo de descanso (buffer) en servicios existentes
    const [bufferEnabledMap, setBufferEnabledMap] = useState<Record<string, boolean>>({});

    // Memoizar validación de duración para optimizar performance
    const isDurationInvalid = useMemo(() => {
        return !newService.duration || newService.duration <= 0;
    }, [newService.duration]);

    const handleServiceChange = (id: string, field: keyof Service, value: any) => {
        setError(null);
        const serviceToUpdate = business.services.find(s => s.id === id);
        if (serviceToUpdate) {
            if (field === 'duration' || field === 'buffer' || field === 'price') {
                value = Number(value) || 0;
            }
            // Validar que la duración sea mayor a 0
            if (field === 'duration' && value <= 0) {
                setError('La duración del servicio debe ser mayor a 0.');
                return;
            }
            const updatedService = { ...serviceToUpdate, [field]: value };
            dispatch({ type: 'UPDATE_SERVICE', payload: updatedService }).catch(e => setError(e.message));
        }
    };

    // Solo una categoría activa por servicio (radio/toggle)
    const handleToggleCategory = (serviceId: string, categoryId: string) => {
        setPendingCategoryChanges(prev => {
            const currentAssigned = business.services.find(s => s.id === serviceId)?.categoryIds || [];
            const currentChanges = prev[serviceId] ?? currentAssigned;
            const isSelected = currentChanges.length === 1 && currentChanges[0] === categoryId;
            // Si ya está seleccionada, deselecciona todas
            if (isSelected) {
                return { ...prev, [serviceId]: [] };
            }
            // Si no, selecciona solo esa
            return { ...prev, [serviceId]: [categoryId] };
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
        if (!newService.duration || newService.duration <= 0) {
            setError('La duración del servicio debe ser mayor a 0.');
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
            categoryIds: newServiceCategoryId ? [newServiceCategoryId] : undefined,
        };
        try {
            await dispatch({ type: 'ADD_SERVICE', payload: serviceToAdd });
            setIsAdding(false);
            setNewService(newServiceTemplate);
            setNewServiceAssignedEmployeeIds([]); // Reiniciar el estado
            setNewServiceCategoryId(null); // Reiniciar categoría
            setNewServiceBufferEnabled(false); // Reiniciar toggle de tiempo de descanso
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDeleteService = (service: Service) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    const confirmDeleteService = async () => {
        if (!serviceToDelete) return;
        setError(null);
        try {
            await dispatch({ type: 'DELETE_SERVICE', payload: serviceToDelete.id });
            setShowDeleteModal(false);
            setServiceToDelete(null);
        } catch (e: any) {
            setError(e.message);
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
                    setNewServiceCategoryId(null); // Resetear categoría
                    setNewServiceBufferEnabled(false); // Resetear toggle de tiempo de descanso
                }} variant={isAdding ? 'secondary' : 'primary'} className="w-full sm:w-auto">
                    {isAdding ? 'Cancelar' : 'Añadir Servicio'}
                </Button>
            </div>

            {error && <ErrorMessage message={error} />}

            {isAdding && (
                <div className="p-4 border-2 border-primary rounded-lg bg-surface space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-primary text-lg">Nuevo Servicio</h4>
                    </div>
                    <div>
                        <SecondaryText as="label" className="block mb-1">Nombre del Servicio *</SecondaryText>
                        <input
                            type="text"
                            placeholder="Ej: Corte de cabello"
                            value={newService.name}
                            onChange={(e) => setNewService({...newService, name: e.target.value})}
                            className={`w-full p-3 border-2 rounded-md bg-background text-primary transition-all ${
                                !newService.name.trim()
                                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                    : 'border-default focus:border-primary focus:ring-2 focus:ring-primary/20'
                            }`}
                        />
                        {!newService.name.trim() && (
                            <SecondaryText size="xs" className="mt-1 text-red-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                El nombre es obligatorio
                            </SecondaryText>
                        )}
                    </div>
                    <textarea
                        placeholder="Descripción"
                        value={newService.description}
                        onChange={(e) => setNewService({...newService, description: e.target.value})}
                        className="w-full p-2 border border-default rounded bg-background text-primary resize-y [&::-webkit-resizer]:bg-primary [&::-webkit-resizer]:rounded-br [&::-webkit-resizer]:border-2 [&::-webkit-resizer]:border-primary [&::-webkit-resizer]:shadow-md [&::-webkit-resizer]:w-12 [&::-webkit-resizer]:h-12 sm:[&::-webkit-resizer]:w-4 sm:[&::-webkit-resizer]:h-4"
                        rows={2}
                        style={{
                            resize: 'vertical',
                        }}
                    ></textarea>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <SecondaryText as="label" className="block mb-1">Duración *</SecondaryText>
                            <DurationInput
                                value={newService.duration}
                                onChange={(minutes) => setNewService({...newService, duration: minutes})}
                                hoursPlaceholder="Horas"
                                minutesPlaceholder="Min"
                                error={isDurationInvalid}
                            />
                            {isDurationInvalid && (
                                <SecondaryText size="xs" className="mt-1 text-red-600 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    La duración debe ser mayor a 0
                                </SecondaryText>
                            )}
                        </div>
                        <div>
                            <SecondaryText as="label" className="block mb-1">Precio</SecondaryText>
                            <div className="relative">
                                <SecondaryText as="span" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-70">$</SecondaryText>
                                <input type="number" placeholder="0" value={newService.price} onChange={(e) => setNewService({...newService, price: Number(e.target.value)})} className="w-full p-2 pl-8 border border-default rounded bg-background text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Toggle para tiempo de descanso */}
                    <SecondaryText as="label" className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={newServiceBufferEnabled}
                            onChange={(e) => {
                                setNewServiceBufferEnabled(e.target.checked);
                                if (!e.target.checked) {
                                    setNewService({...newService, buffer: 0});
                                }
                            }}
                            className="rounded accent-primary"
                        />
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Agregar tiempo de descanso entre turnos
                        </span>
                    </SecondaryText>

                    {/* Campo de tiempo de descanso (solo visible si está habilitado) */}
                    {newServiceBufferEnabled && (
                        <div className="border-2 border-primary/30 bg-primary/5 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-primary mb-2">
                                ⏱️ Tiempo de descanso
                            </label>
                            <SecondaryText size="xs" className="mb-2">
                                Intervalo entre turnos para preparación o limpieza
                            </SecondaryText>
                            <DurationInput
                                value={newService.buffer}
                                onChange={(minutes) => setNewService({...newService, buffer: minutes})}
                                hoursPlaceholder="Horas"
                                minutesPlaceholder="Min"
                            />
                        </div>
                    )}

                    <SecondaryText as="label" className="flex items-center space-x-2">
                        <input type="checkbox" checked={newService.requiresDeposit} onChange={(e) => setNewService({...newService, requiresDeposit: e.target.checked})} className="rounded accent-primary"/>
                        <span>Requiere depósito</span>
                    </SecondaryText>

                    {/* Sección de asignación de empleados para nuevo servicio */}
                    <div className={`border-2 p-4 rounded-lg transition-all ${
                        newServiceAssignedEmployeeIds.length === 0
                            ? 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-700'
                            : 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-primary flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Asignar Empleados *
                            </h5>
                            <StatusBadge
                                status={newServiceAssignedEmployeeIds.length === 0 ? 'inactive' : 'active'}
                                size="xs"
                            >
                                {newServiceAssignedEmployeeIds.length} seleccionado{newServiceAssignedEmployeeIds.length !== 1 ? 's' : ''}
                            </StatusBadge>
                        </div>
                        {business.employees.length === 0 ? (
                            <p className="text-secondary">No hay empleados registrados. Por favor, añade empleados primero.</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {business.employees.map(employee => (
                                        <div key={employee.id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                            newServiceAssignedEmployeeIds.includes(employee.id)
                                                ? 'border-primary bg-primary/10'
                                                : 'border-default bg-surface hover:border-primary/50'
                                        }`}>
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
                                                className="rounded accent-primary mr-3 w-5 h-5"
                                            />
                                            <label htmlFor={`new-service-employee-${employee.id}`} className="text-primary cursor-pointer flex-1 font-medium">{employee.name}</label>
                                            {newServiceAssignedEmployeeIds.includes(employee.id) && (
                                                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {newServiceAssignedEmployeeIds.length === 0 && (
                                    <SecondaryText size="xs" className="mt-2 text-red-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Debes seleccionar al menos un empleado
                                    </SecondaryText>
                                )}
                            </>
                        )}
                    </div>

                    {/* Sección de asignación de categorías para nuevo servicio (radio/toggle) */}
                    {business.categories.length > 0 && (
                        <div className="border border-default p-4 rounded-md bg-background">
                            <h5 className="font-semibold text-primary mb-2">Asignar a Categoría (solo una)</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {business.categories.map(category => (
                                    <div key={category.id} className="flex items-center p-2 border border-default rounded-md bg-surface">
                                        <input
                                            type="radio"
                                            id={`new-service-category-${category.id}`}
                                            checked={newServiceCategoryId === category.id}
                                            onChange={() => {
                                                setNewServiceCategoryId(prevId => prevId === category.id ? null : category.id);
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
                    <div key={service.id} className="p-5 border-2 border-default rounded-lg space-y-4 bg-surface hover:shadow-md transition-shadow relative">
                        {/* Badge de cambios pendientes */}
                        {pendingCategoryChanges[service.id] && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white shadow-sm animate-pulse"
                                 title="Cambios sin guardar"
                            />
                        )}

                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <input type="text" defaultValue={service.name} onBlur={(e) => handleServiceChange(service.id, 'name', e.target.value)} className="text-base font-semibold border-b-2 border-transparent focus:border-b-primary w-full focus:outline-none bg-surface text-primary py-1" placeholder="Nombre del servicio" />
                            </div>
                            <button onClick={() => handleDeleteService(service)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-red-200" aria-label="Eliminar servicio">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <textarea
                            defaultValue={service.description}
                            onBlur={(e) => handleServiceChange(service.id, 'description', e.target.value)}
                            className="w-full text-base text-secondary border border-default rounded-md p-2 focus:ring-primary focus:border-primary bg-surface resize-y [&::-webkit-resizer]:bg-primary [&::-webkit-resizer]:rounded-br [&::-webkit-resizer]:border-2 [&::-webkit-resizer]:border-primary [&::-webkit-resizer]:shadow-md [&::-webkit-resizer]:w-12 [&::-webkit-resizer]:h-12 sm:[&::-webkit-resizer]:w-4 sm:[&::-webkit-resizer]:h-4"
                            rows={3}
                            style={{
                                resize: 'vertical',
                            }}
                        ></textarea>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <SecondaryText as="label" className="block mb-1">Duración</SecondaryText>
                                <DurationInput
                                    value={service.duration}
                                    onChange={(minutes) => handleServiceChange(service.id, 'duration', minutes)}
                                    hoursPlaceholder="Horas"
                                    minutesPlaceholder="Min"
                                />
                            </div>
                            <div>
                                <SecondaryText as="label" className="block mb-1">Precio</SecondaryText>
                                <div className="relative">
                                    <SecondaryText as="span" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-70">$</SecondaryText>
                                    <input type="number" defaultValue={service.price} onBlur={(e) => handleServiceChange(service.id, 'price', e.target.value)} className="w-full p-2 pl-8 border border-default rounded bg-surface text-primary" title="Precio" />
                                </div>
                            </div>
                        </div>

                        {/* Toggle para tiempo de descanso */}
                        <SecondaryText as="label" className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={bufferEnabledMap[service.id] ?? service.buffer > 0}
                                onChange={(e) => {
                                    setBufferEnabledMap(prev => ({...prev, [service.id]: e.target.checked}));
                                    if (!e.target.checked) {
                                        handleServiceChange(service.id, 'buffer', 0);
                                    }
                                }}
                                className="rounded accent-primary"
                            />
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Agregar tiempo de descanso entre turnos
                            </span>
                        </SecondaryText>

                        {/* Campo de tiempo de descanso (solo visible si está habilitado) */}
                        {(bufferEnabledMap[service.id] ?? service.buffer > 0) && (
                            <div className="border-2 border-primary/30 bg-primary/5 p-4 rounded-lg">
                                <label className="block text-sm font-medium text-primary mb-2">
                                    ⏱️ Tiempo de descanso
                                </label>
                                <SecondaryText size="xs" className="mb-2">
                                    Intervalo entre turnos para preparación o limpieza
                                </SecondaryText>
                                <DurationInput
                                    value={service.buffer}
                                    onChange={(minutes) => handleServiceChange(service.id, 'buffer', minutes)}
                                    hoursPlaceholder="Horas"
                                    minutesPlaceholder="Min"
                                />
                            </div>
                        )}

                         <SecondaryText as="label" className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" defaultChecked={!!service.requiresDeposit} onChange={(e) => handleServiceChange(service.id, 'requiresDeposit', e.target.checked)} className="rounded accent-primary"/>
                            <span>Requiere depósito</span>
                        </SecondaryText>

                        {/* Categorías asignadas */}
                        {business.categories.length > 0 && (
                            <div className="pt-2">
                                <SecondaryText as="h6" className="mb-2">Categorías:</SecondaryText>
                                <div className="flex flex-wrap gap-2">
                                    {business.categories.map(category => {
                                            const currentCategoryIds = pendingCategoryChanges[service.id] ?? service.categoryIds ?? [];
                                            const isAssigned = currentCategoryIds.length === 1 && currentCategoryIds[0] === category.id;
                                            return (
                                                <button
                                                    key={category.id}
                                                    onClick={() => handleToggleCategory(service.id, category.id)}
                                                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                                        isAssigned
                                                            ? 'bg-primary text-brand-text border-primary'
                                                            : 'bg-surface text-secondary border-default hover:border-primary'
                                                    }`}
                                                    aria-label={isAssigned ? `Remover categoría ${category.name} de servicio ${service.name}` : `Asignar categoría ${category.name} a servicio ${service.name}`}
                                                    aria-pressed={isAssigned}
                                                >
                                                    {category.name}
                                                </button>
                                            );
                                        })}
                                </div>
                                {pendingCategoryChanges[service.id] && (
                                    <div className="mt-3 flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-700 rounded-md">
                                        <div className="flex-1">
                                            <SecondaryText as="p" className="font-medium text-yellow-800 dark:text-yellow-200">
                                                ⚠️ Cambios sin guardar
                                            </SecondaryText>
                                            <SecondaryText as="p" size="xs" className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                                                Haz clic en "Guardar" para aplicar los cambios de categoría
                                            </SecondaryText>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    setPendingCategoryChanges(prev => {
                                                        const { [service.id]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                }}
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Cancelar cambios de categoría para ${service.name}`}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                onClick={() => handleSaveChanges(service.id)}
                                                variant="primary"
                                                size="sm"
                                                aria-label={`Guardar cambios de categoría para ${service.name}`}
                                            >
                                                Guardar
                                            </Button>
                                        </div>
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

            {/* Modal de confirmación de eliminación */}
            {showDeleteModal && serviceToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-lg shadow-xl max-w-md w-full">
                        {/* Header */}
                        <div className="p-6 border-b border-default">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-primary">
                                        Eliminar Servicio
                                    </h3>
                                    <SecondaryText className="mt-1">
                                        Esta acción no se puede deshacer.
                                    </SecondaryText>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-primary mb-2">
                                    ¿Estás seguro que quieres eliminar el servicio <strong>"{serviceToDelete.name}"</strong>?
                                </p>
                                <SecondaryText as="div" className="p-3 bg-surface border border-default rounded-md">
                                    <p className="text-primary"><strong>Detalles del servicio:</strong></p>
                                    <ul className="mt-2 space-y-1">
                                        <li>💰 Precio: ${serviceToDelete.price}</li>
                                        <li>⏱️ Duración: {serviceToDelete.duration} min</li>
                                        <li>👥 Empleados asignados: {serviceToDelete.employeeIds?.length || 0}</li>
                                    </ul>
                                </SecondaryText>
                            </div>

                            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-md">
                                <div className="flex gap-2">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <SecondaryText className="text-red-800 dark:text-red-200">
                                        <strong>Atención:</strong> Al eliminar este servicio, ya no estará disponible para nuevas reservas.
                                    </SecondaryText>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-default bg-surface flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setServiceToDelete(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmDeleteService}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar Servicio
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
