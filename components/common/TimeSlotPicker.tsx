import React, { useState, useEffect } from 'react';
import { Service } from '../../types';
import { getAvailableSlots } from '../../services/api';
import { useBusinessState } from '../../context/BusinessContext';

interface TimeSlotPickerProps {
    date: Date;
    selectedServices: Service[];
    selectedEmployeeId: string | 'any' | null;
    onSlotSelect: (slot: string) => void;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ date, selectedServices, selectedEmployeeId, onSlotSelect }) => {
    const { hours, ...business } = useBusinessState();
    const [slots, setSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedServices.length === 0 || !selectedEmployeeId) {
            setSlots([]);
            return;
        }

        const fetchSlots = async () => {
            setLoading(true);
            setError(null);
            try {
                const availableSlots = await getAvailableSlots(date, selectedServices, { ...business, hours }, selectedEmployeeId);
                setSlots(availableSlots);
            } catch (err) {
                setError('No se pudieron cargar los horarios. Inténtalo de nuevo.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSlots();
    }, [date, selectedServices, hours, selectedEmployeeId]); // Añadido selectedEmployeeId a las dependencias

    const renderContent = () => {
        if (selectedServices.length === 0) {
            return <p className="text-center text-gray-500">Selecciona un servicio para ver los horarios.</p>;
        }
        if (!selectedEmployeeId) {
             return <p className="text-center text-gray-500">Selecciona un empleado para continuar.</p>;
        }

        if (loading) {
            return <p className="text-center text-gray-500">Buscando horarios...</p>;
        }

        if (error) {
            return <p className="text-center text-red-500">{error}</p>;
        }

        if (slots.length === 0) {
            return <p className="text-center text-gray-500">No hay horarios disponibles para este día.</p>;
        }

        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(slot => (
                    <button
                        key={slot}
                        onClick={() => onSlotSelect(slot)}
                        className="p-2 border border-primary text-primary rounded-md text-center transition-colors duration-200 hover-bg-primary"
                    >
                        {slot}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-brand">Elige un horario</h2>
            {renderContent()}
        </div>
    );
};