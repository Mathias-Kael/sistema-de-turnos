import React from 'react';

interface BookingCalendarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    onAddBooking: (date: Date) => void;
    bookingsByDate: Record<string, number>;
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
        <div className="p-4 bg-white rounded-lg border">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() - 1)))} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                <h3 className="font-semibold text-lg">{displayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() + 1)))} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(day => <div key={day} className="font-bold text-sm text-gray-500">{day}</div>)}
                {dates.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`}></div>;
                    const dateStr = date.toISOString().split('T')[0];
                    const hasBookings = bookingsByDate[dateStr] > 0;
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                        <div key={dateStr} className="relative group">
                            <button onClick={() => onDateChange(date)} className={`w-10 h-10 flex items-center justify-center rounded-full ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
                                {date.getDate()}
                                {hasBookings && <span className="absolute bottom-1 right-1 h-2 w-2 bg-green-500 rounded-full"></span>}
                            </button>
                             <button onClick={() => onAddBooking(date)} className="absolute top-0 right-0 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">+</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};