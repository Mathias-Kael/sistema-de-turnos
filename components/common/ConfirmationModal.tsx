import React, { useState, useMemo } from 'react';
import { Service, Business, Booking, Employee } from '../../types';
import { formatDuration } from '../../utils/format';
import { generateICS } from '../../utils/ics';
import { useBusinessDispatch } from '../../context/BusinessContext';
import { timeToMinutes, minutesToTime } from '../../utils/availability';
import { findAvailableEmployeeForSlot } from '../../services/api';

interface ConfirmationModalProps {
    date: Date;
    slot: string;
    selectedServices: Service[];
    employeeId: string | 'any';
    business: Business;
    onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ date, slot, selectedServices, employeeId, business, onClose }) => {
    const dispatch = useBusinessDispatch();
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignedEmployee, setAssignedEmployee] = useState<Employee | null>(null);
    
    const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + s.duration + s.buffer, 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((acc, s) => acc + s.price, 0), [selectedServices]);

    const employee = useMemo(() => {
        if (assignedEmployee) return assignedEmployee;
        if (employeeId === 'any') return null;
        return business.employees.find(e => e.id === employeeId);
    }, [employeeId, business.employees, assignedEmployee]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            const startTimeInMinutes = timeToMinutes(slot);
            const endTimeInMinutes = startTimeInMinutes + totalDuration;
            const endTime = minutesToTime(endTimeInMinutes);

            let finalEmployeeId = employeeId;
            
            if (employeeId === 'any') {
                console.log('[DEBUG] Business object in ConfirmationModal before finding employee:', JSON.stringify(business, null, 2));
                const availableEmployee = findAvailableEmployeeForSlot(date, slot, totalDuration, selectedServices, business);
                if (availableEmployee) {
                    finalEmployeeId = availableEmployee.id;
                    setAssignedEmployee(availableEmployee);
                } else {
                    setError('Este horario ya no está disponible. Por favor, selecciona otro.');
                    setIsSaving(false);
                    return;
                }
            }

            const newBooking: Omit<Booking, 'id'> = {
                date: date.toISOString().split('T')[0],
                start: slot,
                end: endTime,
                services: selectedServices,
                client: {
                    name: clientName,
                    email: clientEmail,
                    phone: clientPhone,
                },
                employeeId: finalEmployeeId,
                status: 'confirmed',
            };

            await dispatch({ type: 'CREATE_BOOKING', payload: newBooking });
            setIsConfirmed(true);

        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al confirmar la reserva. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    const whatsappMessage = useMemo(() => {
        const serviceNames = selectedServices.map(s => s.name).join(', ');
        const dateString = date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const text = `Hola ${business.name}, quiero confirmar mi turno para ${serviceNames} el ${dateString} a las ${slot}. Mi nombre es ${clientName}. ¡Gracias!`;
        return encodeURIComponent(text);
    }, [clientName, selectedServices, date, slot, business.name]);
    
    const whatsappUrl = `https://wa.me/${business.phone}?text=${whatsappMessage}`;

    if (isConfirmed) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
                <div className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full text-center text-primary" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-[color:var(--color-state-success-text)] mb-4">¡Turno Confirmado!</h2>
                    <p className="text-primary mb-4">
                        Recibirás un recordatorio por email. Tu turno para el <strong>{date.toLocaleDateString('es-AR')} a las {slot}</strong> ha sido agendado.
                    </p>
                    <div className="space-y-3">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block bg-[color:var(--color-state-success-bg)] text-brand-text font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-colors"
                        >
                            Confirmar por WhatsApp
                        </a>
                        <button
                            type="button"
                            onClick={() => generateICS(date, slot, selectedServices, business)}
                            className="w-full block bg-[color:var(--color-state-neutral-bg)] text-brand-text font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-colors"
                        >
                            Añadir al Calendario
                        </button>
                        <button type="button" onClick={onClose} className="w-full bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors mt-2">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <form onSubmit={handleConfirm} className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full text-primary" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary mb-4">Confirma tu turno</h2>
                
                <div className="bg-background p-4 rounded-lg mb-6">
                    <p><strong>Fecha:</strong> {date.toLocaleDateString('es-AR')}</p>
                    <p><strong>Hora:</strong> {slot}</p>
                    {employee && <p><strong>Con:</strong> {employee.name}</p>}
                    <p><strong>Servicios:</strong></p>
                    <ul className="list-disc list-inside text-sm pl-2">
                        {selectedServices.map(s => <li key={s.id}>{s.name}</li>)}
                    </ul>
                    <hr className="my-3 border-t border-default" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${totalPrice}</span>
                    </div>
                     <div className="text-right text-sm text-secondary">
                        <span>Duración total: {formatDuration(totalDuration)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-secondary">Nombre Completo</label>
                        <input type="text" id="name" value={clientName} onChange={e => setClientName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-secondary">Email (Opcional)</label>
                        <input type="email" id="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-secondary">Teléfono (WhatsApp)</label>
                        <input type="tel" id="phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                    </div>
                </div>

                {error && <p className="text-sm text-center text-red-500 mt-4">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-default">
                    <button type="button" onClick={onClose} className="w-full bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="w-full bg-primary text-brand-text font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Confirmando...' : 'Confirmar Reserva'}
                    </button>
                </div>
            </form>
        </div>
    );
};
