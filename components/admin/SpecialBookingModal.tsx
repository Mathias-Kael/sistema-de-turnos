import React, { useState, useEffect, useMemo } from 'react';
import TimelinePicker, { TimeSlot } from '../common/TimelinePicker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { createBookingSafe } from '../../services/api';

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

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  const [allowExtension, setAllowExtension] = useState(false);
  const [extendedStart, setExtendedStart] = useState('');
  const [extendedEnd, setExtendedEnd] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => {
    return business.services.find(s => s.id === serviceId);
  }, [serviceId, business.services]);

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

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setSelectedTime(timeSlot);
    setError(null);
  };

  const handleTimeClear = () => {
    setSelectedTime(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceId || !employeeId || !selectedTime || !clientName.trim()) {
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
        service_ids: [serviceId],
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
      setServiceId(null);
      setEmployeeId(null);
      setSelectedTime(null);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setNotes('');
      
      onClose();
    } catch (err) {
      console.error('Error creating special booking:', err);
      setError(err instanceof Error ? err.message : "Hubo un error al crear la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-4">★ Nueva Reserva Especial</h2>
          
          {/* Step 1: Booking Details */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Paso 1: Detalles de la Reserva</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-gray-700">Servicio</label>
                <select 
                  id="service" 
                  value={serviceId ?? ''} 
                  onChange={e => setServiceId(e.target.value)} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="" disabled>Selecciona un servicio</option>
                  {business.services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Empleado</label>
                <select 
                  id="employee" 
                  value={employeeId ?? ''} 
                  onChange={e => setEmployeeId(e.target.value)} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="" disabled>Selecciona un empleado</option>
                  {business.employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Time Selection */}
          {serviceId && employeeId && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Paso 2: Seleccionar Horario</h3>
              
              {/* Toggle de extensión de horario */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowExtension}
                    onChange={(e) => {
                      setAllowExtension(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedTime(null); // Limpiar selección al desactivar
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-medium text-blue-900">
                    Extender horario de atención este día
                  </span>
                </label>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  Permite agendar fuera del horario normal (solo para esta reserva)
                </p>
              </div>

              {/* Slider de rango (condicional) */}
              {allowExtension && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-300">
                  <label className="block text-sm font-medium text-slate-900 mb-3">
                    📅 Horario extendido para este día:
                  </label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="text-xs text-slate-600 block mb-1">Apertura:</label>
                      <input
                        type="time"
                        value={extendedStart}
                        onChange={(e) => {
                          setExtendedStart(e.target.value);
                          setSelectedTime(null); // Limpiar selección al cambiar horario
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-slate-400 font-bold text-xl">→</span>
                    <div className="flex-1">
                      <label className="text-xs text-slate-600 block mb-1">Cierre:</label>
                      <input
                        type="time"
                        value={extendedEnd}
                        onChange={(e) => {
                          setExtendedEnd(e.target.value);
                          setSelectedTime(null); // Limpiar selección al cambiar horario
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
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
                selectionDuration={selectedService?.duration || 30}
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

          {/* Step 3: Client Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Paso 3: Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre del Cliente" value={clientName} onChange={e => setClientName(e.target.value)} required />
                <Input label="Teléfono" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                <Input label="Email (opcional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" />
                <Input label="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !selectedTime}>
              {isLoading ? 'Guardando...' : 'Guardar Reserva'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpecialBookingModal;