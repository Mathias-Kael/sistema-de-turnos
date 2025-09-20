import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Service } from '../../types';
import { useBusinessState } from '../../context/BusinessContext';
import { getAvailableSlots } from '../../services/api';

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

        let finalEmployeeId = selectedEmployeeId;
        if (selectedEmployeeId === 'any') {
            if (eligibleEmployees.length > 0) {
                finalEmployeeId = eligibleEmployees[0].id; // Asigna al primer empleado elegible
            } else {
                alert("No hay empleados elegibles para realizar los servicios seleccionados.");
                return;
            }
        }


        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration + s.buffer, 0);
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
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Nueva Reserva Manual</h2>
                <p className="mb-4">Fecha: <strong>{selectedDate.toLocaleDateString('es-AR')}</strong></p>

                <div className="space-y-4">
                    {/* Client Info */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Datos del Cliente</legend>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <input type="text" placeholder="Nombre" value={clientName} onChange={e => setClientName(e.target.value)} required className="p-2 border rounded-md"/>
                            <input type="email" placeholder="Email (Opcional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="p-2 border rounded-md"/>
                            <input type="tel" placeholder="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} required className="p-2 border rounded-md"/>
                        </div>
                    </fieldset>

                    {/* Service Selection */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Servicios</legend>
                        <div className="flex flex-wrap gap-2">
                            {business.services.map(service => (
                                <label key={service.id} className={`p-2 border rounded-full text-sm cursor-pointer ${selectedServices.some(s => s.id === service.id) ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                    <input type="checkbox" className="hidden" onChange={() => handleServiceToggle(service)} />
                                    {service.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Employee Selection */}
                    {selectedServices.length > 0 && (
                        <fieldset className="border p-4 rounded-md">
                             <legend className="font-semibold px-2">Empleado</legend>
                             <select value={selectedEmployeeId || ''} onChange={e => setSelectedEmployeeId(e.target.value)} required className="p-2 w-full border rounded-md bg-white" disabled={eligibleEmployees.length === 0}>
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
                         <fieldset className="border p-4 rounded-md">
                            <legend className="font-semibold px-2">Horario</legend>
                            {loadingSlots ? <p>Cargando horarios...</p> : (
                                <div className="flex flex-wrap gap-2">
                                    {availableSlots.length > 0 ? availableSlots.map(s => (
                                        <button type="button" key={s} onClick={() => setSlot(s)} className={`p-2 border rounded-md ${slot === s ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>{s}</button>
                                    )) : <p>No hay horarios disponibles.</p>}
                                </div>
                            )}
                        </fieldset>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t">
                    <button type="button" onClick={onClose} className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400" disabled={!slot}>Guardar Reserva</button>
                </div>
            </form>
        </div>
    );
};