import { DayHours, Employee, Interval, Hours } from '../types';

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
    midnightModeEnabled?: boolean; // Toggle de modo medianoche (default: false para backward compatibility)
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

/**
 * Detecta si un intervalo de horario cruza medianoche (lógica básica).
 * Un horario cruza medianoche cuando start_time > end_time (ej: 22:00 - 02:00)
 *
 * @param interval El intervalo con open (inicio) y close (fin) en formato "HH:mm"
 * @returns true si el horario cruza medianoche, false en caso contrario
 */
export const detectsCrossesMidnight = (interval: Interval): boolean => {
    const startMinutes = timeToMinutes(interval.open);
    const endMinutes = timeToMinutes(interval.close);
    return startMinutes > endMinutes;
};

/**
 * Determina si se debe aplicar la lógica especial de medianoche.
 * Esta es la función clave que implementa el isolation total:
 * - Solo negocios con toggle ON usan la lógica especial
 * - Diferencia entre cierre a medianoche (20:00-00:00) y cruce de medianoche (22:00-02:00)
 *
 * @param interval El intervalo a evaluar
 * @param midnightModeEnabled El toggle de modo medianoche del negocio
 * @returns true si se debe usar la lógica especial de medianoche
 */
export const needsMidnightLogic = (interval: Interval, midnightModeEnabled: boolean): boolean => {
    // Si el toggle está desactivado, NUNCA usar lógica medianoche
    if (!midnightModeEnabled) {
        return false;
    }

    // Si el cierre es exactamente medianoche (00:00), NO es cruce de medianoche
    if (interval.close === '00:00') {
        return false;
    }

    // Si open > close (ej: 22:00 > 02:00), ES cruce de medianoche
    return detectsCrossesMidnight(interval);
};

/**
 * Detecta si algún intervalo en los horarios de un día cruza medianoche.
 *
 * @param dayHours Los horarios de un día específico
 * @returns true si algún intervalo cruza medianoche, false en caso contrario
 */
export const dayHoursCrossesMidnight = (dayHours: DayHours): boolean => {
    if (!dayHours.enabled || dayHours.intervals.length === 0) {
        return false;
    }
    return dayHours.intervals.some(interval => detectsCrossesMidnight(interval));
};

/**
 * Detecta si algún horario en una semana completa cruza medianoche.
 *
 * @param hours Los horarios de toda la semana
 * @returns true si algún día tiene un horario que cruza medianoche
 */
