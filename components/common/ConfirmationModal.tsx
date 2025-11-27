import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Service, Business, Booking, Employee } from '../../types';
import { formatDuration } from '../../utils/format';
import { generateICS } from '../../utils/ics';
import { useBusinessDispatch } from '../../context/BusinessContext';
import { supabase } from '../../lib/supabase';
import { timeToMinutes, minutesToTime } from '../../utils/availability';
import { findAvailableEmployeeForSlot } from '../../services/api';
import { buildWhatsappUrl, canUseEmployeeWhatsapp } from '../../utils/whatsapp';
import { validateBookingInput } from '../../utils/validation';

// Tipos para el Success Bridge
type ModalState = 'form' | 'success';

interface WhatsappData {
  url: string;
  message: string;
  targetName: string;
}

interface ConfirmationModalProps {
    date: Date;
    slot: string;
    selectedServices: Service[];
    employeeId: string | 'any';
    business: Business;
    onClose: () => void;
    publicToken?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ date, slot, selectedServices, employeeId, business, onClose, publicToken }) => {
    let dispatch: any = null;
    try { dispatch = useBusinessDispatch(); } catch { /* en modo público sin provider */ }
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignedEmployee, setAssignedEmployee] = useState<Employee | null>(null);
    
    // Estados para el Success Bridge
    const [modalState, setModalState] = useState<ModalState>('form');
    const [whatsappData, setWhatsappData] = useState<WhatsappData | null>(null);
    const [redirectTimeout, setRedirectTimeout] = useState<NodeJS.Timeout | null>(null);
    
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
            // Validación centralizada
            const v = validateBookingInput({ name: clientName, phone: clientPhone, email: clientEmail });
            if (!v.ok || !v.normalized) {
                setError(Object.values(v.errors)[0] || 'Datos inválidos.');
                setIsSaving(false);
                return;
            }
            const { name: normName, phone: normPhone, email: normEmail } = v.normalized;
            const startTimeInMinutes = timeToMinutes(slot, 'open');
            const endTimeInMinutes = startTimeInMinutes + totalDuration;
            const endTime = minutesToTime(endTimeInMinutes);

            let finalEmployeeId = employeeId;
            
            if (employeeId === 'any') {
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

            const dateStr = date.toISOString().split('T')[0];
            const token = publicToken ?? new URLSearchParams(window.location.search).get('token') ?? undefined;

            if (dispatch) {
                const newBooking: Omit<Booking, 'id'> = {
                    businessId: business.id,
                    date: dateStr,
                    start: slot,
                    end: endTime,
                    services: selectedServices.map(s => ({ id: s.id, businessId: business.id, name: s.name, price: s.price })),
                    client: { name: normName, email: normEmail, phone: normPhone },
                    employeeId: finalEmployeeId,
                    status: 'confirmed',
                };
                await dispatch({ type: 'CREATE_BOOKING', payload: newBooking });
            } else {
                // Modo público: invocar Edge Function
                if (!token) throw new Error('Token ausente');
                const { data, error } = await supabase.functions.invoke('public-bookings', {
                    body: {
                        token,
                        services: selectedServices.map(s => ({ id: s.id })),
                        date: dateStr,
                        start: slot,
                        end: endTime,
                        employeeId: finalEmployeeId,
                        client: { name: normName, phone: normPhone, email: normEmail },
                    }
                });
                if (error || data?.error) throw new Error(error?.message || data?.error);
            }
            
            // Preparar datos de WhatsApp
            const finalEmp = assignedEmployee || (employeeId !== 'any' ? business.employees.find(e => e.id === employeeId) || null : null);
            const usingEmployee = !!finalEmp && canUseEmployeeWhatsapp(finalEmp.whatsapp);
            const targetName = usingEmployee ? finalEmp!.name : business.name;
            const serviceNames = selectedServices.map(s => s.name).join(', ');
            const dateString = date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const msg = usingEmployee
                ? `Hola ${targetName}, quiero confirmar mi turno para ${serviceNames} el ${dateString} a las ${slot}. Soy ${normName}.`
                : `Hola ${targetName}, quiero confirmar mi turno para ${serviceNames} el ${dateString} a las ${slot}. Mi nombre es ${normName}. ¡Gracias!`;
            const whatsappUrl = buildWhatsappUrl(usingEmployee ? (finalEmp!.whatsapp || '') : business.phone, msg);

            // Success Bridge: Guardar datos de WhatsApp y cambiar estado
            const whatsappDataPayload: WhatsappData = {
                url: whatsappUrl,
                message: msg,
                targetName
            };
            setWhatsappData(whatsappDataPayload);
            setModalState('success');

            // Programar redirección automática
            const timeout = setTimeout(() => {
                window.open(whatsappUrl, '_blank');
            }, 1800); // 1.8 segundos

            setRedirectTimeout(timeout);

        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al confirmar la reserva. Por favor, inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    // Funciones auxiliares para el Success Bridge
    const handleManualWhatsApp = useCallback(() => {
        if (whatsappData?.url) {
            window.open(whatsappData.url, '_blank');
        }
    }, [whatsappData]);

    const handleClose = useCallback(() => {
        // Limpiar timeout si existe
        if (redirectTimeout) {
            clearTimeout(redirectTimeout);
            setRedirectTimeout(null);
        }
        onClose();
    }, [redirectTimeout, onClose]);

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (redirectTimeout) {
                clearTimeout(redirectTimeout);
            }
        };
    }, [redirectTimeout]);

    // Componente SuccessContent
    const SuccessContent = () => (
        <div className="text-center py-8 px-6 min-h-[380px] flex flex-col justify-center">
            {/* Check animado */}
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-primary mb-3">¡Reserva Confirmada!</h2>
            <p className="text-secondary text-lg mb-8">
                Te estamos redirigiendo a WhatsApp para finalizar...
            </p>
            
            {/* Botón manual prominente */}
            <button
                onClick={handleManualWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors mb-4 flex items-center justify-center gap-3"
            >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.69"/>
                </svg>
                Abrir WhatsApp
            </button>
            
            <button
                onClick={handleClose}
                className="text-secondary hover:text-primary transition-colors text-sm"
            >
                Cerrar
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 overflow-y-auto z-50" onClick={handleClose}>
            <div className="min-h-full flex items-start md:items-center justify-center p-4">
                <div
                    className={`
                        bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full
                        text-primary max-h-[calc(100vh-2rem)] overflow-y-auto
                        transition-all duration-300 ease-in-out
                        ${modalState === 'success' ? 'min-h-[450px]' : ''}
                    `}
                    role="dialog"
                    aria-modal="true"
                    onClick={e => e.stopPropagation()}
                >
                    {modalState === 'form' && (
                        <form onSubmit={handleConfirm} className="transition-opacity duration-300">
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
                    )}
                    
                    {modalState === 'success' && whatsappData && (
                        <SuccessContent />
                    )}
                </div>
            </div>
        </div>
    );
};
