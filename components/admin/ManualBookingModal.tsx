import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Service, Client } from '../../types';
import { useBusinessState } from '../../context/BusinessContext';
import { getAvailableSlots, findAvailableEmployeeForSlot } from '../../services/api';
import { supabaseBackend } from '../../services/supabaseBackend';
import { ClientSearchInput } from '../common/ClientSearchInput';
import { ClientFormModal } from '../common/ClientFormModal';

// Helper: Convertir Date a string local YYYY-MM-DD
const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Obtener fecha mínima (hoy) en formato YYYY-MM-DD
const getTodayString = (): string => {
    return getLocalDateString(new Date());
};

interface ManualBookingModalProps {
    defaultDate?: Date;
    onClose: () => void;
    onSave: (newBooking: Omit<Booking, 'id'>) => void;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ defaultDate, onClose, onSave }) => {
    const business = useBusinessState();

    // Internal date state
    const [bookingDate, setBookingDate] = useState(defaultDate || new Date());

    // Client state
    const [useExistingClient, setUseExistingClient] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showClientForm, setShowClientForm] = useState(false);

    // Manual client fields (backward compatible)
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    // Booking state
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'any' | null>(null);
    const [slot, setSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const dateStr = getLocalDateString(bookingDate);

    useEffect(() => {
        if (selectedServices.length > 0 && selectedEmployeeId) {
            setLoadingSlots(true);
            getAvailableSlots(bookingDate, selectedServices, business, selectedEmployeeId)
                .then(setAvailableSlots)
                .finally(() => setLoadingSlots(false));
        } else {
            setAvailableSlots([]);
        }
    }, [bookingDate, selectedServices, selectedEmployeeId, business]);
    
    const handleServiceToggle = (service: Service) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.id === service.id);
            return isSelected ? prev.filter(s => s.id !== service.id) : [...prev, service];
        });
        setSelectedEmployeeId(null);
        setSlot(null);
    };

    const eligibleEmployees = useMemo(() => {
        if (selectedServices.length === 0) return [];
        const serviceEmployeeSets = selectedServices.map(s => new Set(s.employeeIds));
        return business.employees.filter(emp => 
            serviceEmployeeSets.every(idSet => idSet.size === 0 || idSet.has(emp.id))
        );
    }, [selectedServices, business.employees]);

    // Client handlers
    const handleClientSelect = (client: Client | null) => {
        setSelectedClient(client);
        if (client) {
            setClientName(client.name);
            setClientPhone(client.phone);
            setClientEmail(client.email || '');
        }
    };

    const handleCreateNewClient = () => {
        setShowClientForm(true);
    };

    const handleClientSaved = (client: Client) => {
        setSelectedClient(client);
        setClientName(client.name);
        setClientPhone(client.phone);
        setClientEmail(client.email || '');
        setUseExistingClient(true);
        setShowClientForm(false);
    };

    // Validation helper
    const isClientDataValid = () => {
        return clientName.trim().length > 0 && clientPhone.trim().length >= 8;
    };

    // Handle "Save & Add to Clients" button
    const handleSaveAndAddToClients = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // First validate and create the booking
        if (!slot || !selectedEmployeeId) {
            alert("Por favor completa todos los campos.");
            return;
        }

        // Don't allow if already using existing client (no need to create again)
        if (useExistingClient && selectedClient) {
            alert("Este cliente ya está registrado. Solo usa 'Guardar Reserva'.");
            return;
        }

        // Validate client data
        if (!isClientDataValid()) {
            alert("Por favor ingresa nombre y teléfono válidos para guardar el cliente.");
            return;
        }

        // Validate date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(bookingDate);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        
        if (selectedDateNormalized < today) {
            alert("⚠️ No se pueden crear reservas en fechas pasadas");
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create the client first
            const newClient = await supabaseBackend.createClient({
                business_id: business.id,
                name: clientName,
                phone: clientPhone,
                email: clientEmail || undefined,
            });

            // 2. Now create the booking with the client reference
            const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration + s.buffer, 0);

            let finalEmployeeId = selectedEmployeeId;
            if (selectedEmployeeId === 'any') {
                const availableEmployee = findAvailableEmployeeForSlot(bookingDate, slot, totalDuration, selectedServices, business);
                if (availableEmployee) {
                    finalEmployeeId = availableEmployee.id;
                } else {
                    alert("No se encontró un empleado disponible para este horario.");
                    return;
                }
            }

            const startDate = new Date(`${dateStr}T${slot}:00`);
            const endDate = new Date(startDate.getTime() + totalDuration * 60000);
            const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            
            const newBooking: Omit<Booking, 'id'> = {
                businessId: business.id,
                client: { 
                    name: newClient.name, 
                    email: newClient.email || undefined, 
                    phone: newClient.phone,
                    id: newClient.id
                },
                clientId: newClient.id,
                date: dateStr,
                start: slot,
                end,
                services: selectedServices.map(s => ({ id: s.id, businessId: business.id, name: s.name, price: s.price })),
                employeeId: finalEmployeeId,
                status: 'confirmed',
                notes: 'Reserva manual',
            };
            
            onSave(newBooking);
        } catch (error: any) {
            alert(`Error: ${error.message || 'No se pudo guardar'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slot || !selectedEmployeeId) {
            alert("Por favor completa todos los campos.");
            return;
        }

        // Validar que la fecha no sea pasada
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(bookingDate);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        
        if (selectedDateNormalized < today) {
            alert("⚠️ No se pueden crear reservas en fechas pasadas");
            return;
        }

        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration + s.buffer, 0);

        let finalEmployeeId = selectedEmployeeId;
        if (selectedEmployeeId === 'any') {
            const availableEmployee = findAvailableEmployeeForSlot(bookingDate, slot, totalDuration, selectedServices, business);
            if (availableEmployee) {
                finalEmployeeId = availableEmployee.id;
            } else {
                alert("No se encontró un empleado disponible para este horario. Por favor, verifica los horarios del personal.");
                return;
            }
        }


        const startDate = new Date(`${dateStr}T${slot}:00`);
        const endDate = new Date(startDate.getTime() + totalDuration * 60000);
        const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        
        const newBooking: Omit<Booking, 'id'> = {
            businessId: business.id,
            client: { 
                name: clientName, 
                email: clientEmail || undefined, 
                phone: clientPhone,
                id: selectedClient?.id // ← Incluir client ID si está seleccionado
            },
            clientId: selectedClient?.id, // ← NUEVO: Relación con cliente registrado
            date: dateStr,
            start: slot,
            end,
            services: selectedServices.map(s => ({ id: s.id, businessId: business.id, name: s.name, price: s.price })),
            employeeId: finalEmployeeId,
            status: 'confirmed',
            notes: 'Reserva manual',
        };
        setIsSaving(true);
        try {
            await onSave(newBooking);
        } catch (error) {
            alert('Error al guardar la reserva.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 overflow-y-auto z-50" onClick={onClose}>
            <div className="min-h-full flex items-start md:items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto text-primary focus:outline-none" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary mb-4">Nueva Reserva Manual</h2>
                
                <div className="space-y-4">
                    {/* Date Picker */}
                    <fieldset className="border border-default p-4 rounded-md bg-surface">
                        <legend className="font-semibold px-2 text-primary">Fecha de la Reserva</legend>
                        <input
                            type="date"
                            value={dateStr}
                            onChange={(e) => setBookingDate(new Date(e.target.value + 'T00:00:00'))}
                            min={getTodayString()}
                            className="p-2 w-full border border-default rounded-md bg-background text-primary"
                            required
                        />
                    </fieldset>

                    {/* Client Info */}
                    <fieldset className="border border-default p-4 rounded-md bg-surface">
                        <legend className="font-semibold px-2 text-primary">Datos del Cliente</legend>
                        
                        {/* Toggle: Cliente existente / Manual */}
                        <div className="mb-4 flex items-center gap-3">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useExistingClient}
                                    onChange={(e) => {
                                        setUseExistingClient(e.target.checked);
                                        if (!e.target.checked) {
                                            setSelectedClient(null);
                                            setClientName('');
                                            setClientPhone('');
                                            setClientEmail('');
                                        }
                                    }}
                                    className="mr-2 h-4 w-4 text-primary focus:ring-primary/50 border-default rounded"
                                />
                                <span className="text-sm text-primary">Buscar cliente existente</span>
                            </label>
                        </div>

                        {useExistingClient ? (
                            /* Cliente Search Input */
                            <ClientSearchInput
                                businessId={business.id}
                                onClientSelect={handleClientSelect}
                                onCreateNewClient={handleCreateNewClient}
                            />
                        ) : (
                            /* Campos manuales (backward compatible) */
                            <div className="grid sm:grid-cols-3 gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Nombre" 
                                    value={clientName} 
                                    onChange={e => setClientName(e.target.value)} 
                                    required 
                                    className="p-2 border border-default rounded-md bg-background text-primary"
                                />
                                <input 
                                    type="email" 
                                    placeholder="Email (Opcional)" 
                                    value={clientEmail} 
                                    onChange={e => setClientEmail(e.target.value)} 
                                    className="p-2 border border-default rounded-md bg-background text-primary"
                                />
                                <input 
                                    type="tel" 
                                    placeholder="Teléfono" 
                                    value={clientPhone} 
                                    onChange={e => setClientPhone(e.target.value)} 
                                    required 
                                    className="p-2 border border-default rounded-md bg-background text-primary"
                                />
                            </div>
                        )}
                    </fieldset>

                    {/* Service Selection */}
                    <fieldset className="border border-default p-4 rounded-md bg-surface">
                        <legend className="font-semibold px-2 text-primary">Servicios</legend>
                        <div className="flex flex-wrap gap-2">
                            {business.services.map(service => (
                                <label key={service.id} className={`p-2 border border-default rounded-full text-sm cursor-pointer text-primary ${selectedServices.some(s => s.id === service.id) ? 'bg-primary text-brand-text' : 'bg-background'}`}>
                                    <input type="checkbox" className="hidden" onChange={() => handleServiceToggle(service)} />
                                    {service.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Employee Selection */}
                    {selectedServices.length > 0 && (
                        <fieldset className="border border-default p-4 rounded-md bg-surface">
                             <legend className="font-semibold px-2 text-primary">Empleado</legend>
                             <select value={selectedEmployeeId || ''} onChange={e => setSelectedEmployeeId(e.target.value)} required className="p-2 w-full border border-default rounded-md bg-surface text-primary" disabled={eligibleEmployees.length === 0}>
                                <option value="" disabled>Seleccionar empleado</option>
                                {eligibleEmployees.length > 0 ? (
                                    <>
                                        <option value="any">Cualquiera disponible</option>
                                        {eligibleEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </>
                                ) : (
                                    <option disabled>No hay empleados elegibles para esta selección</option>
                                )}
                            </select>
                        </fieldset>
                    )}
                    
                     {/* Time Slot Selection */}
                    {selectedEmployeeId && (
                         <fieldset className="border border-default p-4 rounded-md bg-surface">
                            <legend className="font-semibold px-2 text-primary">Horario</legend>
                            {loadingSlots ? <p className="text-primary">Cargando horarios...</p> : (
                                <div className="flex flex-wrap gap-2">
                                    {availableSlots.length > 0 ? availableSlots.map(s => (
                                        <button type="button" key={s} onClick={() => setSlot(s)} className={`p-2 border border-default rounded-md text-primary ${slot === s ? 'bg-primary text-brand-text' : 'bg-background'}`}>{s}</button>
                                    )) : <p className="text-primary">No hay horarios disponibles.</p>}
                                </div>
                            )}
                        </fieldset>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-default">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-full sm:w-auto bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover border border-default"
                    >
                        Cancelar
                    </button>
                    
                    {/* Show "Add to Clients" button only when NOT using existing client */}
                    {!useExistingClient && (
                        <button 
                            type="button"
                            onClick={handleSaveAndAddToClients}
                            className="w-full sm:flex-1 bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover border border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving || !slot || !isClientDataValid()}
                            title={!isClientDataValid() ? "Completa nombre y teléfono válidos" : "Guardar reserva y añadir cliente a la base de datos"}
                        >
                            {isSaving ? 'Guardando...' : '📋 Añadir a Clientes'}
                        </button>
                    )}
                    
                    <button
                        type="submit"
                        className="w-full sm:flex-1 bg-primary text-brand-text font-bold py-3 px-4 rounded-lg hover:bg-primary-dark disabled:bg-secondary disabled:opacity-50"
                        disabled={isSaving || !slot}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Reserva'}
                    </button>
                </div>
            </form>
            </div>
            
            {/* Client Form Modal */}
            {showClientForm && (
                <ClientFormModal
                    businessId={business.id}
                    onClose={() => setShowClientForm(false)}
                    onSave={handleClientSaved}
                    initialName={clientName}
                />
            )}
        </div>
    );
};