import React, { useState, useEffect } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Hours, DayHours, Interval } from '../../types';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { MidnightConfirmationModal } from '../ui/MidnightConfirmationModal';
import { validarIntervalos, detectsCrossesMidnight } from '../../utils/availability';

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
    const [midnightModeEnabled, setMidnightModeEnabled] = useState<boolean>(business.midnightModeEnabled || false);
    const [error, setError] = useState<string | null>(null);
    const [midnightConfirmation, setMidnightConfirmation] = useState<{
        isOpen: boolean;
        interval: Interval | null;
        day: keyof Hours | null;
        index: number | null;
    }>({ isOpen: false, interval: null, day: null, index: null });

    useEffect(() => {
        setDraftHours(business.hours);
        setMidnightModeEnabled(business.midnightModeEnabled || false);
    }, [business.hours, business.midnightModeEnabled]);

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

        const updatedInterval = newIntervals[index];

        // Mostrar modal SOLO si:
        // 1. Toggle está ON
        // 2. Ambos campos completos
        // 3. Cruza medianoche
        // 4. NO es cierre a 00:00 (eso es permitido siempre)
        if (
            midnightModeEnabled &&
            updatedInterval.open &&
            updatedInterval.close &&
            updatedInterval.close !== '00:00' &&
            detectsCrossesMidnight(updatedInterval)
        ) {
            // Mostrar modal de confirmación
            setMidnightConfirmation({
                isOpen: true,
                interval: updatedInterval,
                day,
                index
            });
            // No actualizar aún, esperar confirmación
        } else {
            // Horario normal o incompleto, actualizar directamente
            handleHoursChange(day, { ...draftHours[day], intervals: newIntervals });
        }
    };

    const handleMidnightConfirm = () => {
        if (midnightConfirmation.day && midnightConfirmation.index !== null && midnightConfirmation.interval) {
            const day = midnightConfirmation.day;
            const index = midnightConfirmation.index;
            const interval = midnightConfirmation.interval;

            const newIntervals = draftHours[day].intervals.map((int, i) =>
                i === index ? interval : int
            );

            handleHoursChange(day, { ...draftHours[day], intervals: newIntervals });
        }

        setMidnightConfirmation({ isOpen: false, interval: null, day: null, index: null });
    };

    const handleMidnightCancel = () => {
        // Revertir el cambio - restaurar desde business.hours o mantener valor previo
        setDraftHours(draftHours); // Mantener el estado actual sin aplicar el cambio
        setMidnightConfirmation({ isOpen: false, interval: null, day: null, index: null });
    };

    const copyDayToRest = (day: keyof Hours) => {
        if (!window.confirm('Esto reemplazará los intervalos del resto de los días. ¿Querés continuar?')) return;
        const source = draftHours[day];
        const updated: Hours = { ...draftHours } as Hours;
        for (const k of Object.keys(updated) as (keyof Hours)[]) {
            if (k === day) continue;
            updated[k] = {
                enabled: source.enabled,
                intervals: source.intervals.map((i: Interval) => ({ ...i })),
            };
        }
        setDraftHours(updated);
        validateHours(updated);
    };

    const validateHours = (hours: Hours): boolean => {
        for (const dayKey of Object.keys(hours) as (keyof Hours)[]) {
            const dayHours = hours[dayKey];
            const dayLabel = daysOfWeek.find(d => d.key === dayKey)?.label || dayKey;

            if (dayHours.enabled) {
                for (const interval of dayHours.intervals) {
                    // Validar que ambos campos estén completos
                    if (!interval.open || !interval.close) {
                        setError(`Intervalo incompleto para el ${dayLabel}.`);
                        return false;
                    }

                    // VALIDACIÓN REFINADA:
                    // - Si toggle OFF: Permitir cierre 00:00 (ej: 20:00-00:00), rechazar open > close
                    // - Si toggle ON: Permitir open > close (ej: 22:00-02:00), rechazar solo si son iguales
                    if (midnightModeEnabled) {
                        // Modo medianoche ON: Solo rechazar si son iguales
                        if (interval.open === interval.close) {
                            setError(`Intervalo inválido para el ${dayLabel}. Las horas de inicio y fin no pueden ser iguales.`);
                            return false;
                        }
                    } else {
                        // Modo medianoche OFF: Rechazar open > close (excepto cierre a 00:00)
                        const startMinutes = parseInt(interval.open.split(':')[0]) * 60 + parseInt(interval.open.split(':')[1]);
                        const endMinutes = parseInt(interval.close.split(':')[0]) * 60 + parseInt(interval.close.split(':')[1]);

                        if (interval.open === interval.close) {
                            setError(`Intervalo inválido para el ${dayLabel}. Las horas de inicio y fin no pueden ser iguales.`);
                            return false;
                        }

                        // Permitir cierre a 00:00 (que técnicamente es startMinutes > endMinutes si end es 0)
                        if (startMinutes > endMinutes && interval.close !== '00:00') {
                            setError(`Intervalo inválido para el ${dayLabel}. Activá "Atendemos después de medianoche" para horarios que cruzan al día siguiente.`);
                            return false;
                        }
                    }
                }

                // Validar que no haya solapamientos
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
            // Creamos el payload completo para la actualización, incluyendo midnightModeEnabled
            const updatedBusiness = { ...business, hours: draftHours, midnightModeEnabled };
            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            // Aquí podrías mostrar una notificación de éxito
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleCancel = () => {
        setDraftHours(business.hours);
        setMidnightModeEnabled(business.midnightModeEnabled || false);
        setError(null);
    };

    const hasChanges = JSON.stringify(draftHours) !== JSON.stringify(business.hours) || midnightModeEnabled !== (business.midnightModeEnabled || false);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Horario Semanal</h3>

            {/* Toggle Premium: Modo Horarios Medianoche */}
            <div className="p-4 border-2 border-default rounded-lg bg-surface-hover">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <label htmlFor="midnight-mode-toggle" className="flex items-center gap-2 cursor-pointer">
                                <input
                                    id="midnight-mode-toggle"
                                    type="checkbox"
                                    checked={midnightModeEnabled}
                                    onChange={(e) => setMidnightModeEnabled(e.target.checked)}
                                    className="h-5 w-5 rounded border-default accent-primary focus:ring-primary cursor-pointer"
                                />
                                <span className="text-base font-semibold text-primary">
                                    Atendemos después de medianoche
                                </span>
                            </label>
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-sm text-secondary">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>
                                Para horarios como 22:00-02:00 que cruzan al día siguiente.
                                {midnightModeEnabled ? ' Los clientes podrán reservar turnos en madrugada.' : ' Si solo cerrás a medianoche (ej: 20:00-00:00), no necesitás activar esto.'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

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
                                                            const incomplete = !interval.open || !interval.close;
                                                            const sameTime = interval.open === interval.close;
                                                            const invalid = incomplete || sameTime;
                                                            // Mostrar indicador amarillo SOLO si toggle ON y cruza medianoche (no cierre 00:00)
                                                            const crossesMidnight = midnightModeEnabled &&
                                                                interval.open &&
                                                                interval.close &&
                                                                interval.close !== '00:00' &&
                                                                detectsCrossesMidnight(interval);

                                                            const baseInput = "w-full px-3 py-2 border rounded-md shadow-sm bg-surface text-primary focus:outline-none focus:ring-1";
                                                            const validBorder = "border-default focus:ring-primary";
                                                            const invalidBorder = "border-red-400 focus:ring-red-400";
                                                            const midnightBorder = "border-yellow-400 focus:ring-yellow-400";

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
                                                                        className={`${baseInput} ${invalid ? invalidBorder : crossesMidnight ? midnightBorder : validBorder}`}
                                                                    />
                                                                    <span className="text-secondary px-1">-</span>
                                                                    <input
                                                                        type="time"
                                                                        value={interval.close}
                                                                        onChange={(e) => handleIntervalChange(dayKey, index, 'close', e.target.value)}
                                                                        aria-label="Hora de cierre"
                                                                        placeholder="Hasta"
                                                                        className={`${baseInput} ${invalid ? invalidBorder : crossesMidnight ? midnightBorder : validBorder}`}
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
                                                                            {incomplete ? 'Completá ambas horas.' : 'Las horas de inicio y fin no pueden ser iguales.'}
                                                                        </div>
                                                                    )}
                                                                    {crossesMidnight && !invalid && (
                                                                        <div className="col-span-4 text-xs text-yellow-600 mt-1 flex items-center">
                                                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                                            </svg>
                                                                            Este horario cruza medianoche (ej: abierto hasta la madrugada)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                                                    <button
                                                                                            onClick={() => addInterval(dayKey)}
                                                                                            className="w-full px-4 py-2 border-2 border-dashed border-default text-secondary rounded-md hover:bg-surface-hover hover:border-primary transition-all"
                                                                                    >
                                                                                            + Añadir Turno
                                                                                    </button>
                                                                                    <button
                                                                                            type="button"
                                                                                            onClick={() => copyDayToRest(dayKey)}
                                                                                            className="w-full px-4 py-2 border border-default text-secondary rounded-md hover:bg-surface-hover transition-all"
                                                                                    >
                                                                                            Copiar al resto de la semana
                                                                                    </button>
                                                                                </div>
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

            <MidnightConfirmationModal
                isOpen={midnightConfirmation.isOpen}
                interval={midnightConfirmation.interval || { open: '00:00', close: '00:00' }}
                onConfirm={handleMidnightConfirm}
                onCancel={handleMidnightCancel}
            />
        </div>
    );
};