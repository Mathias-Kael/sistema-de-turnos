import React, { useState, useMemo } from 'react';
import { MOCK_BOOKINGS } from '../../services/mockData';
import { Booking } from '../../types';
import { BookingCalendar } from './BookingCalendar';
import { BookingDetailModal } from './BookingDetailModal';
import { ManualBookingModal } from './ManualBookingModal';
import { useBusinessState } from '../../context/BusinessContext';

export const ReservationsManager: React.FC = () => {
    const business = useBusinessState();
    // In a real app, this would come from an API
    const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [dateForNewBooking, setDateForNewBooking] = useState(new Date());

    const bookingsForSelectedDay = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return bookings
            .filter(b => b.date === dateStr)
            .sort((a, b) => a.start.localeCompare(b.start));
    }, [selectedDate, bookings]);
    
    const bookingsByDate = useMemo(() => {
        return bookings.reduce<Record<string, number>>((acc, booking) => {
            acc[booking.date] = (acc[booking.date] || 0) + 1;
            return acc;
        }, {});
    }, [bookings]);

    const handleUpdateBooking = (updatedBooking: Booking) => {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        setSelectedBooking(null);
    };
    
    const handleAddBooking = (newBooking: Omit<Booking, 'id'>) => {
        const bookingToAdd: Booking = { ...newBooking, id: `res_${Date.now()}` };
        setBookings(prev => [...prev, bookingToAdd]);
        
        // Actualizar la vista para mostrar la fecha de la nueva reserva
        const newBookingDate = new Date(bookingToAdd.date + 'T00:00:00');
        setSelectedDate(newBookingDate);
        
        setIsCreating(false);
    };

    const openCreateModal = (date: Date) => {
        setDateForNewBooking(date);
        setIsCreating(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gestión de Reservas</h3>
                 <button onClick={() => openCreateModal(new Date())} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
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
                    <h4 className="font-semibold mb-4">
                        Reservas para el {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </h4>
                    {bookingsForSelectedDay.length > 0 ? (
                        <ul className="space-y-3">
                            {bookingsForSelectedDay.map(booking => {
                                const employee = business.employees.find(e => e.id === booking.employeeId);
                                return (
                                <li key={booking.id} onClick={() => setSelectedBooking(booking)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                    <p className="font-bold">{booking.start} - {booking.client.name}</p>
                                    <p className="text-sm text-gray-600">{booking.services.map(s => s.name).join(', ')}</p>
                                    {employee && <p className="text-xs text-gray-500 mt-1">Con: {employee.name}</p>}
                                </li>
                            );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No hay reservas para este día.</p>
                    )}
                </div>
            </div>
            
            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    employee={business.employees.find(e => e.id === selectedBooking.employeeId)}
                    onClose={() => setSelectedBooking(null)}
                    onUpdate={handleUpdateBooking}
                />
            )}

            {isCreating && (
                <ManualBookingModal
                    selectedDate={dateForNewBooking}
                    existingBookings={bookings}
                    onClose={() => setIsCreating(false)}
                    onSave={handleAddBooking}
                />
            )}
        </div>
    );
};