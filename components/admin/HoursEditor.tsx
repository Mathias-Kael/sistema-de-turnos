// FIX: Implemented HoursEditor.tsx. This file was previously a placeholder.
// FIX: Renamed 'key' destructured variable to 'dayKey' to avoid potential shadowing issues.
import React from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Hours } from '../../types';

const daysOfWeek: { key: keyof Hours; label: string }[] = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

export const HoursEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const handleDayToggle = (day: keyof Hours, enabled: boolean) => {
        const updatedHours = {
            ...business.hours,
            [day]: {
                ...business.hours[day],
                enabled,
            },
        };
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };

    const addInterval = (day: keyof Hours) => {
        const updatedHours = {
            ...business.hours,
            [day]: {
                ...business.hours[day],
                intervals: [...business.hours[day].intervals, { open: '14:00', close: '17:00' }],
            },
        };
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };

    const removeInterval = (day: keyof Hours, index: number) => {
        const updatedHours = {
            ...business.hours,
            [day]: {
                ...business.hours[day],
                intervals: business.hours[day].intervals.filter((_, i) => i !== index),
            },
        };
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };
    
    const handleIntervalChange = (day: keyof Hours, index: number, field: 'open' | 'close', value: string) => {
        const updatedHours = {
            ...business.hours,
            [day]: {
                ...business.hours[day],
                intervals: business.hours[day].intervals.map((interval, i) =>
                    i === index ? { ...interval, [field]: value } : interval
                ),
            },
        };
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Horario Semanal</h3>
            {daysOfWeek.map(({ key: dayKey, label }) => (
                <div key={dayKey} className="p-4 border border-default rounded-md bg-surface">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-primary">{label}</span>
                        <label className="flex items-center space-x-2 cursor-pointer text-secondary">
                            <input
                                type="checkbox"
                                checked={business.hours[dayKey].enabled}
                                onChange={(e) => handleDayToggle(dayKey, e.target.checked)}
                                className="h-5 w-5 rounded border-default accent-primary focus:ring-primary"
                            />
                            <span>{business.hours[dayKey].enabled ? 'Abierto' : 'Cerrado'}</span>
                        </label>
                    </div>

                    {business.hours[dayKey].enabled && (
                        <div className="space-y-3">
                            {business.hours[dayKey].intervals.map((interval, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={interval.open}
                                        onChange={(e) => handleIntervalChange(dayKey, index, 'open', e.target.value)}
                                        className="w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary"
                                    />
                                    <span className="text-secondary">-</span>
                                    <input
                                        type="time"
                                        value={interval.close}
                                        onChange={(e) => handleIntervalChange(dayKey, index, 'close', e.target.value)}
                                        className="w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary"
                                    />
                                    <button
                                        onClick={() => removeInterval(dayKey, index)}
                                        className="p-2 bg-[color:var(--color-state-danger-bg)] text-[color:var(--color-state-danger-text)] rounded-full hover:opacity-90 transition-colors"
                                        aria-label="Eliminar intervalo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addInterval(dayKey)}
                                className="w-full mt-2 px-4 py-2 border-2 border-dashed border-default text-secondary rounded-md hover:bg-surface-hover hover:border-primary transition-all"
                            >
                                + Añadir Turno
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};