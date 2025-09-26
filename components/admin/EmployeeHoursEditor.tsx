import React, { useState, useEffect } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Employee, Hours, DayHours, Interval } from '../../types';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { validarIntervalos } from '../../utils/availability';

interface EmployeeHoursEditorProps {
    employee: Employee;
    onClose: () => void;
}

const EmployeeHoursEditor: React.FC<EmployeeHoursEditorProps> = ({ employee, onClose }) => {
    const dispatch = useBusinessDispatch();
    const businessState = useBusinessState();
    const [employeeHours, setEmployeeHours] = useState<Hours>(employee.hours || INITIAL_BUSINESS_DATA.hours);

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

    const handleSave = () => {
        for (const day of daysOfWeek) {
            const dayConfig = employeeHours[day];
            if (dayConfig.enabled) {
                // Validar campos vacíos
                for (const interval of dayConfig.intervals) {
                    // Validar campos vacíos
                    if (!interval.open || !interval.close) {
                        alert(`Error: Todos los campos de tiempo deben estar completos para el día ${dayNames[day]}.`);
                        return;
                    }
                    // Validar que la hora de cierre sea posterior a la de inicio
                    if (interval.open >= interval.close) {
                        alert(`Error: La hora de cierre debe ser posterior a la hora de inicio en todos los intervalos para el día ${dayNames[day]}.`);
                        return;
                    }
                }
                // Validar solapamientos
                if (!validarIntervalos(dayConfig.intervals)) {
                    alert(`Error: Se encontraron intervalos de tiempo solapados para el día ${dayNames[day]}.`);
                    return;
                }
            }
        }
        dispatch({ type: 'UPDATE_EMPLOYEE_HOURS', payload: { employeeId: employee.id, hours: employeeHours } });
        onClose();
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
                <div className="space-y-4">
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
                    <button onClick={onClose} className="btn btn-ghost text-secondary hover:bg-background">Cancelar</button>
                    <button onClick={handleSave} className="btn btn-primary">Guardar Horarios</button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeHoursEditor;