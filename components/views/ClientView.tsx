import React, { useState, useMemo, useEffect } from 'react';
import { Service, Employee, Business } from '../../types';
import { useBusinessState } from '../../context/BusinessContext';
import { ServiceSelector } from '../common/ServiceSelector';
import { EmployeeSelector } from '../common/EmployeeSelector';
import { Calendar } from '../common/Calendar';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { HeroSection } from '../common/HeroSection';
import { mockBackend } from '../../services/mockBackend';

// ClientView ahora puede operar en dos modos:
// 1. Modo contexto (admin previsualizando) -> usa BusinessContext
// 2. Modo token público -> carga business via mockBackend.getBusinessByToken
export const ClientView: React.FC = () => {
    const contextBusiness = useBusinessState();
    const [businessData, setBusinessData] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        // Si no hay token, asumimos modo contexto (vista interna admin)
        if (!token) {
            setBusinessData(contextBusiness);
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const biz = await mockBackend.getBusinessByToken(token);
                if (cancelled) return;
                if (!biz) {
                    setError('Link inválido o expirado');
                    setBusinessData(null);
                } else {
                    setBusinessData(biz);
                }
            } catch (e) {
                if (!cancelled) setError('Error cargando datos');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [contextBusiness]);

    const business = businessData || contextBusiness;
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-secondary">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error || !businessData) {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        // Si había token y falló, mostrar error; si no había token estamos en modo contexto y no debería caer aquí.
        if (token) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center p-6">
                        <p className="text-red-500 text-lg">{error || 'Link inválido'}</p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="min-h-screen bg-background text-primary">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <HeroSection business={business} />
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
                {/* Step 1: Service Selection */}
                <section>
                    <ServiceSelector
                        selectedServices={selectedServices}
                        onServiceChange={handleServiceChange}
                        servicesOverride={business.services}
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
                                businessOverride={business}
                            />
                        </div>
                    </section>
                )}
            </div>

            {/* FIX: Pass the selectedEmployeeId to the confirmation modal and ensure it's not null. */}
            {selectedSlot && selectedEmployeeId && business && (
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