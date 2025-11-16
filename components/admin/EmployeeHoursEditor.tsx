import React, { useState, useEffect } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee, Hours, DayHours, Interval } from '../../types';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { validarIntervalos, timeToMinutes } from '../../utils/availability';
import { getServerDateSync, parseDateString } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';

interface EmployeeHoursEditorProps {
    employee: Employee;
    onClose: () => void;
}

const EmployeeHoursEditor: React.FC<EmployeeHoursEditorProps> = ({ employee, onClose }) => {
    const dispatch = useBusinessDispatch();
    const businessState = useBusinessState();
    const [employeeHours, setEmployeeHours] = useState<Hours>(employee.hours || INITIAL_BUSINESS_DATA.hours);
    const [originalEmployeeHours] = useState<Hours>(employee.hours || INITIAL_BUSINESS_DATA.hours); // Guardamos el estado original
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [affectedBookings, setAffectedBookings] = useState<Array<{date: string, time: string, client: string}>>([]);

    useEffect(() => {
        setEmployeeHours(employee.hours || INITIAL_BUSINESS_DATA.hours);
    }, [employee.hours]);

    const handleDayToggle = (day: keyof Hours) => {
        setEmployeeHours(prevHours => ({
            ...prevHours,
            [day]: {
                ...prevHours[day],
                enabled: !prevHours[day].enabled,
            },
        }));
    };

    const handleIntervalChange = (day: keyof Hours, index: number, field: 'open' | 'close', value: string) => {
        setEmployeeHours(prevHours => {
            const newIntervals = [...prevHours[day].intervals];
            newIntervals[index] = { ...newIntervals[index], [field]: value };
            return {
                ...prevHours,
                [day]: {
                    ...prevHours[day],
                    intervals: newIntervals,
                },
            };
        });
    };

    const addInterval = (day: keyof Hours) => {
        setEmployeeHours(prevHours => ({
            ...prevHours,
            [day]: {
                ...prevHours[day],
                intervals: [...prevHours[day].intervals, { open: '09:00', close: '17:00' }],
            },
        }));
    };

    const removeInterval = (day: keyof Hours, index: number) => {
        setEmployeeHours(prevHours => ({
            ...prevHours,
            [day]: {
                ...prevHours[day],
                intervals: prevHours[day].intervals.filter((_, i) => i !== index),
            },
        }));
    };

    // Detectar reservas futuras del empleado que quedarían fuera del nuevo horario
    const checkAffectedEmployeeBookings = (newHours: Hours) => {
        const today = getServerDateSync();
        const dayMap: {[key: number]: keyof Hours} = {
            0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
            4: 'thursday', 5: 'friday', 6: 'saturday'
        };

        // Pre-calcular intervalos en minutos por día
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

        // Filtrar solo las reservas de este empleado
        businessState.bookings.forEach(booking => {
            if (booking.status === 'cancelled') return;
            if (booking.employeeId !== employee.id) return; // Solo reservas de este empleado

            try {
                const bookingDate = parseDateString(booking.date);

                // Excluir reservas pasadas
                if (bookingDate < today) return;

                const dayOfWeek = dayMap[bookingDate.getDay()];
                const newDayHours = newHours[dayOfWeek];

                // Obtener horarios ORIGINALES del empleado para este día (al abrir el modal)
                const currentDayHours = originalEmployeeHours[dayOfWeek] || businessState.hours[dayOfWeek];

                // SOLO verificar si los horarios de ESTE día específico cambiaron
                const hoursChanged = JSON.stringify(currentDayHours) !== JSON.stringify(newDayHours);
                if (!hoursChanged) return;

                // Si el día está cerrado en el nuevo horario, la reserva queda afectada
                if (!newDayHours.enabled) {
                    affected.push({
                        date: booking.date,
                        time: `${booking.start} - ${booking.end}`,
                        client: booking.client.name
                    });
                    return;
                }

                // Buscar en Map pre-calculado
                const intervals = dayIntervalsMap.get(dayOfWeek);
                if (!intervals || intervals.length === 0) {
                    affected.push({
                        date: booking.date,
                        time: `${booking.start} - ${booking.end}`,
                        client: booking.client.name
                    });
                    return;
                }

                // Verificar si la reserva cae dentro de algún intervalo
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
        setError(null);

        // Validar formato de horarios
        for (const day of daysOfWeek) {
            const dayConfig = employeeHours[day];
            if (dayConfig.enabled) {
                for (const interval of dayConfig.intervals) {
                    if (!interval.open || !interval.close) {
                        setError(`Error: Todos los campos de tiempo deben estar completos para el día ${dayNames[day]}.`);
                        return;
                    }
                    // Usar timeToMinutes con contexto para validar correctamente horarios nocturnos
                    const openMinutes = timeToMinutes(interval.open, 'open');
                    const closeMinutes = timeToMinutes(interval.close, 'close');
                    if (openMinutes >= closeMinutes) {
                        setError(`Error: La hora de cierre debe ser posterior a la hora de inicio en todos los intervalos para el día ${dayNames[day]}.`);
                        return;
                    }
                }
                if (!validarIntervalos(dayConfig.intervals)) {
                    setError(`Error: Se encontraron intervalos de tiempo solapados para el día ${dayNames[day]}.`);
                    return;
                }

                // Validar orden cronológico de intervalos (para evitar problemas con horarios nocturnos)
                if (dayConfig.intervals.length > 1) {
                    for (let i = 1; i < dayConfig.intervals.length; i++) {
                        const prevEnd = timeToMinutes(dayConfig.intervals[i - 1].close, 'close');
                        const currStart = timeToMinutes(dayConfig.intervals[i].open, 'open');

                        // El intervalo actual debe empezar después de que termine el anterior
                        if (currStart <= prevEnd) {
                            setError(`❌ ${dayNames[day]}: Los turnos deben estar en orden cronológico. El turno ${i + 1} (${dayConfig.intervals[i].open}-${dayConfig.intervals[i].close}) debe empezar después de que termine el turno ${i} (${dayConfig.intervals[i - 1].open}-${dayConfig.intervals[i - 1].close}).`);
                            return;
                        }
                    }
                }
            }
        }

        // Verificar si hay reservas futuras afectadas
        const affected = checkAffectedEmployeeBookings(employeeHours);
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

        try {
            await dispatch({ type: 'UPDATE_EMPLOYEE_HOURS', payload: { employeeId: employee.id, hours: employeeHours } });
            onClose(); // Llamar a onClose solo si el guardado fue exitoso
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
            setShowConfirmModal(false);
        }
    };

    const daysOfWeek: (keyof Hours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames: { [key in keyof Hours]: string } = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
        friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    return (
        <div className="fixed inset-0 bg-background-dark bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="bg-surface p-8 rounded-lg shadow-xl max-w-2xl w-full text-primary">
                <h2 className="text-2xl font-bold mb-4 text-primary">Editar Horarios de {employee.name}</h2>
                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {daysOfWeek.map(day => (
                        <div key={day} className="border border-default p-3 rounded-md bg-background">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="font-medium text-lg text-primary">{dayNames[day]}</span>
                                <input
                                    type="checkbox"
                                    checked={employeeHours[day]?.enabled || false}
                                    onChange={() => handleDayToggle(day)}
                                    className="toggle toggle-primary"
                                />
                            </label>
                            {employeeHours[day]?.enabled && (
                                <div className="mt-3 space-y-2">
                                    {employeeHours[day].intervals.map((interval, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <input
                                                type="time"
                                                value={interval.open}
                                                onChange={(e) => handleIntervalChange(day, index, 'open', e.target.value)}
                                                className="input input-bordered w-full bg-surface text-primary border-default"
                                            />
                                            <span className="text-primary">-</span>
                                            <input
                                                type="time"
                                                value={interval.close}
                                                onChange={(e) => handleIntervalChange(day, index, 'close', e.target.value)}
                                                className="input input-bordered w-full bg-surface text-primary border-default"
                                            />
                                            <button
                                                onClick={() => removeInterval(day, index)}
                                                className="btn bg-state-danger-bg text-state-danger-text hover:bg-state-danger-strong hover:text-brand-text btn-sm"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addInterval(day)} className="btn btn-sm btn-outline btn-primary mt-2">
                                        Añadir Intervalo
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="btn btn-ghost text-secondary hover:bg-background" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Horarios'}
                    </button>
                </div>
            </div>

            {/* Modal de confirmación para reservas afectadas */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
                                        Los cambios en los horarios de <strong>{employee.name}</strong> afectarán {affectedBookings.length} reserva{affectedBookings.length > 1 ? 's' : ''} futura{affectedBookings.length > 1 ? 's' : ''} que quedaría{affectedBookings.length > 1 ? 'n' : ''} fuera del nuevo horario.
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
                                    <strong>Nota importante:</strong> Si continuás, estas reservas seguirán activas en el sistema, pero quedarán fuera del horario de atención de {employee.name}. Te recomendamos contactar a los clientes afectados para reprogramar o reasignar las reservas a otro empleado.
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

export default EmployeeHoursEditor;