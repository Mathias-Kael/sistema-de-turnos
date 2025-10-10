import React, { useState, useEffect } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Hours, DayHours, Interval } from '../../types';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { validarIntervalos } from '../../utils/availability';

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

    const [draftHours, setDraftHours] = useState<Hours>(business.hours);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDraftHours(business.hours);
    }, [business.hours]);

    const handleHoursChange = (day: keyof Hours, newDayHours: DayHours) => {
        const updatedHours = { ...draftHours, [day]: newDayHours };
        setDraftHours(updatedHours);
        validateHours(updatedHours);
    };

    const handleDayToggle = (day: keyof Hours, enabled: boolean) => {
        handleHoursChange(day, { ...draftHours[day], enabled });
    };

    const addInterval = (day: keyof Hours) => {
        const newIntervals = [...draftHours[day].intervals, { open: '09:00', close: '17:00' }];
        handleHoursChange(day, { ...draftHours[day], intervals: newIntervals });
    };

    const removeInterval = (day: keyof Hours, index: number) => {
        const newIntervals = draftHours[day].intervals.filter((_, i) => i !== index);
        handleHoursChange(day, { ...draftHours[day], intervals: newIntervals });
    };

    const handleIntervalChange = (day: keyof Hours, index: number, field: 'open' | 'close', value: string) => {
        const newIntervals = draftHours[day].intervals.map((interval, i) =>
            i === index ? { ...interval, [field]: value } : interval
        );
        handleHoursChange(day, { ...draftHours[day], intervals: newIntervals });
    };

    const validateHours = (hours: Hours): boolean => {
        for (const dayKey of Object.keys(hours) as (keyof Hours)[]) {
            const dayHours = hours[dayKey];
            const dayLabel = daysOfWeek.find(d => d.key === dayKey)?.label || dayKey;

            if (dayHours.enabled) {
                for (const interval of dayHours.intervals) {
                    if (!interval.open || !interval.close || interval.open >= interval.close) {
                        setError(`Intervalo inválido para el ${dayLabel}. La hora de inicio debe ser menor que la de fin.`);
                        return false;
                    }
                }
                if (!validarIntervalos(dayHours.intervals)) {
                    setError(`Los intervalos para el ${dayLabel} se solapan.`);
                    return false;
                }
            }
        }
        setError(null);
        return true;
    };

    const handleSave = async () => {
        if (!validateHours(draftHours)) return;
        try {
            // Creamos el payload completo para la actualización
            const updatedBusiness = { ...business, hours: draftHours };
            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            // Aquí podrías mostrar una notificación de éxito
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleCancel = () => {
        setDraftHours(business.hours);
        setError(null);
    };

    const hasChanges = JSON.stringify(draftHours) !== JSON.stringify(business.hours);

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
                                checked={draftHours[dayKey].enabled}
                                onChange={(e) => handleDayToggle(dayKey, e.target.checked)}
                                className="h-5 w-5 rounded border-default accent-primary focus:ring-primary"
                            />
                            <span>{draftHours[dayKey].enabled ? 'Abierto' : 'Cerrado'}</span>
                        </label>
                    </div>

                                        {draftHours[dayKey].enabled && (
                                                <div className="space-y-3">
                                                        {/* Encabezados de columnas */}
                                                        <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_auto] items-center text-xs text-secondary px-1">
                                                            <span>Desde</span>
                                                            <span></span>
                                                            <span>Hasta</span>
                                                            <span></span>
                                                        </div>
                                                        {draftHours[dayKey].intervals.map((interval, index) => {
                                                            const invalid = !interval.open || !interval.close || interval.open >= interval.close;
                                                            const baseInput = "w-full px-3 py-2 border rounded-md shadow-sm bg-surface text-primary focus:outline-none focus:ring-1";
                                                            const validBorder = "border-default focus:ring-primary";
                                                            const invalidBorder = "border-red-400 focus:ring-red-400";
                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
                                                                >
                                                                    <input
                                                                        type="time"
                                                                        value={interval.open}
                                                                        onChange={(e) => handleIntervalChange(dayKey, index, 'open', e.target.value)}
                                                                        aria-label="Hora de apertura"
                                                                        placeholder="Desde"
                                                                        className={`${baseInput} ${invalid ? invalidBorder : validBorder}`}
                                                                    />
                                                                    <span className="text-secondary px-1">-</span>
                                                                    <input
                                                                        type="time"
                                                                        value={interval.close}
                                                                        onChange={(e) => handleIntervalChange(dayKey, index, 'close', e.target.value)}
                                                                        aria-label="Hora de cierre"
                                                                        placeholder="Hasta"
                                                                        className={`${baseInput} ${invalid ? invalidBorder : validBorder}`}
                                                                    />
                                                                    <button
                                                                        onClick={() => removeInterval(dayKey, index)}
                                                                        className="justify-self-end p-2 bg-state-danger-bg text-state-danger-text rounded-full hover:opacity-90 transition-colors"
                                                                        aria-label="Eliminar intervalo"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                                                    </button>
                                                                    {invalid && (
                                                                        <div className="col-span-4 text-xs text-red-500 mt-1">
                                                                            La hora de inicio debe ser anterior a la de fin.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
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
            {error && <ErrorMessage message={error} />}
            {hasChanges && (
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!!error}>Guardar Cambios</Button>
                </div>
            )}
        </div>
    );
};