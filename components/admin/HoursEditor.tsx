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
                                                            // Validar usando timeToMinutes con contexto para horarios nocturnos
                                                            const openMinutes = interval.open ? timeToMinutes(interval.open, 'open') : -1;
                                                            const closeMinutes = interval.close ? timeToMinutes(interval.close, 'close') : -1;
                                                            const invalid = !interval.open || !interval.close || openMinutes >= closeMinutes;
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
            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}
            {hasChanges && (
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={!!error || isSaving}>
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
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
                                        <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{booking.client}</div>
                                                    <div className="text-sm text-gray-600 mt-1">
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

                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Nota importante:</strong> Si continuás, estas reservas seguirán activas en el sistema, pero quedarán fuera del horario de atención configurado. Te recomendamos contactar a los clientes afectados para reprogramar o cancelar las reservas.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-default bg-gray-50">
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