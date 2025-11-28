import React from 'react';
import { BookingStatus } from '../../types';
import { SecondaryText } from '../ui';

interface BookingCalendarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    onAddBooking: (date: Date) => void;
    bookingsByDate: Record<string, string[]>;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ selectedDate, onDateChange, onAddBooking, bookingsByDate }) => {
    const [displayDate, setDisplayDate] = React.useState(new Date(selectedDate));

    const startOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const endOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
    const startDayOfWeek = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const dates = Array.from({ length: startDayOfWeek }, () => null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(displayDate.getFullYear(), displayDate.getMonth(), i + 1)));

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    
        return (
            <div className="p-4 bg-surface rounded-lg border border-default">
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() - 1)))} className="p-2 rounded-full hover:bg-surface-hover text-primary">{'<'}</button>
                    <h3 className="font-semibold text-lg text-primary">{displayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() + 1)))} className="p-2 rounded-full hover:bg-surface-hover text-primary">{'>'}</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(day => <SecondaryText key={day} className="font-bold">{day}</SecondaryText>)}
                    {dates.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`}></div>;
                        const dateStr = date.toISOString().split('T')[0];
                        const dayBookings = bookingsByDate[dateStr] || [];
                        const isSelected = isSameDay(date, selectedDate);
                        
                        // Verificar si la fecha es pasada
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const currentDate = new Date(date);
                        currentDate.setHours(0, 0, 0, 0);
                        const isPastDate = currentDate < today;
    
                        let priorityStatus: BookingStatus | null = null;
                        if (dayBookings.some(status => status === 'pending')) {
                            priorityStatus = 'pending';
                        } else if (dayBookings.some(status => status === 'confirmed')) {
                            priorityStatus = 'confirmed';
                        } else if (dayBookings.length > 0) {
                            priorityStatus = 'cancelled';
                        }
    
                        let borderColorClass = 'border-transparent';
                        if (priorityStatus === 'pending') borderColorClass = 'border-yellow-400';
                        else if (priorityStatus === 'confirmed') borderColorClass = 'border-green-500';
                        else if (priorityStatus === 'cancelled') borderColorClass = 'border-red-500';
    
                        return (
                            <div key={dateStr} className="relative">
                                <button
                                    onClick={() => onDateChange(date)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-full border-2 ${borderColorClass} ${isSelected ? 'bg-primary text-brand-text' : 'hover:bg-surface-hover'} ${isPastDate ? 'opacity-50 cursor-default' : ''}`}
                                >
                                    {date.getDate()}
                                </button>
                                {!isPastDate && (
                                    <button onClick={() => onAddBooking(date)} className="absolute top-0 right-0 text-primary">+</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };