import { DayHours, Employee, Hours, Business } from '../types';

/**
 * Normaliza un string de tiempo para convertirlo al formato estándar "HH:mm".
 *
 * La base de datos puede devolver tiempos en formato SQL TIME (`HH:mm:ss`) con segundos,
 * pero la aplicación trabaja internamente con formato simplificado (`HH:mm`).
 * Esta función realiza la conversión en la capa de datos para mantener consistencia.
 *
 * @param timeStr - String de tiempo en formato "HH:mm" o "HH:mm:ss"
 * @returns String de tiempo normalizado en formato "HH:mm"
 *
 * @example
 * normalizeTimeString("09:00")    // "09:00" (sin cambios)
 * normalizeTimeString("09:00:00") // "09:00" (extrae HH:mm)
 * normalizeTimeString("23:59:59") // "23:59" (extrae HH:mm)
 */
export const normalizeTimeString = (timeStr: string): string => {
    // Si el formato incluye segundos (HH:mm:ss), extraer solo HH:mm
    if (timeStr && timeStr.length === 8 && timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeStr.substring(0, 5);
    }
    return timeStr;
};

/**
 * Normaliza un objeto Hours (horarios semanales) convirtiendo todos los intervalos
 * de formato DB (HH:mm:ss) a formato app (HH:mm).
 *
 * @param hours - Objeto Hours con horarios de la semana
 * @returns Nuevo objeto Hours con todos los tiempos normalizados
 */
export const normalizeHours = (hours: Hours): Hours => {
    const normalizedHours: Hours = {} as Hours;

    for (const day in hours) {
        const dayKey = day as keyof Hours;
        normalizedHours[dayKey] = {
            ...hours[dayKey],
            intervals: hours[dayKey].intervals.map(interval => ({
                open: normalizeTimeString(interval.open),
                close: normalizeTimeString(interval.close)
            }))
        };
    }

    return normalizedHours;
};

/**
 * Normaliza todos los datos de tiempo en un objeto Business.
 * Convierte formato DB (HH:mm:ss) a formato app (HH:mm) para:
 * - Horarios del negocio (business.hours)
 * - Horarios de empleados (employees[].hours)
 * - Horarios de bookings (bookings[].start/end)
 *
 * Esta función debe usarse en los entry points donde los datos
 * entran desde la DB (BusinessContext, PublicClientLoader, etc.)
 *
 * @param business - Objeto Business con datos crudos de la DB
 * @returns Nuevo objeto Business con todos los tiempos normalizados
 */
export const normalizeBusinessData = (business: Business): Business => {
    return {
        ...business,
        // Normalizar horarios del negocio
        hours: normalizeHours(business.hours),
        // Normalizar horarios de empleados
        employees: business.employees.map(employee => ({
            ...employee,
            hours: normalizeHours(employee.hours)
        })),
        // Normalizar bookings
        bookings: business.bookings.map(booking => ({
            ...booking,
            start: normalizeTimeString(booking.start),
            end: normalizeTimeString(booking.end)
        }))
    };
};

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
 *
 * ## Interpretación Contextual de Medianoche (00:00)
 *
 * La función soporta interpretación contextual para resolver la ambigüedad de `00:00`:
 * - **Context `'open'`**: `00:00` representa el **inicio del día** (0 minutos)
 * - **Context `'close'`**: `00:00` representa el **final del día** (1440 minutos = 24:00)
 * - **Sin context**: `00:00` por defecto es inicio del día (0 minutos) - backward compatible
 *
 * ## Casos Especiales
 *
 * - **`24:00`**: Siempre se interpreta como 1440 minutos (fin de día)
 * - **Horarios nocturnos**: Use context `'close'` para `00:00` en intervalos como `18:00-00:00`
 * - **24/7 operation**: Use `00:00` open (0) y `00:00` close (1440) para 24 horas completas
 *
 * ## Validación
 *
 * La función valida el formato y rangos de entrada:
 * - Formato debe ser exactamente "HH:mm" (con ceros leading)
 * - Horas válidas: 0-24 (24 solo con minutos = 0)
 * - Minutos válidos: 0-59
 * - Arroja `Error` con mensaje descriptivo si la entrada es inválida
 *
 * @param timeStr - Tiempo en formato "HH:mm" (ej: "09:30", "18:00", "00:00", "24:00")
 * @param context - Contexto opcional para interpretación de `00:00`:
 *                  - `'open'`: Hora de apertura (00:00 = inicio del día)
 *                  - `'close'`: Hora de cierre (00:00 = fin del día)
 *                  - `undefined`: Sin contexto (00:00 = inicio del día)
 *
 * @returns Número de minutos desde la medianoche (rango: 0-1440)
 *
 * @throws {Error} Si el formato es inválido o los valores están fuera de rango
 *
 * @example
 * // Uso básico
 * timeToMinutes("09:30")              // 570 (9*60 + 30)
 * timeToMinutes("18:00")              // 1080 (18*60)
 * timeToMinutes("12:00")              // 720 (12*60)
 *
 * @example
 * // Horarios nocturnos (Arena use case: 18:00-00:00)
 * const start = timeToMinutes("18:00", "open");   // 1080
 * const end = timeToMinutes("00:00", "close");    // 1440 ✅ (fin del día)
 * const duration = end - start;                   // 360 minutos (6 horas)
 *
 * @example
 * // Operación 24/7 (gimnasio)
 * const open = timeToMinutes("00:00", "open");    // 0 (inicio del día)
 * const close = timeToMinutes("00:00", "close");  // 1440 (fin del día)
 * const hours = (close - open) / 60;              // 24 horas completas
 *
 * @example
 * // Caso especial: 24:00 (siempre fin del día)
 * timeToMinutes("24:00")              // 1440
 * timeToMinutes("24:00", "open")      // 1440
 * timeToMinutes("24:00", "close")     // 1440
 *
 * @example
 * // Validación de errores
 * timeToMinutes("9:30")               // ❌ Error: formato inválido (falta cero leading)
 * timeToMinutes("25:00")              // ❌ Error: horas fuera de rango (0-24)
 * timeToMinutes("12:60")              // ❌ Error: minutos fuera de rango (0-59)
 * timeToMinutes("abc")                // ❌ Error: formato inválido
 * timeToMinutes("")                   // ❌ Error: string vacío
 *
 * @see {@link minutesToTime} Para conversión inversa (minutos → "HH:mm")
 * @see {@link validarIntervalos} Para validación de intervalos de tiempo
 *
 * @since 1.0.0 - Versión inicial
 * @since 2.0.0 - Agregado soporte para context parameter (nighttime hours)
 * @since 2.1.0 - Agregada validación de inputs y mejores error messages
 */
