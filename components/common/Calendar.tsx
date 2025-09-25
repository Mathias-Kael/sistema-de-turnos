import React, { useState } from 'react';

interface CalendarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateChange }) => {
    const [displayDate, setDisplayDate] = useState(new Date(selectedDate));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const endOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

    const startDayOfWeek = startOfMonth.getDay(); // 0=Sun, 1=Mon, ...
    const daysInMonth = endOfMonth.getDate();

    const dates = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        dates.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(displayDate.getFullYear(), displayDate.getMonth(), i));
    }

    const handlePrevMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

    return (
        <div className="p-4 bg-surface rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">Selecciona una fecha</h2>
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-surface-hover text-primary">&lt;</button>
                <h3 className="font-semibold text-lg text-primary">
                    {displayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-surface-hover text-primary">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map(day => <div key={day} className="font-bold text-sm text-secondary">{day}</div>)}
                {dates.map((date, index) => {
                    if (!date) return <div key={index}></div>;
                    const isPast = date < today;
                    const isSelected = isSameDay(date, selectedDate);
                    
                    const buttonClasses = `w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                        isPast ? 'text-secondary cursor-not-allowed' : 'hover:bg-surface-hover'
                    } ${
                        isSelected ? 'bg-primary text-white font-bold' : ''
                    }`;

                    return (
                        <button
                            key={index}
                            disabled={isPast}
                            onClick={() => !isPast && onDateChange(date)}
                            className={buttonClasses}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
