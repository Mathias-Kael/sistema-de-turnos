import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Service } from '../../types';
import ServiceAssignmentEditor from './ServiceAssignmentEditor';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Button } from '../ui/Button';

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
    const [error, setError] = useState<string | null>(null);

    const handleServiceChange = (id: string, field: keyof Service, value: any) => {
        const serviceToUpdate = business.services.find(s => s.id === id);
        if (serviceToUpdate) {
            if (field === 'duration' || field === 'buffer' || field === 'price') {
                value = Number(value) || 0;
            }
            const updatedService = { ...serviceToUpdate, [field]: value };
            dispatch({ type: 'UPDATE_SERVICE', payload: updatedService }).catch(e => setError(e.message));
        }
    };

    const handleAddService = async () => {
        setError(null);
        if (!newService.name.trim()) {
            setError('El nombre del servicio es obligatorio.');
            return;
        }
        const serviceToAdd: Service = {
            id: `s${Date.now()}`,
            ...newService
        };
        try {
            await dispatch({ type: 'ADD_SERVICE', payload: serviceToAdd });
            setIsAdding(false);
            setNewService(newServiceTemplate);
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
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary">Gestión de Servicios</h3>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
                    {isAdding ? 'Cancelar' : 'Añadir Servicio'}
                </Button>
            </div>

            {error && <ErrorMessage message={error} />}

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
                        <div className="grid grid-cols-3 gap-4">
                             <input type="number" defaultValue={service.duration} onBlur={(e) => handleServiceChange(service.id, 'duration', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Duración (minutos)" />
                             <input type="number" defaultValue={service.buffer} onBlur={(e) => handleServiceChange(service.id, 'buffer', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Buffer (minutos)" />
                             <input type="number" defaultValue={service.price} onBlur={(e) => handleServiceChange(service.id, 'price', e.target.value)} className="w-full p-2 border border-default rounded bg-surface text-primary" title="Precio ($)" />
                        </div>
                         <label className="flex items-center space-x-2 text-sm cursor-pointer text-secondary">
                            <input type="checkbox" defaultChecked={!!service.requiresDeposit} onChange={(e) => handleServiceChange(service.id, 'requiresDeposit', e.target.checked)} className="rounded accent-primary"/>
                            <span>Requiere depósito</span>
                        </label>
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
                    onClose={() => setEditingServiceAssignment(null)}
                />
            )}
        </div>
    );
};
