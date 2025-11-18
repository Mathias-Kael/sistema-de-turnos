import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Hours, DayHours, Interval } from '../../types';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { validarIntervalos, timeToMinutes } from '../../utils/availability';
import { getServerDateSync, parseDateString } from '../../utils/dateHelpers';

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
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [affectedBookings, setAffectedBookings] = useState<Array<{date: string, time: string, client: string}>>([]);
    const [showCopyConfirmModal, setShowCopyConfirmModal] = useState(false);
    const [dayToCopy, setDayToCopy] = useState<keyof Hours | null>(null);

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

    const copyDayToRest = (day: keyof Hours) => {
        setDayToCopy(day);
        setShowCopyConfirmModal(true);
    };

    const confirmCopyDayToRest = () => {
        if (!dayToCopy) return;

        const source = draftHours[dayToCopy];
        const updated: Hours = { ...draftHours } as Hours;
        for (const k of Object.keys(updated) as (keyof Hours)[]) {
            if (k === dayToCopy) continue;
            updated[k] = {
                enabled: source.enabled,
                intervals: source.intervals.map((i: Interval) => ({ ...i })),
            };
        }
        setDraftHours(updated);
        validateHours(updated);
        setShowCopyConfirmModal(false);
        setDayToCopy(null);
    };

    const validateHours = (hours: Hours): boolean => {
        for (const dayKey of Object.keys(hours) as (keyof Hours)[]) {
            const dayHours = hours[dayKey];
            const dayLabel = daysOfWeek.find(d => d.key === dayKey)?.label || dayKey;

            if (dayHours.enabled) {
                for (const interval of dayHours.intervals) {
                    // Usar timeToMinutes con contexto para validar correctamente horarios nocturnos
                    if (!interval.open || !interval.close) {
                        setError(`Intervalo inválido para el ${dayLabel}. Debe especificar hora de inicio y fin.`);
                        return false;
                    }
                    const openMinutes = timeToMinutes(interval.open, 'open');
                    const closeMinutes = timeToMinutes(interval.close, 'close');
                    if (openMinutes >= closeMinutes) {
                        setError(`Intervalo inválido para el ${dayLabel}. La hora de inicio debe ser menor que la de fin.`);
                        return false;
                    }
                }
                if (!validarIntervalos(dayHours.intervals)) {
                    setError(`Los intervalos para el ${dayLabel} se solapan.`);
                    return false;
                }

                // Validar orden cronológico de intervalos (para evitar problemas con horarios nocturnos)
                if (dayHours.intervals.length > 1) {
                    for (let i = 1; i < dayHours.intervals.length; i++) {
                        const prevEnd = timeToMinutes(dayHours.intervals[i - 1].close, 'close');
                        const currStart = timeToMinutes(dayHours.intervals[i].open, 'open');

                        // El intervalo actual debe empezar después de que termine el anterior
                        if (currStart <= prevEnd) {
                            setError(`❌ ${dayLabel}: Los turnos deben estar en orden cronológico. El turno ${i + 1} (${dayHours.intervals[i].open}-${dayHours.intervals[i].close}) debe empezar después de que termine el turno ${i} (${dayHours.intervals[i - 1].open}-${dayHours.intervals[i - 1].close}).`);
                            return false;
                        }
                    }
                }
            }
        }
        setError(null);
        return true;
    };

    // Detectar reservas futuras que quedarían fuera del nuevo horario
    // Optimizado: O(N) en lugar de O(N*M) con pre-cálculo de intervalos
    const checkAffectedFutureBookings = (newHours: Hours) => {
        // Usar fecha del servidor para evitar discrepancias de timezone
        const today = getServerDateSync();


        const dayMap: {[key: number]: keyof Hours} = {
            0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
            4: 'thursday', 5: 'friday', 6: 'saturday'
        };

        // Pre-calcular intervalos en minutos por día (O(7*M) = O(1) para 7 días)
        const dayIntervalsMap = new Map<keyof Hours, Array<{start: number, end: number}>>();

        (Object.keys(newHours) as Array<keyof Hours>).forEach(dayKey => {
            const dayHours = newHours[dayKey];
            if (dayHours.enabled && dayHours.intervals.length > 0) {
                const intervalsInMinutes = dayHours.intervals.map(interval => ({
                    start: timeToMinutes(interval.open, 'open'),
                    end: timeToMinutes(interval.close, 'close')
                }));
                dayIntervalsMap.set(dayKey, intervalsInMinutes);
            }
        });

        const affected: Array<{date: string, time: string, client: string}> = [];

        // Iterar sobre reservas una sola vez: O(N)
        business.bookings.forEach(booking => {
            if (booking.status === 'cancelled') return;

            try {
                const bookingDate = parseDateString(booking.date);

                // Excluir reservas pasadas (< today, no <=, porque today a las 00:00 es inicio del día actual)
                if (bookingDate < today) return;

                const dayOfWeek = dayMap[bookingDate.getDay()];
                const newDayHours = newHours[dayOfWeek];

                // Obtener horarios actuales del negocio para este día
                const currentDayHours = business.hours[dayOfWeek];

                // SOLO verificar si los horarios de ESTE día específico cambiaron
                // Si no cambiaron, no hay conflicto posible
                const hoursChanged = JSON.stringify(currentDayHours) !== JSON.stringify(newDayHours);
                if (!hoursChanged) return; // No hay cambios en este día, skip

                // Si el día está cerrado en el nuevo horario, la reserva queda afectada
                if (!newDayHours.enabled) {
                    affected.push({
                        date: booking.date,
                        time: `${booking.start} - ${booking.end}`,
                        client: booking.client.name
                    });
                    return;
                }

                // Buscar en Map pre-calculado (O(1) lookup + O(M) check intervals)
                const intervals = dayIntervalsMap.get(dayOfWeek);
                if (!intervals || intervals.length === 0) {
                    // Día sin intervalos = reserva afectada
                    affected.push({
                        date: booking.date,
                        time: `${booking.start} - ${booking.end}`,
                        client: booking.client.name
                    });
                    return;
                }

                // Verificar si la reserva cae dentro de algún intervalo (ya pre-calculados)
                const bookingStart = timeToMinutes(booking.start, 'open');
                const bookingEnd = timeToMinutes(booking.end, 'close');

                const isWithinNewHours = intervals.some(interval =>
                    bookingStart >= interval.start && bookingEnd <= interval.end
                );

                if (!isWithinNewHours) {
                    affected.push({
                        date: booking.date,
                        time: `${booking.start} - ${booking.end}`,
                        client: booking.client.name
                    });
                }
            } catch (error) {
                // Si hay error de validación en los datos de la reserva (formato inválido),
                // marcarla como afectada por seguridad
                console.warn(`Reserva con datos inválidos detectada (ID: ${booking.id}):`, error);
                affected.push({
                    date: booking.date,
                    time: `${booking.start} - ${booking.end}`,
                    client: booking.client.name
                });
            }
        });

        return affected;
    };

    const handleSave = async () => {
        if (!validateHours(draftHours)) return;

        // Verificar si hay reservas futuras afectadas
        const affected = checkAffectedFutureBookings(draftHours);
        if (affected.length > 0) {
            setAffectedBookings(affected);
            setShowConfirmModal(true);
            return;
        }

        // Si no hay reservas afectadas, guardar directamente
        await saveChanges();
    };

    const saveChanges = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const updatedBusiness = { ...business, hours: draftHours };
            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            setSuccessMessage('✓ Horarios actualizados correctamente');

            // Limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
            setShowConfirmModal(false);
        }
    };

    const handleCancel = () => {
        setDraftHours(business.hours);
        setError(null);
    };

    // Memoize hasChanges calculation to avoid expensive JSON.stringify on every render
    const hasChanges = useMemo(() => {
        return JSON.stringify(draftHours) !== JSON.stringify(business.hours);
    }, [draftHours, business.hours]);

    // Calcular cuántos días fueron modificados
    const modifiedDaysCount = useMemo(() => {
        if (!hasChanges) return 0;
        let count = 0;
        (Object.keys(draftHours) as Array<keyof Hours>).forEach(dayKey => {
            if (JSON.stringify(draftHours[dayKey]) !== JSON.stringify(business.hours[dayKey])) {
                count++;
            }
        });
        return count;
    }, [draftHours, business.hours, hasChanges]);

    // Advertencia antes de salir si hay cambios sin guardar
    useEffect(() => {
        if (!hasChanges) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    return (
        <div className="space-y-4 pb-24">
            <h3 className="text-lg font-medium text-primary">Horario Semanal</h3>
            {daysOfWeek.map(({ key: dayKey, label }) => {
                const isDayModified = JSON.stringify(draftHours[dayKey]) !== JSON.stringify(business.hours[dayKey]);
                return (
                <div key={dayKey} className="p-4 border border-default rounded-md bg-surface relative">
                    {/* Indicador visual de día modificado */}
                    {isDayModified && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-sm animate-pulse"
                             title="Día modificado"
                        />
                    )}
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
                                                            // Validar usando timeToMinutes con contexto para horarios nocturnos
                                                            const openMinutes = interval.open ? timeToMinutes(interval.open, 'open') : -1;
                                                            const closeMinutes = interval.close ? timeToMinutes(interval.close, 'close') : -1;
                                                            const invalid = !interval.open || !interval.close || openMinutes >= closeMinutes;

                                                            // Detectar solapamiento con otros intervalos
                                                            const hasOverlap = draftHours[dayKey].intervals.some((otherInterval, otherIndex) => {
                                                                if (otherIndex === index) return false;
                                                                const otherStart = timeToMinutes(otherInterval.open, 'open');
                                                                const otherEnd = timeToMinutes(otherInterval.close, 'close');
                                                                return (
                                                                    (openMinutes >= otherStart && openMinutes < otherEnd) ||
                                                                    (closeMinutes > otherStart && closeMinutes <= otherEnd) ||
                                                                    (openMinutes <= otherStart && closeMinutes >= otherEnd)
                                                                );
                                                            });

                                                            // Detectar problemas de orden cronológico
                                                            const isOutOfOrder = index > 0 &&
                                                                openMinutes <= timeToMinutes(draftHours[dayKey].intervals[index - 1].close, 'close');

                                                            const hasError = invalid || hasOverlap || isOutOfOrder;
                                                            const baseInput = "w-full px-3 py-2 border-2 rounded-md shadow-sm bg-surface text-primary focus:outline-none focus:ring-2 transition-all";
                                                            const validBorder = "border-gray-300 focus:ring-primary focus:border-primary";
                                                            const invalidBorder = "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50";

                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className="grid grid-cols-[1fr_auto_1fr_auto] items-start gap-2"
                                                                >
                                                                    <input
                                                                        type="time"
                                                                        value={interval.open}
                                                                        onChange={(e) => handleIntervalChange(dayKey, index, 'open', e.target.value)}
                                                                        aria-label="Hora de apertura"
                                                                        placeholder="Desde"
                                                                        className={`${baseInput} ${hasError ? invalidBorder : validBorder}`}
                                                                    />
                                                                    <span className="text-secondary px-1 mt-2">-</span>
                                                                    <input
                                                                        type="time"
                                                                        value={interval.close}
                                                                        onChange={(e) => handleIntervalChange(dayKey, index, 'close', e.target.value)}
                                                                        aria-label="Hora de cierre"
                                                                        placeholder="Hasta"
                                                                        className={`${baseInput} ${hasError ? invalidBorder : validBorder}`}
                                                                    />
                                                                    <button
                                                                        onClick={() => removeInterval(dayKey, index)}
                                                                        className="justify-self-end p-2 mt-1 bg-state-danger-bg text-state-danger-text rounded-full hover:opacity-90 transition-colors"
                                                                        aria-label="Eliminar intervalo"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                                                    </button>
                                                                    {/* Mensajes de error inline específicos */}
                                                                    {hasError && (
                                                                        <div className="col-span-4 mt-1 p-2 bg-red-50 dark:bg-red-950 border-l-4 border-red-500 dark:border-red-700 rounded">
                                                                            <div className="flex items-start gap-2">
                                                                                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                                </svg>
                                                                                <div className="text-sm text-red-800 dark:text-red-200">
                                                                                    {invalid && <p className="font-medium">⚠️ La hora de inicio debe ser anterior a la de fin.</p>}
                                                                                    {hasOverlap && !invalid && <p className="font-medium">⚠️ Este intervalo se solapa con otro turno del mismo día.</p>}
                                                                                    {isOutOfOrder && !invalid && !hasOverlap && <p className="font-medium">⚠️ Los turnos deben estar en orden cronológico.</p>}
                                                                                </div>
                                                                            </div>
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
            );
            })}
            {error && <ErrorMessage message={error} />}
            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Sticky Action Bar - Siempre visible cuando hay cambios */}
            {hasChanges && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-orange-500 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            {/* Información de cambios */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full">
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                        Tienes cambios sin guardar
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {modifiedDaysCount} {modifiedDaysCount === 1 ? 'día modificado' : 'días modificados'}
                                    </p>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="min-w-[120px]"
                                >
                                    Descartar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!!error || isSaving}
                                    className="min-w-[140px] bg-orange-600 hover:bg-orange-700"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Guardar Cambios
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Mensaje de error si existe - ahora visible en el sticky bar */}
                        {error && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-md">
                                <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de confirmación para copiar horario */}
            {showCopyConfirmModal && dayToCopy && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-lg shadow-xl max-w-lg w-full">
                        {/* Header */}
                        <div className="p-6 border-b border-default">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-primary">
                                        Copiar horario de {daysOfWeek.find(d => d.key === dayToCopy)?.label}
                                    </h3>
                                    <p className="mt-1 text-sm text-secondary">
                                        Esta acción reemplazará los horarios de todos los demás días de la semana.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="mb-4">
                                <h4 className="font-medium text-primary mb-2">Horario a copiar:</h4>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-md">
                                    <p className="font-semibold text-gray-900 dark:text-blue-100">
                                        {daysOfWeek.find(d => d.key === dayToCopy)?.label}
                                    </p>
                                    {draftHours[dayToCopy].enabled ? (
                                        <div className="mt-2 space-y-1">
                                            {draftHours[dayToCopy].intervals.map((interval, idx) => (
                                                <p key={idx} className="text-sm text-gray-700 dark:text-blue-200">
                                                    📅 {interval.open} - {interval.close}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-blue-300 mt-1">Cerrado</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-700 rounded-md">
                                <div className="flex gap-2">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        <strong>Atención:</strong> Los siguientes días serán sobrescritos:{' '}
                                        {daysOfWeek
                                            .filter(d => d.key !== dayToCopy)
                                            .map(d => d.label)
                                            .join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-default bg-surface flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowCopyConfirmModal(false);
                                    setDayToCopy(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmCopyDayToRest}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmar y Copiar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para reservas afectadas */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-default">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-primary">⚠️ Atención: Reservas Futuras Afectadas</h3>
                                    <p className="mt-1 text-sm text-secondary">
                                        Los cambios en el horario de atención afectarán {affectedBookings.length} reserva{affectedBookings.length > 1 ? 's' : ''} futura{affectedBookings.length > 1 ? 's' : ''} que quedaría{affectedBookings.length > 1 ? 'n' : ''} fuera del nuevo horario.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body - Lista de reservas afectadas */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="mb-4">
                                <h4 className="font-medium text-primary mb-3">Reservas que quedarán fuera del horario:</h4>
                                <div className="space-y-2">
                                    {affectedBookings.map((booking, idx) => (
                                        <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-700 rounded-md">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-yellow-100">{booking.client}</div>
                                                    <div className="text-sm text-gray-600 dark:text-yellow-300 mt-1">
                                                        <span className="inline-flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {parseDateString(booking.date).toLocaleDateString('es-AR', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                        <span className="mx-2">•</span>
                                                        <span className="inline-flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {booking.time}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-md">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Nota importante:</strong> Si continuás, estas reservas seguirán activas en el sistema, pero quedarán fuera del horario de atención configurado. Te recomendamos contactar a los clientes afectados para reprogramar o cancelar las reservas.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-default bg-surface">
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setAffectedBookings([]);
                                    }}
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={saveChanges}
                                    disabled={isSaving}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        'Continuar y Guardar'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};