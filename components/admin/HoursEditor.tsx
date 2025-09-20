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
        // FIX: Explicitly type the result of JSON.parse to ensure type safety.
        const updatedHours: Hours = JSON.parse(JSON.stringify(business.hours)); // Deep copy
        updatedHours[day].intervals.push({ open: '14:00', close: '17:00' });
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };

    const removeInterval = (day: keyof Hours, index: number) => {
        // FIX: Explicitly type the result of JSON.parse to ensure type safety.
        const updatedHours: Hours = JSON.parse(JSON.stringify(business.hours)); // Deep copy
        updatedHours[day].intervals.splice(index, 1);
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };
    
    const handleIntervalChange = (day: keyof Hours, index: number, field: 'open' | 'close', value: string) => {
        // FIX: Explicitly type the result of JSON.parse to ensure type safety.
        const updatedHours: Hours = JSON.parse(JSON.stringify(business.hours)); // Deep copy
        updatedHours[day].intervals[index][field] = value;
        dispatch({ type: 'SET_HOURS', payload: updatedHours });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Horario Semanal</h3>
            {daysOfWeek.map(({ key: dayKey, label }) => (
                <div key={dayKey} className="p-4 border rounded-md bg-gray-50/70">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-gray-800">{label}</span>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={business.hours[dayKey].enabled}
                                onChange={(e) => handleDayToggle(dayKey, e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    />
                                    <span className="text-gray-500">-</span>
                                    <input
                                        type="time"
                                        value={interval.close}
                                        onChange={(e) => handleIntervalChange(dayKey, index, 'close', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    />
                                    <button
                                        onClick={() => removeInterval(dayKey, index)}
                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                        aria-label="Eliminar intervalo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addInterval(dayKey)}
                                className="w-full mt-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-md hover:bg-gray-100 hover:border-gray-400 transition-all"
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