export const timeToMinutes = (timeStr: string, context?: 'open' | 'close'): number => {
    // Validación 1: String no vacío
    if (!timeStr || typeof timeStr !== 'string') {
        throw new Error(
            `[timeToMinutes] Input inválido: se esperaba string no vacío en formato "HH:mm", ` +
            `recibido: ${JSON.stringify(timeStr)}`
        );
    }

    // Validación 2: Formato "HH:mm" (exactamente 5 caracteres con ':' en posición 2)
    if (!timeStr.match(/^\d{2}:\d{2}$/)) {
        throw new Error(
            `[timeToMinutes] Formato inválido: se esperaba "HH:mm" con ceros leading (ej: "09:30"), ` +
            `recibido: "${timeStr}". ` +
            `Ejemplos válidos: "00:00", "09:30", "18:00", "23:59", "24:00"`
        );
    }

    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Validación 3: Rangos válidos
    // Horas: 0-24 (24 solo válido si minutos = 0)
    if (hours < 0 || hours > 24) {
        throw new Error(
            `[timeToMinutes] Horas fuera de rango: debe estar entre 0-24, ` +
            `recibido: ${hours} en "${timeStr}"`
        );
    }

    // Si horas = 24, minutos debe ser 0
    if (hours === 24 && minutes !== 0) {
        throw new Error(
            `[timeToMinutes] Formato inválido: "24:00" es válido, pero "24:${minutesStr}" no. ` +
            `Las horas 24 solo son válidas con minutos = 00`
        );
    }

    // Minutos: 0-59
    if (minutes < 0 || minutes > 59) {
        throw new Error(
            `[timeToMinutes] Minutos fuera de rango: debe estar entre 0-59, ` +
            `recibido: ${minutes} en "${timeStr}"`
        );
    }

    // Validación 4: Detectar valores NaN (parsing fallido)
    if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(
            `[timeToMinutes] Parsing fallido: no se pudieron extraer números válidos de "${timeStr}". ` +
            `Horas: ${hours}, Minutos: ${minutes}`
        );
    }

    // Regla contextual para 12 AM (00:00):
    // - Si es hora de cierre y es medianoche (00:00), interpretar como 24:00 (fin del día)
    // - Si es hora de apertura o sin contexto, interpretar como 00:00 (inicio del día)
    if (hours === 0 && minutes === 0 && context === 'close') {
        return 24 * 60; // 1440 minutos = 24:00 (medianoche del día siguiente)
    }

    // Manejo explícito de 24:00 (medianoche como fin de día)
    if (hours === 24 && minutes === 0) {
        return 24 * 60; // 1440 minutos
    }

    return hours * 60 + minutes;
};