export const weekHoursCrossesMidnight = (hours: Hours): boolean => {
    const days: (keyof Hours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.some(day => dayHoursCrossesMidnight(hours[day]));
};

/**
 * Calcula las horas totales de un intervalo que cruza medianoche.
 * Por ejemplo: 22:00 - 02:00 = 4 horas (22:00-00:00 + 00:00-02:00)
 *
 * @param interval El intervalo con open y close
 * @returns El número de horas totales
 */
export const calculateMidnightCrossingHours = (interval: Interval): number => {
    if (!detectsCrossesMidnight(interval)) {
        // Horario normal
        const startMinutes = timeToMinutes(interval.open);
        const endMinutes = timeToMinutes(interval.close);
        return (endMinutes - startMinutes) / 60;
    }

    // Horario que cruza medianoche
    const startMinutes = timeToMinutes(interval.open);
    const endMinutes = timeToMinutes(interval.close);
    const minutesUntilMidnight = (24 * 60) - startMinutes; // Minutos desde start hasta 00:00
    const minutesAfterMidnight = endMinutes; // Minutos desde 00:00 hasta end
    const totalMinutes = minutesUntilMidnight + minutesAfterMidnight;
    return totalMinutes / 60;
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
 * Divide un intervalo que cruza medianoche en dos segmentos separados.
 * Ejemplo: {open: "22:00", close: "02:00"} -> [{open: "22:00", close: "23:59"}, {open: "00:00", close: "02:00"}]
 *
 * @param interval El intervalo que cruza medianoche
 * @returns Array con dos intervalos: antes y después de medianoche
 */
const splitMidnightInterval = (interval: Interval): { before: { start: number; end: number }, after: { start: number; end: number } } => {
    const startMinutes = timeToMinutes(interval.open);
    const endMinutes = timeToMinutes(interval.close);

    return {
        before: { start: startMinutes, end: 24 * 60 }, // Hasta medianoche (1440 minutos)
        after: { start: 0, end: endMinutes } // Desde medianoche hasta el cierre
    };
};

/**
 * Calcula los turnos disponibles para un día específico, considerando los
 * horarios de apertura, la duración del servicio y las reservas existentes.
 * Ahora soporta horarios que cruzan medianoche (ej: 22:00 - 02:00) con isolation total.
 *
 * @param params Objeto con los parámetros necesarios para el cálculo.
 * @returns Un array de strings con los horarios de inicio de los turnos disponibles.
 */
export const calcularTurnosDisponibles = ({
    fecha,
    duracionTotal,
    horarioDelDia,
    reservasOcupadas,
    midnightModeEnabled = false, // Default false para backward compatibility
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
        // Usar lógica refinada para determinar si aplicar procesamiento especial medianoche
        if (needsMidnightLogic(intervalo, midnightModeEnabled)) {
            // === LÓGICA ESPECIAL MEDIANOCHE (solo toggle ON) ===
            // BUG FIX: Permitir slots que crucen medianoche (ej: 23:00-01:00)
            const startMinutes = timeToMinutes(intervalo.open);
            const endMinutes = timeToMinutes(intervalo.close);

            // Generar todos los slots posibles, incluyendo los que cruzan medianoche
            let currentSlotStart = startMinutes;

            while (true) {
                // Calcular dónde terminaría este slot
                const slotEnd = currentSlotStart + duracionTotal;

                // Verificar si el slot cabe dentro del horario
                // Necesitamos manejar 3 casos:
                // 1. Slot empieza y termina antes de medianoche (ej: 13:00-15:00)
                // 2. Slot empieza antes de medianoche y termina después (ej: 23:00-01:00)
                // 3. Slot empieza y termina después de medianoche (ej: 00:00-02:00 cuando ya wrapped)

                let slotFits = false;

                if (currentSlotStart < 24 * 60) {
                    // El slot empieza antes de medianoche
                    if (slotEnd <= 24 * 60) {
                        // Caso 1: Slot no cruza medianoche, siempre cabe (estamos en intervalo medianoche)
                        slotFits = true;
                    } else {
                        // Caso 2: Slot cruza medianoche (ej: 23:00-01:00)
                        const normalizedSlotEnd = slotEnd - (24 * 60);
                        slotFits = normalizedSlotEnd <= endMinutes;
                    }
                } else {
                    // Caso 3: El slot ya está después de medianoche (wrapped)
                    slotFits = slotEnd <= endMinutes + (24 * 60);
                }

                if (!slotFits) {
                    break;
                }

                // Normalizar currentSlotStart para output
                const normalizedSlotStart = currentSlotStart >= 24 * 60
                    ? currentSlotStart - (24 * 60)
                    : currentSlotStart;

                turnosDisponibles.push(minutesToTime(normalizedSlotStart));

                // Avanzar al siguiente slot
                currentSlotStart += duracionTotal;
            }
        } else {
            // === LÓGICA NORMAL (toggle OFF o cierre a medianoche) ===
            const inicioIntervalo = timeToMinutes(intervalo.open);
            let finIntervalo = timeToMinutes(intervalo.close);

            // CASO ESPECIAL: Cierre a 00:00 (medianoche exacta)
            // Convertir 00:00 (0 minutos) a 24:00 (1440 minutos) para que la lógica funcione
            if (intervalo.close === '00:00') {
                finIntervalo = 24 * 60; // 1440 minutos = medianoche
            }

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
 * Verifica si un intervalo específico está activo en un momento dado.
 * Soporta intervalos que cruzan medianoche.
 *
 * @param currentTimeMinutes El tiempo actual en minutos desde medianoche
 * @param interval El intervalo a verificar
 * @returns true si el intervalo está activo en el momento dado
 */
export const isIntervalActive = (currentTimeMinutes: number, interval: Interval): boolean => {
    const startMinutes = timeToMinutes(interval.open);
    const endMinutes = timeToMinutes(interval.close);

    if (detectsCrossesMidnight(interval)) {
        // Horario cruza medianoche: activo si está en el rango antes de medianoche O después
        // Ejemplo: 22:00-02:00 está activo si currentTime >= 22:00 OR currentTime < 02:00
        return currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
    } else {
        // Horario normal: activo si está dentro del rango
        return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    }
};

/**
 * Verifica si un negocio/empleado está abierto en un momento específico del día.
 * Soporta horarios que cruzan medianoche.
 *
 * @param currentTime Hora actual en formato "HH:mm" (opcional, usa hora actual del sistema si no se proporciona)
 * @param dayHours Los horarios del día a verificar
 * @returns true si está abierto en el momento especificado
 */
export const isOpenNow = (dayHours: DayHours, currentTime?: string): boolean => {
    if (!dayHours.enabled || dayHours.intervals.length === 0) {
        return false;
    }

    const currentTimeMinutes = currentTime
        ? timeToMinutes(currentTime)
        : new Date().getHours() * 60 + new Date().getMinutes();

    // Verificar si algún intervalo está activo en el momento actual
    return dayHours.intervals.some(interval => isIntervalActive(currentTimeMinutes, interval));
};

/**
 * Valida si hay solapamiento entre un conjunto de intervalos de tiempo.
 * Ahora considera intervalos que cruzan medianoche como válidos.
 * @param intervals Array de objetos { open: "HH:mm", close: "HH:mm" }.
 * @returns `true` si no hay solapamientos, `false` si los hay.
 */
export const validarIntervalos = (intervals: { open: string; close: string }[]): boolean => {
    if (intervals.length <= 1) {
        return true;
    }

    // Convertir a minutos
    const intervalosEnMinutos = intervals.map(interval => ({
        start: timeToMinutes(interval.open),
        end: timeToMinutes(interval.close),
        original: interval
    }));

    // Verificar solapamientos
    for (let i = 0; i < intervalosEnMinutos.length; i++) {
        const current = intervalosEnMinutos[i];
        const crossesMidnight = detectsCrossesMidnight(current.original);

        for (let j = i + 1; j < intervalosEnMinutos.length; j++) {
            const other = intervalosEnMinutos[j];
            const otherCrossesMidnight = detectsCrossesMidnight(other.original);

            // Verificar solapamiento considerando cruces de medianoche
            if (crossesMidnight && otherCrossesMidnight) {
                // Ambos cruzan medianoche - siempre se solapan
                return false;
            } else if (crossesMidnight) {
                // Solo current cruza medianoche
                // Se solapa si other.start < current.end O other.start >= current.start
                if (other.start < current.end || other.start >= current.start) {
                    return false;
                }
            } else if (otherCrossesMidnight) {
                // Solo other cruza medianoche
                // Se solapa si current.start < other.end O current.start >= other.start
                if (current.start < other.end || current.start >= other.start) {
                    return false;
                }
            } else {
                // Ninguno cruza medianoche - validación normal
                if (!(current.end <= other.start || other.end <= current.start)) {
                    return false;
                }
            }
        }
    }

    return true;
};