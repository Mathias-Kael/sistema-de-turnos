import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Service } from '../../types';
import ServiceAssignmentEditor from './ServiceAssignmentEditor';

const newServiceTemplate: Omit<Service, 'id'> = {
    name: '',
    description: '',
    duration: 30,
    buffer: 0,
    price: 0,
    requiresDeposit: false,
    employeeIds: [],
};

export const ServicesEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState(newServiceTemplate);
    const [editingServiceAssignment, setEditingServiceAssignment] = useState<Service | null>(null);

    const handleServiceChange = (id: string, field: keyof Service, value: any) => {
        const updatedServices = business.services.map(service => {
            if (service.id === id) {
                // Ensure numeric values are stored as numbers
                if (field === 'duration' || field === 'buffer' || field === 'price') {
                    value = Number(value) || 0;
                }
                return { ...service, [field]: value };
            }
            return service;
        });
        dispatch({ type: 'SET_SERVICES', payload: updatedServices });
    };

    const handleAddService = () => {
        if (!newService.name.trim()) {
            alert('El nombre del servicio es obligatorio.');
            return;
        }
        const serviceToAdd: Service = {
            id: `s${Date.now()}`,
            ...newService
        };
        const updatedServices = [...business.services, serviceToAdd];
        dispatch({ type: 'SET_SERVICES', payload: updatedServices });
        setIsAdding(false);
        setNewService(newServiceTemplate);
    };

    const handleDeleteService = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este servicio?')) {
            const updatedServices = business.services.filter(service => service.id !== id);
            dispatch({ type: 'SET_SERVICES', payload: updatedServices });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary">Gestión de Servicios</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-primary text-brand-text text-sm font-medium rounded-md hover:bg-primary-dark">
                    {isAdding ? 'Cancelar' : 'Añadir Servicio'}
                </button>
            </div>

            {isAdding && (
                <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Nuevo Servicio</h4>
                    <input type="text" placeholder="Nombre del Servicio" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    <textarea placeholder="Descripción" value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} className="w-full p-2 border border-default rounded bg-background text-primary" rows={2}></textarea>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input type="number" placeholder="Duración (min)" value={newService.duration} onChange={(e) => setNewService({...newService, duration: Number(e.target.value)})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                        <input type="number" placeholder="Buffer (min)" value={newService.buffer} onChange={(e) => setNewService({...newService, buffer: Number(e.target.value)})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                        <input type="number" placeholder="Precio ($)" value={newService.price} onChange={(e) => setNewService({...newService, price: Number(e.target.value)})} className="w-full p-2 border border-default rounded bg-background text-primary" />
                    </div>
                    <label className="flex items-center space-x-2 text-secondary">
                        <input type="checkbox" checked={newService.requiresDeposit} onChange={(e) => setNewService({...newService, requiresDeposit: e.target.checked})} className="rounded accent-primary"/>
                        <span>Requiere depósito</span>
                    </label>
                    <button onClick={handleAddService} className="w-full py-2 bg-[color:var(--color-state-success-bg)] text-brand-text font-bold rounded-md hover:opacity-90">Guardar Servicio</button>
                </div>
            )}

            <div className="space-y-4">
                {business.services.map(service => (
                    <div key={service.id} className="p-4 border border-default rounded-md space-y-3 bg-surface">
                        <div className="flex justify-between items-start">
                            <input type="text" value={service.name} onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)} className="text-md font-semibold border-b border-default focus:border-b-primary w-full focus:outline-none bg-surface text-primary" />
                            <button onClick={() => handleDeleteService(service.id)} className="text-[color:var(--color-state-danger-text)] hover:text-[color:var(--color-state-danger-strong)] ml-4 p-1 rounded-full hover:bg-[color:var(--color-state-danger-bg)] transition-colors">&#x1F5D1;</button>
                        </div>
                        <textarea value={service.description} onChange={(e) => handleServiceChange(service.id, 'description', e.target.value)} className="w-full text-sm text-secondary border border-default rounded-md p-2 focus:ring-primary focus:border-primary bg-surface" rows={2}></textarea>
                        <div className="grid grid-cols-3 gap-4">
                             <input type="number" value={service.duration} onChange={(e) => handleServiceChange(service.id, 'duration', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Duración (minutos)" />
                             <input type="number" value={service.buffer} onChange={(e) => handleServiceChange(service.id, 'buffer', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Buffer (minutos)" />
                             <input type="number" value={service.price} onChange={(e) => handleServiceChange(service.id, 'price', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Precio ($)" />
                        </div>
                         <label className="flex items-center space-x-2 text-sm cursor-pointer text-secondary">
                            <input type="checkbox" checked={!!service.requiresDeposit} onChange={(e) => handleServiceChange(service.id, 'requiresDeposit', e.target.checked)} className="rounded accent-primary"/>
                            <span>Requiere depósito</span>
                        </label>
                        <div>
                            <button
                                onClick={() => setEditingServiceAssignment(service)}
                                className="btn btn-sm btn-outline btn-info mt-2"
                            >
                                Asignar Empleados ({service.employeeIds?.length || 0})
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editingServiceAssignment && (
                <ServiceAssignmentEditor
                    service={editingServiceAssignment}
                    onClose={() => setEditingServiceAssignment(null)}
                />
            )}
        </div>
    );
};