/**
 * Convierte minutos desde la medianoche a una hora en formato "HH:mm".
 *
 * ## Normalización de Valores
 *
 * - **1440 minutos (24:00)**: Se normaliza a `"00:00"` para compatibilidad con inputs HTML
 * - **0-1439 minutos**: Se convierte directamente a "HH:mm"
 * - **Valores negativos o > 1440**: Arroja error con mensaje descriptivo
 *
 * ## Formato de Salida
 *
 * Siempre retorna string en formato "HH:mm" con ceros leading:
 * - Horas: Siempre 2 dígitos (00-23)
 * - Minutos: Siempre 2 dígitos (00-59)
 * - Separador: `:` (dos puntos)
 *
 * ## Validación
 *
 * La función valida el input antes de convertir:
 * - Debe ser un número válido (no `NaN`, `Infinity`, etc.)
 * - Debe estar en el rango 0-1440 (inclusive)
 * - Arroja `Error` con mensaje descriptivo si es inválido
 *
 * @param totalMinutes - Número de minutos desde la medianoche (rango válido: 0-1440)
 *                       - `0`: 00:00 (medianoche inicio)
 *                       - `1440`: 00:00 (medianoche fin, normalizado)
 *                       - `720`: 12:00 (mediodía)
 *
 * @returns String en formato "HH:mm" con ceros leading
 *
 * @throws {Error} Si el input no es un número válido o está fuera del rango 0-1440
 *
 * @example
 * // Conversiones básicas
 * minutesToTime(0)        // "00:00" (medianoche inicio)
 * minutesToTime(570)      // "09:30" (9*60 + 30)
 * minutesToTime(720)      // "12:00" (mediodía)
 * minutesToTime(1080)     // "18:00" (6 PM)
 * minutesToTime(1439)     // "23:59" (casi medianoche)
 *
 * @example
 * // Caso especial: 1440 minutos (24:00 → 00:00)
 * minutesToTime(1440)     // "00:00" (normalizado para compatibilidad)
 *
 * @example
 * // Round-trip conversion (ida y vuelta)
 * const time = "18:00";
 * const minutes = timeToMinutes(time, "open");     // 1080
 * const converted = minutesToTime(minutes);        // "18:00"
 * console.assert(converted === time);              // ✅ true
 *
 * @example
 * // Cálculo de duración de horario nocturno
 * const startMinutes = timeToMinutes("18:00", "open");    // 1080
 * const endMinutes = timeToMinutes("00:00", "close");     // 1440
 * const durationMinutes = endMinutes - startMinutes;      // 360
 * const endTime = minutesToTime(endMinutes);              // "00:00"
 *
 * @example
 * // Validación de errores
 * minutesToTime(-10)      // ❌ Error: negativo fuera de rango
 * minutesToTime(1441)     // ❌ Error: mayor a 1440
 * minutesToTime(NaN)      // ❌ Error: no es número válido
 * minutesToTime(Infinity) // ❌ Error: no es número finito
 *
 * @see {@link timeToMinutes} Para conversión inversa ("HH:mm" → minutos)
 *
 * @since 1.0.0 - Versión inicial
 * @since 2.1.0 - Agregada validación de inputs y mejores error messages
 */
export const minutesToTime = (totalMinutes: number): string => {
    // Validación 1: Es un número válido
    if (typeof totalMinutes !== 'number') {
        throw new Error(
            `[minutesToTime] Input inválido: se esperaba number, ` +
            `recibido: ${typeof totalMinutes} (${JSON.stringify(totalMinutes)})`
        );
    }

    // Validación 2: Es un número finito (no NaN, Infinity, -Infinity)
    if (!Number.isFinite(totalMinutes)) {
        throw new Error(
            `[minutesToTime] Input inválido: se esperaba número finito, ` +
            `recibido: ${totalMinutes}`
        );
    }

    // Validación 3: Está en el rango válido (0-1440)
    if (totalMinutes < 0 || totalMinutes > 1440) {
        throw new Error(
            `[minutesToTime] Valor fuera de rango: debe estar entre 0-1440 minutos, ` +
            `recibido: ${totalMinutes}. ` +
            `Rango válido representa 00:00 (0) a 24:00/00:00 (1440)`
        );
    }

    // Manejo especial para 1440 minutos (24:00 / medianoche como cierre)
    if (totalMinutes === 1440) {
        return '00:00'; // Normalizar 24:00 a 00:00 para formato de salida
    }

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

    // Convertir reservas a minutos para comparación numérica
    // Nota: Los datos ya vienen normalizados desde services/api.ts (formato "HH:mm")
    const reservasEnMinutos = reservasOcupadas.map(r => ({
        start: timeToMinutes(r.start, 'open'),
        end: timeToMinutes(r.end, 'close')
    }));

    const turnosDisponibles: string[] = [];

    // Iterar sobre cada intervalo de trabajo del día (ej: mañana y tarde)
    horarioDelDia.intervals.forEach(intervalo => {
        const inicioIntervalo = timeToMinutes(intervalo.open, 'open');
        const finIntervalo = timeToMinutes(intervalo.close, 'close');

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
            // CRÍTICO: Usar context 'open' para parsear slots de inicio
            // Los slots retornados son siempre horas de inicio de turno
            const minutoTurno = timeToMinutes(turno, 'open');
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
        start: timeToMinutes(interval.open, 'open'),
        end: timeToMinutes(interval.close, 'close'),
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