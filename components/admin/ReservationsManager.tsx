import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../../types';
import { BookingCalendar } from './BookingCalendar';
import { BookingDetailModal } from './BookingDetailModal';
import { ManualBookingModal } from './ManualBookingModal';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';



export const ReservationsManager: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [dateForNewBooking, setDateForNewBooking] = useState(new Date());
    const [error, setError] = useState<string | null>(null);

    const bookingsForSelectedDay = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return (business.bookings || [])
            .filter(b => b.date === dateStr)
            .sort((a, b) => a.start.localeCompare(b.start));
    }, [selectedDate, business.bookings]);
    
    const bookingsByDate = useMemo(() => {
        return (business.bookings || []).reduce<Record<string, BookingStatus[]>>((acc, booking) => {
            const dateStr = booking.date;
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(booking.status);
            return acc;
        }, {});
    }, [business.bookings]);

    const handleUpdateBooking = async (updatedBooking: Booking) => {
        try {
            await dispatch({ type: 'UPDATE_BOOKING', payload: updatedBooking });
            setSelectedBooking(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        try {
            await dispatch({ type: 'DELETE_BOOKING', payload: bookingId });
            setSelectedBooking(null);
        } catch (e: any) {
            setError(e.message);
        }
    };
    
    const handleAddBooking = async (newBooking: Omit<Booking, 'id'>) => {
        setError(null);
        try {
            await dispatch({ type: 'CREATE_BOOKING', payload: newBooking });
            
            // Actualizar la vista para mostrar la fecha de la nueva reserva
            const newBookingDate = new Date(newBooking.date + 'T00:00:00');
            setSelectedDate(newBookingDate);
            
            setIsCreating(false);
        } catch (e: any) {
            setError(e.message);
            // No cerramos el modal si hay un error, para que el usuario pueda corregir.
        }
    };

    const openCreateModal = (date: Date) => {
        setDateForNewBooking(date);
        setIsCreating(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary">Gestión de Reservas</h3>
                 <button onClick={() => openCreateModal(new Date())} className="px-4 py-2 bg-primary text-brand-text text-sm font-medium rounded-md hover:bg-primary-dark">
                     + Nueva Reserva
                 </button>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                     <BookingCalendar
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        onAddBooking={openCreateModal}
                        bookingsByDate={bookingsByDate}
                    />
                </div>
                <div className="md:col-span-2">
                    <h4 className="font-semibold mb-4 text-primary">
                        Reservas para el {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </h4>
                    {bookingsForSelectedDay.length > 0 ? (
                        <ul className="space-y-3">
                            {bookingsForSelectedDay.map(booking => {
                                const employee = business.employees.find(e => e.id === booking.employeeId);
                                return (
                                <li
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                                                        className={`p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface-hover border-l-4 ${
                                                                            booking.status === 'pending' ? 'border-yellow-400' :
                                                                            booking.status === 'confirmed' ? 'border-green-500' :
                                                                            booking.status === 'cancelled' ? 'border-red-500' :
                                                                            'border-transparent'
                                                                        } shadow-md`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border bg-white ${
                                                                                    booking.status === 'pending' ? 'border-yellow-400 text-yellow-700' :
                                                                                    booking.status === 'confirmed' ? 'border-green-500 text-green-700' :
                                                                                    booking.status === 'cancelled' ? 'border-red-500 text-red-700' :
                                                                                    'border-transparent'
                                                                                }`}
                                              aria-label={`Estado: ${booking.status}`}
                                        >
                                            {booking.status === 'pending' && 'Pendiente'}
                                            {booking.status === 'confirmed' && 'Confirmada'}
                                            {booking.status === 'cancelled' && 'Cancelada'}
                                            {booking.status === 'completed' && 'Completada'}
                                        </span>
                                        <p className="font-bold text-primary m-0">{booking.start} - {booking.client.name}</p>
                                    </div>
                                    <p className="text-sm text-secondary">{booking.services.map(s => s.name).join(', ')}</p>
                                    {employee && <p className="text-xs text-secondary mt-1">Con: {employee.name}</p>}
                                </li>
                            );
                            })}
                        </ul>
                    ) : (
                        <p className="text-secondary">No hay reservas para este día.</p>
                    )}
                </div>
            </div>
            
            {error && <p className="text-sm text-red-500">{error}</p>}

            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    employee={business.employees.find(e => e.id === selectedBooking.employeeId)}
                    onClose={() => setSelectedBooking(null)}
                    onUpdate={handleUpdateBooking}
                    onDelete={handleDeleteBooking}
                />
            )}

            {isCreating && (
                <ManualBookingModal
                    selectedDate={dateForNewBooking}
                    existingBookings={business.bookings || []}
                    onClose={() => setIsCreating(false)}
                    onSave={handleAddBooking}
                />
            )}
        </div>
    );
};