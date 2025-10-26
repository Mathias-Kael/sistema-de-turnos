import { DayHours, Employee } from '../types';

/**
 * Determina el horario laboral efectivo para un empleado en un día específico.
 * Devuelve el horario personal del empleado si está activado; de lo contrario,
 * devuelve el horario general del negocio.
 *
 * @param employee El empleado para el cual se determinan los horarios.
 * @param businessHoursForDay El horario del negocio para el día especificado.
 * @param dayOfWeek El día de la semana (ej. 'monday').
 * @returns El objeto DayHours efectivo o null si no hay horario aplicable.
 */
export const getEffectiveDayHours = (
    employee: Employee,
    businessHoursForDay: DayHours,
    dayOfWeek: keyof Employee['hours']
): DayHours | null => {
    const employeeHoursForDay = employee.hours?.[dayOfWeek];
    const effectiveHours = (employeeHoursForDay && employeeHoursForDay.enabled)
        ? employeeHoursForDay
        : businessHoursForDay;

    if (!effectiveHours || !effectiveHours.enabled || effectiveHours.intervals.length === 0) {
        return null;
    }

    return effectiveHours;
};


/**
 * Representa una reserva existente. La fecha no se usa en el cálculo
 * de disponibilidad de un día específico, pero es útil para filtrar
 * las reservas antes de llamar a la función de cálculo.
 */
export interface ReservaOcupada {
    date: string;
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
}

// Interfaz para los parámetros de la función de cálculo
interface CalcularTurnosParams {
    fecha: Date;
    duracionTotal: number; // en minutos
    horarioDelDia: DayHours;
    reservasOcupadas: { start: string; end: string }[];
}

/**
 * Convierte una hora en formato "HH:mm" a minutos desde la medianoche.
 * @param timeStr La hora en formato "HH:mm".
 * @returns El número de minutos desde la medianoche.
 */
export const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Convierte minutos desde la medianoche a una hora en formato "HH:mm".
 * @param totalMinutes Los minutos desde la medianoche.
 * @returns La hora formateada como "HH:mm".
 */
export const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

function calcularHuecosLibres(
  intervalo: { start: number; end: number },
  reservas: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  // Ordenar reservas por start_time (CRÍTICO)
  const reservasOrdenadas = [...reservas]
    .sort((a, b) => a.start - b.start);
  
  const huecos: Array<{ start: number; end: number }> = [];
  let proximoDisponible = intervalo.start;
  
  // Filtrar solo reservas que intersectan con este intervalo
  const reservasRelevantes = reservasOrdenadas.filter(
    r => r.end > intervalo.start && r.start < intervalo.end
  );
  
  // Calcular gaps entre reservas
  for (const reserva of reservasRelevantes) {
    if (reserva.start > proximoDisponible) {
      huecos.push({
        start: proximoDisponible,
        end: Math.min(reserva.start, intervalo.end)
      });
    }
    proximoDisponible = Math.max(proximoDisponible, reserva.end);
  }
  
  // Gap final hasta cierre
  if (proximoDisponible < intervalo.end) {
    huecos.push({ start: proximoDisponible, end: intervalo.end });
  }
  
  return huecos;
}

/**
 * Calcula los turnos disponibles para un día específico, considerando los
 * horarios de apertura, la duración del servicio y las reservas existentes.
 *
 * @param params Objeto con los parámetros necesarios para el cálculo.
 * @returns Un array de strings con los horarios de inicio de los turnos disponibles.
 */
export const calcularTurnosDisponibles = ({
    fecha,
    duracionTotal,
    horarioDelDia,
    reservasOcupadas,
}: CalcularTurnosParams): string[] => {
    if (!horarioDelDia.enabled || duracionTotal <= 0) {
        return [];
    }

    const reservasEnMinutos = reservasOcupadas.map(r => ({
        start: timeToMinutes(r.start),
        end: timeToMinutes(r.end)
    }));

    const turnosDisponibles: string[] = [];

    // Iterar sobre cada intervalo de trabajo del día (ej: mañana y tarde)
    horarioDelDia.intervals.forEach(intervalo => {
        const inicioIntervalo = timeToMinutes(intervalo.open);
        const finIntervalo = timeToMinutes(intervalo.close);

        const huecos = calcularHuecosLibres(
            { start: inicioIntervalo, end: finIntervalo },
            reservasEnMinutos
        );

        for (const hueco of huecos) {
            let minutoActual = hueco.start;

            while (minutoActual + duracionTotal <= hueco.end) {
                turnosDisponibles.push(minutesToTime(minutoActual));
                minutoActual += duracionTotal;
            }
        }
    });

    // Filtrado (AL FINAL, antes de return)
    const esFechaHoy = fecha.toDateString() === new Date().toDateString();

    if (esFechaHoy) {
        const ahora = new Date();
        const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
        
        return turnosDisponibles.filter(turno => {
            const minutoTurno = timeToMinutes(turno);
            return minutoTurno >= minutoActual;
        });
    }

    return turnosDisponibles;
};

/**
 * Valida si hay solapamiento entre un conjunto de intervalos de tiempo.
 * @param intervals Array de objetos { open: "HH:mm", close: "HH:mm" }.
 * @returns `true` si no hay solapamientos, `false` si los hay.
 */
export const validarIntervalos = (intervals: { open: string; close: string }[]): boolean => {
    if (intervals.length <= 1) {
        return true;
    }

    // Convertir a minutos y ordenar por hora de inicio
    const intervalosEnMinutos = intervals.map(interval => ({
        start: timeToMinutes(interval.open),
        end: timeToMinutes(interval.close),
    })).sort((a, b) => a.start - b.start);

    // Verificar solapamientos
    for (let i = 0; i < intervalosEnMinutos.length - 1; i++) {
        const current = intervalosEnMinutos[i];
        const next = intervalosEnMinutos[i + 1];

        // Si el fin del intervalo actual es después del inicio del siguiente, hay solapamiento
        if (current.end > next.start) {
            return false;
        }
    }

    return true;
};