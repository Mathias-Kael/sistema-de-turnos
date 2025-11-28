import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../../types';
import { BookingCalendar } from './BookingCalendar';
import { BookingDetailModal } from './BookingDetailModal';
import { ManualBookingModal } from './ManualBookingModal';
import SpecialBookingModal from './SpecialBookingModal';
import CreateBreakModal from './CreateBreakModal';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';

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



export const ReservationsManager: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingSpecial, setIsCreatingSpecial] = useState(false);
    const [isCreatingBreak, setIsCreatingBreak] = useState(false);
    const [dateForNewBooking, setDateForNewBooking] = useState(new Date());
    const [error, setError] = useState<string | null>(null);

    const bookingsForSelectedDay = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return (business.bookings || [])
            .filter(b => b.date === dateStr)
            .sort((a, b) => a.start.localeCompare(b.start));
    }, [selectedDate, business.bookings]);

    // Agrupar breaks que coincidan en horario
    const groupedBookings = useMemo((): GroupedBooking[] => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const bookings = (business.bookings || []).filter(b => b.date === dateStr);
        
        // Separar breaks de reservas normales
        const breaks = bookings.filter(b => b.client.name === 'BREAK');
        const normalBookings = bookings.filter(b => b.client.name !== 'BREAK');
        
        // Agrupar breaks por horario
        const breaksGrouped = new Map<string, Booking[]>();
        breaks.forEach(b => {
            const key = b.start + '_' + b.end;
            if (!breaksGrouped.has(key)) {
                breaksGrouped.set(key, []);
            }
            breaksGrouped.get(key)!.push(b);
        });
        
        const result: GroupedBooking[] = [];
        
        // Convertir breaks agrupados
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
        
        // Agregar reservas normales
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
        
        // Ordenar por hora de inicio
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
        // Mantener compatibilidad para casos donde el modal recurra a onUpdate completo
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
        // Validar que la fecha no sea pasada
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(date);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        
        if (selectedDateNormalized < today) {
            setError('⚠️ No se pueden crear reservas en fechas pasadas');
            return;
        }
        
        setDateForNewBooking(date);
        setIsCreating(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium text-primary">Gestión de Reservas</h3>
                <div className="flex flex-col md:flex-row gap-2">
                    <button 
                        onClick={() => openCreateModal(new Date())} 
                        className="px-4 py-2 bg-primary text-brand-text text-sm font-medium rounded-md hover:bg-primary-dark"
                    >
                        + Reserva Normal
                    </button>
                    <button 
                        onClick={() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDateNormalized = new Date(selectedDate);
                            selectedDateNormalized.setHours(0, 0, 0, 0);
                            
                            if (selectedDateNormalized < today) {
                                setError('⚠️ No se pueden crear reservas en fechas pasadas');
                                return;
                            }
                            
                            setDateForNewBooking(selectedDate);
                            setIsCreatingSpecial(true);
                        }} 
                        className="px-4 py-2 bg-surface text-primary text-sm font-medium rounded-md border border-default hover:bg-surface-hover"
                    >
                        ⚡ Reserva Especial
                    </button>
                    <button 
                        onClick={() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDateNormalized = new Date(selectedDate);
                            selectedDateNormalized.setHours(0, 0, 0, 0);
                            
                            if (selectedDateNormalized < today) {
                                setError('⚠️ No se pueden crear breaks en fechas pasadas');
                                return;
                            }
                            
                            setDateForNewBooking(selectedDate);
                            setIsCreatingBreak(true);
                        }} 
                        className="px-4 py-2 bg-surface text-primary text-sm font-medium rounded-md border border-default hover:bg-surface-hover"
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
                        onAddBooking={openCreateModal}
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
                                const isBreak = grouped.type !== 'booking';
                                
                                return (
                                <li
                                    key={grouped.id}
                                    onClick={() => {
                                        // Solo abrir modal para reservas normales o breaks individuales
                                        if (grouped.type === 'booking') {
                                            setSelectedBooking(firstBooking);
                                        } else if (grouped.type === 'break-individual' && grouped.bookings.length === 1) {
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
                                    {/* Línea 1: Estado + Horario */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={'inline-block px-2 py-0.5 rounded text-xs font-semibold border bg-white ' + (
                                            grouped.status === 'pending' ? 'border-yellow-400 text-yellow-700' :
                                            grouped.status === 'confirmed' ? 'border-green-500 text-green-700' :
                                            grouped.status === 'cancelled' ? 'border-red-500 text-red-700' :
                                            'border-transparent'
                                        )}
                                            aria-label={'Estado: ' + grouped.status}
                                        >
                                            {grouped.status === 'pending' && 'Pendiente'}
                                            {grouped.status === 'confirmed' && 'Confirmada'}
                                            {grouped.status === 'cancelled' && 'Cancelada'}
                                        </span>
                                        <p className="font-bold text-primary m-0">
                                            {formatTimeRange(grouped.start, grouped.end)}
                                        </p>
                                    </div>

                                    {/* Renderizado según tipo */}
                                    {grouped.type === 'break-conjunto' ? (
                                        // Break para todos los empleados
                                        <>
                                            <p className="text-base font-semibold text-primary">🏢 {business.name}</p>
                                            <p className="text-base text-secondary">☕ Break / Bloqueo</p>
                                            {firstBooking.notes && (
                                                <p className="text-sm text-secondary mt-1 italic">
                                                    📝 "{firstBooking.notes}"
                                                </p>
                                            )}
                                        </>
                                    ) : grouped.type === 'break-individual' ? (
                                        // Break individual o para algunos empleados
                                        <>
                                            <p className="text-base font-semibold text-primary">
                                                {grouped.bookings.map(b => {
                                                    const emp = business.employees.find(e => e.id === b.employeeId);
                                                    return emp ? emp.name : 'Empleado';
                                                }).join(', ')}
                                            </p>
                                            <p className="text-base text-secondary">☕ Break / Bloqueo</p>
                                            {firstBooking.notes && (
                                                <p className="text-sm text-secondary mt-1 italic">
                                                    📝 "{firstBooking.notes}"
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        // Reserva normal o especial
                                        <>
                                            <p className="text-base font-semibold text-primary">
                                                👤 {firstBooking.client.name}
                                            </p>
                                            <p className="text-sm text-secondary">
                                                📞 {firstBooking.client.phone}
                                            </p>
                                            {firstBooking.client.email && (
                                                <p className="text-sm text-secondary">
                                                    📧 {firstBooking.client.email}
                                                </p>
                                            )}
                                            <p className="text-base text-secondary mt-1">
                                                {firstBooking.services.length > 0 
                                                    ? firstBooking.services.map(s => s.name).join(', ')
                                                    : '(Sin servicios)'
                                                }
                                            </p>
                                            {(() => {
                                                const employee = business.employees.find(e => e.id === firstBooking.employeeId);
                                                return employee && (
                                                    <p className="text-sm text-secondary mt-1">
                                                        Con: {employee.name}
                                                    </p>
                                                );
                                            })()}
                                            {firstBooking.notes && (
                                                <p className="text-sm text-secondary mt-1 italic">
                                                    📝 "{firstBooking.notes}"
                                                </p>
                                            )}
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

            {isCreatingSpecial && (
                <SpecialBookingModal
                    selectedDate={dateForNewBooking}
                    isOpen={isCreatingSpecial}
                    onClose={() => {
                        setIsCreatingSpecial(false);
                        // Refrescar la vista actual
                        setSelectedDate(new Date(selectedDate));
                    }}
                />
            )}

            {isCreatingBreak && (
                <CreateBreakModal
                    selectedDate={dateForNewBooking}
                    isOpen={isCreatingBreak}
                    onClose={() => {
                        setIsCreatingBreak(false);
                        // Refrescar la vista actual
                        setSelectedDate(new Date(selectedDate));
                    }}
                />
            )}
        </div>
    );
};