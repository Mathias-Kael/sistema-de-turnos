import React, { useState, useMemo } from 'react';
import { Service, Employee } from '../../types';
import { useBusinessState } from '../../context/BusinessContext';
import { Header } from '../common/Header';
import { ServiceSelector } from '../common/ServiceSelector';
import { EmployeeSelector } from '../common/EmployeeSelector'; // Nuevo componente
import { Calendar } from '../common/Calendar';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ClientView: React.FC = () => {
    const business = useBusinessState();
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'any' | null>(null);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [selectedDate, setSelectedDate] = useState(today);
    
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    const handleServiceChange = (service: Service) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.id === service.id);
            if (isSelected) {
                return prev.filter(s => s.id !== service.id);
            } else {
                return [...prev, service];
            }
        });
        // Resetear selecciones posteriores
        setSelectedEmployeeId(null);
        setSelectedSlot(null);
    };

    // Calcular empleados elegibles basados en los servicios
    const eligibleEmployees = useMemo((): Employee[] => {
        if (selectedServices.length === 0) return [];

        const serviceEmployeeSets = selectedServices.map(s => new Set(s.employeeIds));
        
        return business.employees.filter(emp => {
             return serviceEmployeeSets.every(idSet => idSet.size === 0 || idSet.has(emp.id));
        });

    }, [selectedServices, business.employees]);


    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
    };

    const handleSlotSelect = (slot: string) => {
        setSelectedSlot(slot);
    };
    
    const handleCloseModal = () => {
        setSelectedSlot(null);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <Header />

            <div className="max-w-4xl mx-auto mt-8 space-y-8">
                {/* Step 1: Service Selection */}
                <section>
                    <ServiceSelector
                        selectedServices={selectedServices}
                        onServiceChange={handleServiceChange}
                    />
                </section>

                {/* Step 2: Employee Selection (Nuevo) */}
                {selectedServices.length > 0 && (
                    <section>
                         <EmployeeSelector
                            employees={eligibleEmployees}
                            selectedEmployeeId={selectedEmployeeId}
                            onSelectEmployee={setSelectedEmployeeId}
                        />
                    </section>
                )}
                
                {/* Steps 3 & 4: Date and Time */}
                {selectedEmployeeId && (
                    <section>
                        <h2 className="text-2xl font-bold my-4 text-primary">Elige fecha y hora</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <Calendar
                                selectedDate={selectedDate}
                                onDateChange={handleDateChange}
                            />
                            <TimeSlotPicker
                                date={selectedDate}
                                selectedServices={selectedServices}
                                selectedEmployeeId={selectedEmployeeId}
                                onSlotSelect={handleSlotSelect}
                            />
                        </div>
                    </section>
                )}
            </div>

            {/* FIX: Pass the selectedEmployeeId to the confirmation modal and ensure it's not null. */}
            {selectedSlot && selectedEmployeeId && (
                <ConfirmationModal
                    date={selectedDate}
                    slot={selectedSlot}
                    selectedServices={selectedServices}
                    employeeId={selectedEmployeeId}
                    business={business}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};