import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Service } from '../../types';
import { useBusinessState } from '../../context/BusinessContext';
import { getAvailableSlots, findAvailableEmployeeForSlot } from '../../services/api';

interface ManualBookingModalProps {
    selectedDate: Date;
    existingBookings: Booking[];
    onClose: () => void;
    onSave: (newBooking: Omit<Booking, 'id'>) => void;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ selectedDate, existingBookings, onClose, onSave }) => {
    const business = useBusinessState();
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'any' | null>(null);
    const [slot, setSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const dateStr = selectedDate.toISOString().split('T')[0];

    useEffect(() => {
        if (selectedServices.length > 0 && selectedEmployeeId) {
            setLoadingSlots(true);
            getAvailableSlots(selectedDate, selectedServices, business, selectedEmployeeId)
                .then(setAvailableSlots)
                .finally(() => setLoadingSlots(false));
        } else {
            setAvailableSlots([]);
        }
    }, [selectedDate, selectedServices, selectedEmployeeId, business]);
    
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!slot || !selectedEmployeeId) {
            alert("Por favor completa todos los campos.");
            return;
        }

        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration + s.buffer, 0);

        let finalEmployeeId = selectedEmployeeId;
        if (selectedEmployeeId === 'any') {
            const availableEmployee = findAvailableEmployeeForSlot(selectedDate, slot, totalDuration, selectedServices, business);
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
            client: { name: clientName, email: clientEmail || undefined, phone: clientPhone },
            date: dateStr,
            start: slot,
            end,
            services: selectedServices.map(s => ({ id: s.id, name: s.name, price: s.price })),
            employeeId: finalEmployeeId,
            status: 'confirmed',
            notes: 'Reserva manual',
        };
        onSave(newBooking);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-primary" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary mb-4">Nueva Reserva Manual</h2>
                <p className="mb-4 text-primary">Fecha: <strong>{selectedDate.toLocaleDateString('es-AR')}</strong></p>

                <div className="space-y-4">
                    {/* Client Info */}
                    <fieldset className="border border-default p-4 rounded-md bg-surface">
                        <legend className="font-semibold px-2 text-primary">Datos del Cliente</legend>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <input type="text" placeholder="Nombre" value={clientName} onChange={e => setClientName(e.target.value)} required className="p-2 border border-default rounded-md bg-background text-primary"/>
                            <input type="email" placeholder="Email (Opcional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="p-2 border border-default rounded-md bg-background text-primary"/>
                            <input type="tel" placeholder="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} required className="p-2 border border-default rounded-md bg-background text-primary"/>
                        </div>
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

                <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-default">
                    <button type="button" onClick={onClose} className="w-full bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover">Cancelar</button>
                    <button type="submit" className="w-full bg-primary text-brand-text font-bold py-3 px-4 rounded-lg hover:bg-primary-dark disabled:bg-secondary" disabled={!slot}>Guardar Reserva</button>
                </div>
            </form>
        </div>
    );
};