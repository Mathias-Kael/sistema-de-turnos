import React, { useState, useEffect } from 'react';
import { Booking, Employee } from '../../types';

interface BookingDetailModalProps {
    booking: Booking;
    employee?: Employee;
    onClose: () => void;
    onUpdate: (updatedBooking: Booking) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, employee, onClose, onUpdate }) => {
    const [editedBooking, setEditedBooking] = useState<Booking>(booking);

    useEffect(() => {
        setEditedBooking(booking);
    }, [booking]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedBooking(prev => ({ ...prev, [name]: value as any }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(editedBooking);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalle de la Reserva</h2>

                <div className="mb-6 space-y-2 text-gray-700">
                    <p><strong>Cliente:</strong> {booking.client.name}</p>
                    <p><strong>Email:</strong> {booking.client.email || 'No especificado'}</p>
                    <p><strong>Teléfono:</strong> {booking.client.phone}</p>
                    <hr className="my-2"/>
                    <p><strong>Fecha:</strong> {new Date(booking.date + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                    <p><strong>Hora:</strong> {booking.start} - {booking.end}</p>
                    {employee && <p><strong>Empleado:</strong> {employee.name}</p>}
                    <p><strong>Servicios:</strong> {booking.services.map(s => s.name).join(', ')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            id="status"
                            name="status"
                            value={editedBooking.status}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas Internas</label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={editedBooking.notes || ''}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                            Cerrar
                        </button>
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-opacity">
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};