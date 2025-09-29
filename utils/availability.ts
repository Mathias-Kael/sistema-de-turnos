import { DayHours } from '../types';

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

    const ahora = new Date();
    const esHoy = fecha.getFullYear() === ahora.getFullYear() &&
                fecha.getMonth() === ahora.getMonth() &&
                fecha.getDate() === ahora.getDate();
    const minutosAhora = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

    // Convertir reservas ocupadas a intervalos de minutos
    const intervalosOcupados = reservasOcupadas.map(reserva => ({
        start: timeToMinutes(reserva.start),
        end: timeToMinutes(reserva.end),
    }));

    const turnosDisponibles: string[] = [];
    const granularidad = 10; // El algoritmo "piensa" en bloques de 10 minutos para precisión.

    // Iterar sobre cada intervalo de trabajo del día (ej: mañana y tarde)
    horarioDelDia.intervals.forEach(intervalo => {
        const inicioIntervalo = timeToMinutes(intervalo.open);
        const finIntervalo = timeToMinutes(intervalo.close);

        // Iterar dentro del intervalo de trabajo, en saltos de la granularidad definida.
        for (let minutoActual = inicioIntervalo; minutoActual < finIntervalo; minutoActual += granularidad) {
            
            // CORRECCIÓN: Solo considerar horarios de inicio que se alinean con la duración del servicio.
            // Si la duración es 30, solo se considerarán las 9:00, 9:30, 10:00, etc.
            // Esto crea la lista de turnos agrupados que el usuario espera ver.
            if ((minutoActual - inicioIntervalo) % duracionTotal !== 0) {
                continue;
            }

            // Si es hoy, no mostrar turnos que ya pasaron
            if (esHoy && minutoActual < minutosAhora) {
                continue;
            }

            const finTurno = minutoActual + duracionTotal;

            // 1. Verificar que el turno completo cabe dentro del horario laboral
            if (finTurno > finIntervalo) {
                continue; // El turno termina después de la hora de cierre
            }

            // 2. Verificar que el turno no se solape con ninguna reserva existente
            let haySolapamiento = false;
            for (const ocupado of intervalosOcupados) {
                // Un solapamiento ocurre si:
                // (InicioTurno < FinOcupado) y (FinTurno > InicioOcupado)
                if (minutoActual < ocupado.end && finTurno > ocupado.start) {
                    haySolapamiento = true;
                    break;
                }
            }

            if (!haySolapamiento) {
                turnosDisponibles.push(minutesToTime(minutoActual));
            }
        }
    });

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