import React, { useState, useMemo, useEffect } from 'react';
import { Business, Service, Employee } from '../../types';
import { ServiceSelector } from '../common/ServiceSelector';
import { EmployeeSelector } from '../common/EmployeeSelector';
import { Calendar } from '../common/Calendar';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { StyleInjector } from '../common/StyleInjector';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { HeroSection } from '../common/HeroSection';
import { AutoAssignedEmployeeBanner } from '../common/AutoAssignedEmployeeBanner';

export interface ClientBookingExperienceProps {
  business: Business;
  mode: 'public' | 'admin';
  publicToken?: string;
}

/**
 * UI principal de reserva. No conoce de context ni de token.
 */
export const ClientBookingExperience: React.FC<ClientBookingExperienceProps> = ({ business, mode, publicToken }) => {
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'any' | null>(null);
  const [wasAutoAssigned, setWasAutoAssigned] = useState(false);
  const today = new Date();
  today.setHours(0,0,0,0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleServiceChange = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
    setSelectedEmployeeId(null);
    setSelectedSlot(null);
  };

  const eligibleEmployees = useMemo((): Employee[] => {
    if (selectedServices.length === 0) return [];
    const serviceEmployeeSets = selectedServices.map(s => new Set(s.employeeIds));
    return business.employees.filter(emp => {
      return serviceEmployeeSets.every(idSet => idSet.size === 0 || idSet.has(emp.id));
    });
  }, [selectedServices, business.employees]);

  useEffect(() => {
    // Auto-seleccionar si solo hay un empleado elegible
    if (eligibleEmployees.length === 1 && selectedEmployeeId !== eligibleEmployees[0].id) {
      setSelectedEmployeeId(eligibleEmployees[0].id);
      setWasAutoAssigned(true);
    }
    // Si el negocio es unipersonal desde el inicio, tratarlo como auto-asignado
    if (business.employees.length === 1 && selectedEmployeeId !== business.employees[0].id) {
        setSelectedEmployeeId(business.employees[0].id);
        setWasAutoAssigned(true);
    }
  }, [eligibleEmployees, business.employees, selectedEmployeeId]);

  const handleEmployeeSelect = (id: string | 'any' | null) => {
    setSelectedEmployeeId(id);
    setWasAutoAssigned(false);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen bg-background text-primary">
      {/* Inyectar estilos sólo una vez si estamos en modo público y no hay provider externo */}
  {mode === 'public' && <StyleInjector brandingOverride={business.branding} />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <HeroSection business={business} />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <section>
          <ServiceSelector
            selectedServices={selectedServices}
            onServiceChange={handleServiceChange}
            services={business.services}
            categories={business.categories}
          />
        </section>
        {selectedServices.length > 0 && eligibleEmployees.length === 0 && (
           <div className="p-4 border border-default rounded-lg bg-[color:var(--color-state-warning-bg)] text-[color:var(--color-state-warning-text)]">
               <p className="text-[color:var(--color-state-warning-text)]">No hay un único empleado que pueda realizar todos los servicios seleccionados. Por favor, ajusta tu selección.</p>
           </div>
        )}
        {selectedServices.length > 0 && eligibleEmployees.length > 1 && (
          <section>
            <EmployeeSelector
              employees={eligibleEmployees}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={handleEmployeeSelect}
            />
          </section>
        )}
        {selectedEmployeeId && (
          <section>
            <h2 className="text-2xl font-bold my-4 text-primary">Elige fecha y hora</h2>
            {(wasAutoAssigned || business.employees.length === 1) && selectedEmployeeId && selectedEmployeeId !== 'any' && (
               <AutoAssignedEmployeeBanner employee={business.employees.find(e => e.id === selectedEmployeeId)!} business={business} />
             )}
            <div className="grid md:grid-cols-2 gap-8">
              <Calendar selectedDate={selectedDate} onDateChange={handleDateChange} />
              <TimeSlotPicker
                date={selectedDate}
                selectedServices={selectedServices}
                selectedEmployeeId={selectedEmployeeId}
                onSlotSelect={setSelectedSlot}
                business={business}
              />
            </div>
          </section>
        )}
      </div>
      {selectedSlot && selectedEmployeeId && (
        <ConfirmationModal
          date={selectedDate}
            slot={selectedSlot}
            selectedServices={selectedServices}
            employeeId={selectedEmployeeId}
            business={business}
            publicToken={publicToken}
            onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
};
