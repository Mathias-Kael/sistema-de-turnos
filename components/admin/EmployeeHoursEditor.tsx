import React, { useState, useEffect } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee, Hours, DayHours, Interval } from '../../types';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { MidnightConfirmationModal } from '../ui/MidnightConfirmationModal';
import { validarIntervalos, detectsCrossesMidnight } from '../../utils/availability';

interface EmployeeHoursEditorProps {
    employee: Employee;
    onClose: () => void;
}

const EmployeeHoursEditor: React.FC<EmployeeHoursEditorProps> = ({ employee, onClose }) => {
    const dispatch = useBusinessDispatch();
    const businessState = useBusinessState();
    const [employeeHours, setEmployeeHours] = useState<Hours>(employee.hours || INITIAL_BUSINESS_DATA.hours);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [midnightConfirmation, setMidnightConfirmation] = useState<{
        isOpen: boolean;
        interval: Interval | null;
        day: keyof Hours | null;
        index: number | null;
    }>({ isOpen: false, interval: null, day: null, index: null });

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
        const newIntervals = [...employeeHours[day].intervals];
        newIntervals[index] = { ...newIntervals[index], [field]: value };
        const updatedInterval = newIntervals[index];

        // Detectar si el intervalo cruza medianoche y ambos campos están completos
        if (updatedInterval.open && updatedInterval.close && detectsCrossesMidnight(updatedInterval)) {
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
            setEmployeeHours(prevHours => ({
                ...prevHours,
                [day]: {
                    ...prevHours[day],
                    intervals: newIntervals,
                },
            }));
        }
    };

    const handleMidnightConfirm = () => {
        if (midnightConfirmation.day && midnightConfirmation.index !== null && midnightConfirmation.interval) {
            const day = midnightConfirmation.day;
            const index = midnightConfirmation.index;
            const interval = midnightConfirmation.interval;

            setEmployeeHours(prevHours => {
                const newIntervals = [...prevHours[day].intervals];
                newIntervals[index] = interval;
                return {
                    ...prevHours,
                    [day]: {
                        ...prevHours[day],
                        intervals: newIntervals,
                    },
                };
            });
        }

        setMidnightConfirmation({ isOpen: false, interval: null, day: null, index: null });
    };

    const handleMidnightCancel = () => {
        // No aplicar cambios
        setMidnightConfirmation({ isOpen: false, interval: null, day: null, index: null });
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

    const handleSave = async () => {
        setError(null);
        setIsSaving(true);

        for (const day of daysOfWeek) {
            const dayConfig = employeeHours[day];
            if (dayConfig.enabled) {
                for (const interval of dayConfig.intervals) {
                    if (!interval.open || !interval.close) {
                        setError(`Error: Todos los campos de tiempo deben estar completos para el día ${dayNames[day]}.`);
                        setIsSaving(false);
                        return;
                    }
                    // Permitir horarios que cruzan medianoche (open > close es válido)
                    if (interval.open === interval.close) {
                        setError(`Error: Las horas de inicio y fin no pueden ser iguales en el día ${dayNames[day]}.`);
                        setIsSaving(false);
                        return;
                    }
                }
                if (!validarIntervalos(dayConfig.intervals)) {
                    setError(`Error: Se encontraron intervalos de tiempo solapados para el día ${dayNames[day]}.`);
                    setIsSaving(false);
                    return;
                }
            }
        }

        try {
            await dispatch({ type: 'UPDATE_EMPLOYEE_HOURS', payload: { employeeId: employee.id, hours: employeeHours } });
            onClose(); // Llamar a onClose solo si el guardado fue exitoso
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
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

                <MidnightConfirmationModal
                    isOpen={midnightConfirmation.isOpen}
                    interval={midnightConfirmation.interval || { open: '00:00', close: '00:00' }}
                    onConfirm={handleMidnightConfirm}
                    onCancel={handleMidnightCancel}
                />
            </div>
        </div>
    );
};

export default EmployeeHoursEditor;