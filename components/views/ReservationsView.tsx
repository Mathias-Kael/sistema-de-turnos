import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../../types';
import { BookingCalendar } from '../admin/BookingCalendar';
import { BookingDetailModal } from '../admin/BookingDetailModal';
import { ManualBookingModal } from '../admin/ManualBookingModal';
import SpecialBookingModal from '../admin/SpecialBookingModal';
import CreateBreakModal from '../admin/CreateBreakModal';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { SecondaryText, StatusBadge } from '../ui';

// Tipo para bookings agrupados (breaks conjuntos)
interface GroupedBooking {
    id: string; // ID compuesto para identificación
    type: 'booking' | 'break-conjunto' | 'break-individual';
    bookings: Booking[]; // Uno o más bookings agrupados
    date: string;
    start: string;
    end: string;
    status: BookingStatus;
}

// Helper: formatear rango de tiempo HH:MM-HH:MM
const formatTimeRange = (start: string, end: string): string => {
    const formatTime = (time: string) => time.slice(0, 5);
    return formatTime(start) + '-' + formatTime(end);
};

export const ReservationsView: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingSpecial, setIsCreatingSpecial] = useState(false);
    const [isCreatingBreak, setIsCreatingBreak] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const groupedBookings = useMemo((): GroupedBooking[] => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const bookings = (business.bookings || []).filter(b => b.date === dateStr);
        
        const breaks = bookings.filter(b => b.client.name === 'BREAK');
        const normalBookings = bookings.filter(b => b.client.name !== 'BREAK');
        
        const breaksGrouped = new Map<string, Booking[]>();
        breaks.forEach(b => {
            const key = b.start + '_' + b.end;
            if (!breaksGrouped.has(key)) {
                breaksGrouped.set(key, []);
            }
            breaksGrouped.get(key)!.push(b);
        });
        
        const result: GroupedBooking[] = [];
        
        breaksGrouped.forEach(group => {
            const first = group[0];
            const isAllEmployees = group.length === business.employees.length && business.employees.length > 0;
            
            result.push({
                id: 'break_' + first.start + '_' + first.end,
                type: isAllEmployees ? 'break-conjunto' : 'break-individual',
                bookings: group,
                date: first.date,
                start: first.start,
                end: first.end,
                status: first.status,
            });
        });
        
        normalBookings.forEach(b => {
            result.push({
                id: b.id,
                type: 'booking',
                bookings: [b],
                date: b.date,
                start: b.start,
                end: b.end,
                status: b.status,
            });
        });
        
        return result.sort((a, b) => a.start.localeCompare(b.start));
    }, [selectedDate, business.bookings, business.employees.length]);
    
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
            const newBookingDate = new Date(newBooking.date + 'T00:00:00');
            setSelectedDate(newBookingDate);
            setIsCreating(false);
            setIsCreatingSpecial(false);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const openCreateModal = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(date);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        
        if (selectedDateNormalized < today) {
            setError('⚠️ No se pueden crear reservas en fechas pasadas');
            return;
        }
        
        setIsCreating(true);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-2xl font-bold text-primary">Gestión de Reservas</h2>
                <div className="flex flex-col md:flex-row gap-2">
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="px-4 py-2 bg-primary text-brand-text text-base font-medium rounded-md hover:bg-primary-dark"
                    >
                        + Reserva Normal
                    </button>
                    <button 
                        onClick={() => setIsCreatingSpecial(true)} 
                        className="px-4 py-2 bg-surface text-primary text-base font-medium rounded-md border border-default hover:bg-surface-hover"
                    >
                        ⚡ Reserva Especial
                    </button>
                    <button 
                        onClick={() => setIsCreatingBreak(true)} 
                        className="px-4 py-2 bg-surface text-primary text-base font-medium rounded-md border border-default hover:bg-surface-hover"
                    >
                        ☕ Agregar Break
                    </button>
                </div>
            </div>
            {error && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                    <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
            )}
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                <div className="md:col-span-1">
                     <BookingCalendar
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        onAddBooking={() => openCreateModal(selectedDate)}
                        bookingsByDate={bookingsByDate}
                    />
                </div>
                <div className="md:col-span-2">
                    <h4 className="font-semibold mb-4 text-primary">
                        Reservas para el {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </h4>
                    {groupedBookings.length > 0 ? (
                        <ul className="space-y-3">
                            {groupedBookings.map(grouped => {
                                const firstBooking = grouped.bookings[0];
                                return (
                                <li
                                    key={grouped.id}
                                    onClick={() => {
                                        if (grouped.type === 'booking' || (grouped.type === 'break-individual' && grouped.bookings.length === 1)) {
                                            setSelectedBooking(firstBooking);
                                        }
                                    }}
                                    className={'p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface-hover border-l-4 shadow-md ' + (
                                        grouped.status === 'pending' ? 'border-yellow-400' :
                                        grouped.status === 'confirmed' ? 'border-green-500' :
                                        grouped.status === 'cancelled' ? 'border-red-500' :
                                        'border-transparent'
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <StatusBadge status={grouped.status as any} size="xs">
                                            {grouped.status.charAt(0).toUpperCase() + grouped.status.slice(1)}
                                        </StatusBadge>
                                        <p className="font-bold text-primary m-0">
                                            {formatTimeRange(grouped.start, grouped.end)}
                                        </p>
                                    </div>
                                    {grouped.type === 'booking' ? (
                                        <>
                                            <p className="text-base font-semibold text-primary">👤 {firstBooking.client.name}</p>
                                            <SecondaryText>📞 {firstBooking.client.phone}</SecondaryText>
                                            {firstBooking.client.email && <SecondaryText>📧 {firstBooking.client.email}</SecondaryText>}
                                            <p className="text-base text-secondary mt-1">{firstBooking.services.map(s => s.name).join(', ')}</p>
                                            {business.employees.find(e => e.id === firstBooking.employeeId) && <SecondaryText className="mt-1">Con: {business.employees.find(e => e.id === firstBooking.employeeId)?.name}</SecondaryText>}
                                            {firstBooking.notes && <SecondaryText className="mt-1 italic">📝 "{firstBooking.notes}"</SecondaryText>}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold text-primary">🏢 {grouped.type === 'break-conjunto' ? business.name : grouped.bookings.map(b => business.employees.find(e => e.id === b.employeeId)?.name).join(', ')}</p>
                                            <SecondaryText>☕ Break / Bloqueo</SecondaryText>
                                            {firstBooking.notes && <SecondaryText className="mt-1">📝 "{firstBooking.notes}"</SecondaryText>}
                                        </>
                                    )}
                                </li>
                            );
                            })}
                        </ul>
                    ) : (
                        <p className="text-secondary">No hay reservas para este día.</p>
                    )}
                </div>
            </div>
            
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
                    defaultDate={selectedDate}
                    onClose={() => setIsCreating(false)}
                    onSave={handleAddBooking}
                />
            )}

            {isCreatingSpecial && (
                <SpecialBookingModal
                    isOpen={isCreatingSpecial}
                    defaultDate={selectedDate}
                    onClose={() => setIsCreatingSpecial(false)}
                />
            )}

            {isCreatingBreak && (
                <CreateBreakModal
                    selectedDate={selectedDate}
                    isOpen={isCreatingBreak}
                    onClose={() => setIsCreatingBreak(false)}
                />
            )}
        </div>
    );
};