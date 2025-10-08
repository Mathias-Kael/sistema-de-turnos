import React, { useState, useEffect } from 'react';
import { Booking, Employee } from '../../types';
import { useBusinessDispatch } from '../../context/BusinessContext';

interface BookingDetailModalProps {
    booking: Booking;
    employee?: Employee;
    onClose: () => void;
    onUpdate: (updatedBooking: Booking) => void;
    onDelete: (bookingId: string) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, employee, onClose, onUpdate, onDelete }) => {
    const [editedBooking, setEditedBooking] = useState<Booking>(booking);
    const dispatch = useBusinessDispatch();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEditedBooking(booking);
    }, [booking]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedBooking(prev => ({ ...prev, [name]: value as any }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Si sólo cambió status o notes, usar acción especializada
            const onlyStatusOrNotesChanged =
                booking.employeeId === editedBooking.employeeId &&
                booking.start === editedBooking.start &&
                booking.end === editedBooking.end &&
                booking.date === editedBooking.date &&
                JSON.stringify(booking.services) === JSON.stringify(editedBooking.services) &&
                booking.client.name === editedBooking.client.name &&
                booking.client.email === editedBooking.client.email &&
                booking.client.phone === editedBooking.client.phone &&
                (booking.status !== editedBooking.status || booking.notes !== editedBooking.notes);

            if (onlyStatusOrNotesChanged) {
                await dispatch({
                    type: 'UPDATE_BOOKING_STATUS',
                    payload: { bookingId: booking.id, status: editedBooking.status, notes: editedBooking.notes },
                });
            } else {
                onUpdate(editedBooking);
            }
            onClose();
        } catch (err) {
            // fallback a método completo si falla
            try { onUpdate(editedBooking); onClose(); } catch {}
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 overflow-y-auto z-50" onClick={onClose}>
            <div className="min-h-full flex items-start md:items-center justify-center p-4">
            <div className="bg-surface rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full text-primary max-h-[calc(100vh-2rem)] overflow-y-auto focus:outline-none" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-primary mb-4">Detalle de la Reserva</h2>

                <div className="mb-6 space-y-2 text-primary">
                    <p><strong>Cliente:</strong> {booking.client.name}</p>
                    <p><strong>Email:</strong> {booking.client.email || 'No especificado'}</p>
                    <p><strong>Teléfono:</strong> {booking.client.phone}</p>
                    <hr className="my-2 border-default"/>
                    <p><strong>Fecha:</strong> {new Date(booking.date + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                    <p><strong>Hora:</strong> {booking.start} - {booking.end}</p>
                    {employee && <p><strong>Empleado:</strong> {employee.name}</p>}
                    <p><strong>Servicios:</strong> {booking.services.map(s => s.name).join(', ')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-secondary">Estado</label>
                        <select
                            id="status"
                            name="status"
                            value={editedBooking.status}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border border-default rounded-md bg-surface text-primary"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-secondary">Notas Internas</label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={editedBooking.notes || ''}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border border-default rounded-md bg-surface text-primary"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-background text-primary font-bold py-3 px-4 rounded-lg hover:bg-surface-hover transition-colors">
                            Cerrar
                        </button>
                        <button type="submit" disabled={saving} className="w-full bg-primary text-brand-text font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-opacity disabled:opacity-50">
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                    {editedBooking.status === 'cancelled' && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('¿Estás seguro de que quieres eliminar esta reserva permanentemente? Esta acción no se puede deshacer.')) {
                                        onDelete(booking.id);
                                    }
                                }}
                                className="w-full bg-state-danger-bg text-state-danger-text font-bold py-3 px-4 rounded-lg hover:bg-state-danger-strong transition-colors"
                            >
                                Eliminar Reserva Permanentemente
                            </button>
                        </div>
                    )}
                </form>
            </div>
            </div>
        </div>
    );
};