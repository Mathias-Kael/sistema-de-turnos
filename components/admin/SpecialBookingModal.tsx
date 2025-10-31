import React, { useState, useEffect, useMemo } from 'react';
import TimelinePicker, { TimeSlot } from '../common/TimelinePicker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { createBookingSafe } from '../../services/api';
import { supabaseBackend } from '../../services/supabaseBackend';
import { ClientSearchInput } from '../common/ClientSearchInput';
import { ClientFormModal } from '../common/ClientFormModal';
import { Client } from '../../types';

// Helper para convertir tiempo a minutos
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export interface SpecialBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const SpecialBookingModal: React.FC<SpecialBookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  const business = useBusinessState();
  const dispatch = useBusinessDispatch();

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  
  // Client state
  const [useExistingClient, setUseExistingClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  
  // Manual client fields (backward compatible)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  const [allowExtension, setAllowExtension] = useState(false);
  const [extendedStart, setExtendedStart] = useState('');
  const [extendedEnd, setExtendedEnd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedServices = useMemo(() => {
    return business.services.filter(s => selectedServiceIds.includes(s.id));
  }, [selectedServiceIds, business.services]);

  // Calcular duración total de los servicios seleccionados
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, service) => sum + service.duration + (service.buffer || 0), 0);
  }, [selectedServices]);

  // Filtrar empleados que pueden realizar TODOS los servicios seleccionados (intersección)
  const availableEmployees = useMemo(() => {
    if (selectedServiceIds.length === 0) return business.employees;
    
    const serviceEmployeeSets = selectedServices.map(s => new Set(s.employeeIds));
    return business.employees.filter(emp => 
      serviceEmployeeSets.every(idSet => idSet.has(emp.id))
    );
  }, [selectedServiceIds, selectedServices, business.employees]);

  // Obtener horario efectivo del negocio para la fecha seleccionada
  const businessHoursForDay = useMemo(() => {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      selectedDate.getDay()
    ] as keyof typeof business.hours;
    const dayHours = business.hours[dayOfWeek];
    
    if (!dayHours.enabled || dayHours.intervals.length === 0) {
      return { start: '09:00', end: '18:00' }; // Fallback
    }
    
    // Usar el primer intervalo como referencia
    return {
      start: dayHours.intervals[0].open,
      end: dayHours.intervals[dayHours.intervals.length - 1].close,
    };
  }, [selectedDate, business.hours]);

  // Obtener reservas existentes del empleado para la fecha seleccionada
  const existingBookings = useMemo((): TimeSlot[] => {
    if (!employeeId) return [];
    
    const dateString = selectedDate.toISOString().split('T')[0];
    return business.bookings
      .filter(b => b.employeeId === employeeId && b.date === dateString && b.status !== 'cancelled')
      .map(b => ({ start: b.start, end: b.end }));
  }, [employeeId, selectedDate, business.bookings]);

  // Inicializar horarios extendidos cuando se selecciona empleado
  useEffect(() => {
    if (employeeId) {
      setExtendedStart(businessHoursForDay.start);
      setExtendedEnd(businessHoursForDay.end);
    }
  }, [employeeId, businessHoursForDay]);

  // Resetear empleado seleccionado si no está disponible para los nuevos servicios
  useEffect(() => {
    if (selectedServiceIds.length > 0 && employeeId) {
      const isEmployeeAvailable = availableEmployees.some(emp => emp.id === employeeId);
      if (!isEmployeeAvailable) {
        setEmployeeId(null);
        setSelectedTime(null);
      }
    }
  }, [selectedServiceIds, employeeId, availableEmployees]);

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setSelectedTime(timeSlot);
    setError(null);
  };

  const handleTimeClear = () => {
    setSelectedTime(null);
  };

  // Client handlers
  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setClientName(client.name);
      setClientPhone(client.phone);
      setClientEmail(client.email || '');
    }
  };

  const handleCreateNewClient = () => {
    setShowClientForm(true);
  };

  const handleClientSaved = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone);
    setClientEmail(client.email || '');
    setUseExistingClient(true);
    setShowClientForm(false);
  };

  // Validation helper
  const isClientDataValid = () => {
    return clientName.trim().length > 0 && clientPhone.trim().length >= 8;
  };

  // Handle "Save & Add to Clients" button
  const handleSaveAndAddToClients = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow if already using existing client
    if (useExistingClient && selectedClient) {
      alert("Este cliente ya está registrado. Solo usa 'Guardar Reserva'.");
      return;
    }

    // Validate client data
    if (!isClientDataValid()) {
      alert("Por favor ingresa nombre y teléfono válidos para guardar el cliente.");
      return;
    }

    // Validate booking data
    if (!employeeId || !selectedTime || selectedServiceIds.length === 0) {
      alert("Por favor completa todos los campos de la reserva.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create the client first
      const newClient = await supabaseBackend.createClient({
        business_id: business.id,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || undefined,
      });

      // 2. Create the booking with client reference
      const dateString = selectedDate.toISOString().split('T')[0];
      
      await createBookingSafe({
        employee_id: employeeId,
        date: dateString,
        start_time: selectedTime.start,
        end_time: selectedTime.end,
        client_name: newClient.name,
        client_phone: newClient.phone,
        business_id: business.id,
        service_ids: selectedServiceIds,
      });

      // Reload business data
      const params = new URLSearchParams(window.location.search);
      const devMock = params.get('devMock') === '1';
      const { mockBackendTest } = await import('../../services/mockBackend.e2e');
      const backend = devMock ? mockBackendTest : supabaseBackend;
      const updatedBusiness = await backend.getBusinessData();
      await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
      
      // Reset and close
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error creating booking with client:', err);
      setError(err instanceof Error ? err.message : "Hubo un error al crear la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedServiceIds([]);
    setEmployeeId(null);
    setSelectedTime(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setSelectedClient(null);
    setUseExistingClient(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedServiceIds.length === 0 || !employeeId || !selectedTime || !clientName.trim()) {
      setError("Por favor, completa todos los campos requeridos.");
      return;
    }

    // Validar extensión de horario si está activa
    if (allowExtension) {
      const extStart = timeToMinutes(extendedStart);
      const extEnd = timeToMinutes(extendedEnd);
      const bizStart = timeToMinutes(businessHoursForDay.start);
      const bizEnd = timeToMinutes(businessHoursForDay.end);
      
      if (extStart >= extEnd) {
        setError('El horario de cierre debe ser posterior al de apertura');
        return;
      }
      
      if (extStart > bizStart || extEnd < bizEnd) {
        setError('No puedes reducir el horario base del negocio');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      
      await createBookingSafe({
        employee_id: employeeId,
        date: dateString,
        start_time: selectedTime.start,
        end_time: selectedTime.end,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || '',
        business_id: business.id,
        service_ids: selectedServiceIds,
      });

      // Recargar datos del negocio para reflejar la nueva reserva
      const params = new URLSearchParams(window.location.search);
      const devMock = params.get('devMock') === '1';
      const { supabaseBackend } = await import('../../services/supabaseBackend');
      const { mockBackendTest } = await import('../../services/mockBackend.e2e');
      const backend = devMock ? mockBackendTest : supabaseBackend;
      const updatedBusiness = await backend.getBusinessData();
      await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
      
      // Cerrar modal y limpiar form
      resetForm();
      
      onClose();
    } catch (err) {
      console.error('Error creating special booking:', err);
      setError(err instanceof Error ? err.message : "Hubo un error al crear la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Formatear fecha en español con día de semana
  const formatDate = (date: Date): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header fijo */}
        <div className="p-6 border-b border-default">
          <h2 className="text-2xl font-bold text-primary">★ Nueva Reserva Especial</h2>
          <p className="text-sm text-secondary mt-1">📅 {formatDate(selectedDate)}</p>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} id="special-booking-form">
            {/* Step 1: Booking Details */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-primary">Paso 1: Seleccionar Servicios</h3>
              
              {/* Service Selection - Botones multi-select */}
              <div className="border border-default p-4 rounded-md bg-surface">
                {business.services.length === 0 ? (
                  <p className="text-secondary text-sm">No hay servicios disponibles</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {business.services.map(service => {
                      const isSelected = selectedServiceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedServiceIds(prev => prev.filter(id => id !== service.id));
                            } else {
                              setSelectedServiceIds(prev => [...prev, service.id]);
                            }
                            // Reset empleado y tiempo cuando cambian servicios
                            setEmployeeId(null);
                            setSelectedTime(null);
                          }}
                          className={`px-3 py-2 border border-default rounded-full text-sm cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary text-brand-text' 
                              : 'bg-background text-primary hover:bg-surface-hover'
                          }`}
                        >
                          {service.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedServices.length > 0 && (
                <div className="mt-2 p-2 bg-primary/10 rounded text-sm text-primary">
                  <strong>Duración total:</strong> {totalDuration} minutos ({selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''})
                </div>
              )}
            </div>

            {/* Step 2: Employee Selection */}
            {selectedServiceIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-primary">Paso 2: Seleccionar Empleado</h3>
                
                {availableEmployees.length === 0 ? (
                  <div className="p-4 border border-state-warning-bg rounded-md bg-state-warning-bg/20">
                    <p className="text-state-warning-text text-sm">
                      ⚠️ No hay empleados que puedan realizar todos los servicios seleccionados. 
                      Por favor, ajusta tu selección de servicios.
                    </p>
                  </div>
                ) : (
                  <select 
                    id="employee" 
                    value={employeeId ?? ''} 
                    onChange={e => setEmployeeId(e.target.value)} 
                    className="w-full p-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="" disabled>Selecciona un empleado capacitado</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

          {/* Step 3: Time Selection */}
          {selectedServiceIds.length > 0 && employeeId && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-primary">Paso 3: Seleccionar Horario</h3>
              
              {/* Toggle de extensión de horario */}
              <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowExtension}
                    onChange={(e) => {
                      setAllowExtension(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedTime(null);
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-medium text-primary">
                    Extender horario de atención este día
                  </span>
                </label>
                <p className="text-xs text-secondary mt-1 ml-6">
                  Permite agendar fuera del horario normal (solo para esta reserva)
                </p>
              </div>

              {/* Slider de rango (condicional) */}
              {allowExtension && (
                <div className="mb-4 p-4 bg-surface rounded-lg border border-default">
                  <label className="block text-sm font-medium text-primary mb-3">
                    📅 Horario extendido para este día:
                  </label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="text-xs text-secondary block mb-1">Apertura:</label>
                      <input
                        type="time"
                        value={extendedStart}
                        onChange={(e) => {
                          setExtendedStart(e.target.value);
                          setSelectedTime(null);
                        }}
                        className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <span className="text-secondary font-bold text-xl">→</span>
                    <div className="flex-1">
                      <label className="text-xs text-secondary block mb-1">Cierre:</label>
                      <input
                        type="time"
                        value={extendedEnd}
                        onChange={(e) => {
                          setExtendedEnd(e.target.value);
                          setSelectedTime(null);
                        }}
                        className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-state-warning-bg/20 border border-state-warning-bg rounded">
                    <p className="text-xs text-state-warning-text flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <span>
                        <strong>Importante:</strong> Este cambio solo aplica para esta reserva específica. 
                        No modifica el horario general del negocio.
                      </span>
                    </p>
                  </div>
                </div>
              )}
              
              <TimelinePicker
                date={selectedDate}
                businessHours={businessHoursForDay}
                existingBookings={existingBookings}
                selectionDuration={totalDuration}
                onTimeSelect={handleTimeSelect}
                onTimeClear={handleTimeClear}
                allowBusinessHoursExtension={allowExtension}
                extendedHours={allowExtension ? {
                  start: extendedStart,
                  end: extendedEnd
                } : undefined}
                onBusinessHoursChange={(newHours) => {
                  setExtendedStart(newHours.start);
                  setExtendedEnd(newHours.end);
                }}
              />
            </div>
          )}

          {/* Step 4: Client Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-primary">Paso 4: Datos del Cliente</h3>
            
            {/* Toggle: Cliente existente / Manual */}
            <div className="mb-4 flex items-center gap-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExistingClient}
                  onChange={(e) => {
                    setUseExistingClient(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedClient(null);
                      setClientName('');
                      setClientPhone('');
                      setClientEmail('');
                    }
                  }}
                  className="mr-2 h-4 w-4 text-primary focus:ring-primary/50 border-default rounded"
                />
                <span className="text-sm text-primary">Buscar cliente existente</span>
              </label>
            </div>

            {useExistingClient ? (
              /* Cliente Search Input */
              <ClientSearchInput
                businessId={business.id}
                onClientSelect={handleClientSelect}
                onCreateNewClient={handleCreateNewClient}
              />
            ) : (
              /* Campos manuales (backward compatible) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre del Cliente" value={clientName} onChange={e => setClientName(e.target.value)} required />
                <Input label="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                <Input label="Email (opcional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" />
                <Input label="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            )}
          </div>

          {error && <p className="text-state-danger-text text-sm mb-4">{error}</p>}
          </form>
        </div>

        {/* Footer fijo con botones */}
        <div className="p-6 border-t border-default">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            
            {/* Show "Add to Clients" button only when NOT using existing client */}
            {!useExistingClient && (
              <Button 
                type="button"
                variant="ghost"
                onClick={handleSaveAndAddToClients}
                disabled={isLoading || !selectedTime || !isClientDataValid()}
                className="border border-primary"
              >
                📋 Añadir a Clientes
              </Button>
            )}
            
            <Button type="submit" form="special-booking-form" disabled={isLoading || !selectedTime}>
              {isLoading ? 'Guardando...' : 'Guardar Reserva'}
            </Button>
          </div>
        </div>
      </div>

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientFormModal
          businessId={business.id}
          onClose={() => setShowClientForm(false)}
          onSave={handleClientSaved}
          initialName={clientName}
        />
      )}
    </div>
  );
};

export default SpecialBookingModal;