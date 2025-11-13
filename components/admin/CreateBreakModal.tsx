import React, { useState, useMemo } from 'react';
import TimelinePicker, { TimeSlot } from '../common/TimelinePicker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { createBookingSafe } from '../../services/api';
import { timeToMinutes, minutesToTime } from '../../utils/availability';

export interface CreateBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const mergeIntervals = (intervals: TimeSlot[]): TimeSlot[] => {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => timeToMinutes(a.start, 'open') - timeToMinutes(b.start, 'open'));
  const merged: TimeSlot[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (timeToMinutes(current.start, 'open') <= timeToMinutes(last.end, 'close')) {
      const lastEnd = timeToMinutes(last.end, 'close');
      const currentEnd = timeToMinutes(current.end, 'close');
      last.end = minutesToTime(Math.max(lastEnd, currentEnd));
    } else {
      merged.push(current);
    }
  }
  return merged;
};


const CreateBreakModal: React.FC<CreateBreakModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
}) => {
  const business = useBusinessState();
  const dispatch = useBusinessDispatch();

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState('');
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener horario efectivo del negocio para la fecha seleccionada
  const businessHoursForDay = useMemo(() => {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      selectedDate.getDay()
    ] as keyof typeof business.hours;
    const dayHours = business.hours[dayOfWeek];
    
    if (!dayHours.enabled || dayHours.intervals.length === 0) {
      return { start: '09:00', end: '18:00' };
    }
    
    return {
      start: dayHours.intervals[0].open,
      end: dayHours.intervals[dayHours.intervals.length - 1].close,
    };
  }, [selectedDate, business.hours]);

  // Combinar reservas de todos los empleados seleccionados
  const combinedBookings = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return [];
    
    const dateString = selectedDate.toISOString().split('T')[0];
    const allBookings: TimeSlot[] = [];
    
    for (const empId of selectedEmployeeIds) {
      const empBookings = business.bookings
        .filter(b => b.employeeId === empId && b.date === dateString && b.status !== 'cancelled')
        .map(b => ({
          start: b.start,
          end: b.end
        }));
      allBookings.push(...empBookings);
    }
    
    return mergeIntervals(allBookings);
  }, [selectedEmployeeIds, selectedDate, business.bookings]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.length === business.employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(business.employees.map(e => e.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEmployeeIds.length === 0 || !selectedTime) {
      setError("Selecciona al menos un empleado y un horario.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      
      // Crear un break para cada empleado seleccionado
      const breakPromises = selectedEmployeeIds.map(empId => 
        createBookingSafe({
          employee_id: empId,
          date: dateString,
          start_time: selectedTime.start,
          end_time: selectedTime.end,
          client_name: 'BREAK',
          client_phone: '',
          business_id: business.id,
          service_ids: [], // Sin servicios para breaks
        })
      );
      
      await Promise.all(breakPromises);
      
      // Recargar datos del negocio para reflejar los breaks
      const params = new URLSearchParams(window.location.search);
      const devMock = params.get('devMock') === '1';
      const { supabaseBackend } = await import('../../services/supabaseBackend');
      const { mockBackendTest } = await import('../../services/mockBackend.e2e');
      const backend = devMock ? mockBackendTest : supabaseBackend;
      const updatedBusiness = await backend.getBusinessData();
      await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
      
      // Limpiar y cerrar
      setSelectedEmployeeIds([]);
      setDuration(30);
      setReason('');
      setSelectedTime(null);
      
      onClose();
    } catch (err) {
      console.error('Error creating break:', err);
      setError(err instanceof Error ? err.message : "Hubo un error al crear el break.");
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
          <h2 className="text-2xl font-bold text-primary">⏸ Agregar Break / Bloqueo</h2>
          <p className="text-sm text-secondary mt-1">📅 {formatDate(selectedDate)}</p>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} id="create-break-form">
            {/* Step 1: Employee Selection */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-primary">Paso 1: ¿Para quién es el break?</h3>
              <div className="p-2 border border-default rounded-md max-h-48 overflow-y-auto bg-surface">
                <div className="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="all-employees" 
                    checked={selectedEmployeeIds.length === business.employees.length && business.employees.length > 0} 
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="all-employees" className="ml-2 font-bold text-primary">
                    {business.name || 'Todos los empleados'}
                  </label>
                </div>
                <hr className="my-2 border-default"/>
                {business.employees.map(emp => (
                  <div key={emp.id} className="flex items-center">
                    <input 
                      type="checkbox" 
                      id={'emp-' + emp.id} 
                      checked={selectedEmployeeIds.includes(emp.id)} 
                      onChange={() => handleEmployeeToggle(emp.id)}
                      className="w-4 h-4 accent-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <label htmlFor={'emp-' + emp.id} className="ml-2 text-primary">
                      {emp.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Time Selection */}
            {selectedEmployeeIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-primary">Paso 2: Seleccionar Horario</h3>
                <div className="mb-2">
                  <Input 
                    label="Duración del Break (minutos)" 
                    type="number" 
                    value={duration.toString()} 
                    onChange={e => setDuration(Number(e.target.value))} 
                    min="10" 
                    step="5" 
                  />
                </div>
                <TimelinePicker
                  date={selectedDate}
                  businessHours={businessHoursForDay}
                  existingBookings={combinedBookings}
                  selectionDuration={duration}
                  onTimeSelect={setSelectedTime}
                  onTimeClear={() => setSelectedTime(null)}
                />
              </div>
            )}
            
            {/* Step 3: Reason */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-primary">Paso 3: Motivo (Opcional)</h3>
              <Input label="Motivo del break" value={reason} onChange={e => setReason(e.target.value)} />
            </div>

            {error && <p className="text-state-danger-text text-sm mb-4">{error}</p>}
          </form>
        </div>

        {/* Footer fijo con botones */}
        <div className="p-6 border-t border-default">
          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="create-break-form" disabled={isLoading || !selectedTime || selectedEmployeeIds.length === 0}>
              {isLoading ? 'Guardando...' : 'Guardar Break'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBreakModal;