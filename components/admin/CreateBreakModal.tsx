import React, { useState, useMemo } from 'react';
import TimelinePicker, { TimeSlot } from '../common/TimelinePicker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { createBookingSafe } from '../../services/api';

export interface CreateBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const mergeIntervals = (intervals: TimeSlot[]): TimeSlot[] => {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const merged: TimeSlot[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (timeToMinutes(current.start) <= timeToMinutes(last.end)) {
      const lastEnd = timeToMinutes(last.end);
      const currentEnd = timeToMinutes(current.end);
      last.end = minutesToTime(Math.max(lastEnd, currentEnd));
    } else {
      merged.push(current);
    }
  }
  return merged;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return h + ':' + m;
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
        .map(b => ({ start: b.start, end: b.end }));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-4">⏸ Agregar Break / Bloqueo</h2>

          {/* Step 1: Employee Selection */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Paso 1: ¿Para quién es el break?</h3>
            <div className="p-2 border border-gray-300 rounded-md max-h-48 overflow-y-auto">
              <div className="flex items-center mb-2">
                <input 
                  type="checkbox" 
                  id="all-employees" 
                  checked={selectedEmployeeIds.length === business.employees.length && business.employees.length > 0} 
                  onChange={handleSelectAll} 
                />
                <label htmlFor="all-employees" className="ml-2 font-bold">
                  {business.name || 'Todos los empleados'}
                </label>
              </div>
              <hr className="my-2"/>
              {business.employees.map(emp => (
                <div key={emp.id} className="flex items-center">
                  <input 
                    type="checkbox" 
                    id={'emp-' + emp.id} 
                    checked={selectedEmployeeIds.includes(emp.id)} 
                    onChange={() => handleEmployeeToggle(emp.id)} 
                  />
                  <label htmlFor={'emp-' + emp.id} className="ml-2">
                    {emp.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Time Selection */}
          {selectedEmployeeIds.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Paso 2: Seleccionar Horario</h3>
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
            <h3 className="text-lg font-semibold mb-2">Paso 3: Motivo (Opcional)</h3>
            <Input label="Motivo del break" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !selectedTime || selectedEmployeeIds.length === 0}>
              {isLoading ? 'Guardando...' : 'Guardar Break'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBreakModal;