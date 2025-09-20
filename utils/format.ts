/**
 * utils/format.ts
 * 
 * Este archivo contiene funciones de utilidad para dar formato a los datos
 * para su visualización en la interfaz de usuario.
 */

/**
 * Convierte una duración dada en minutos a un formato de cadena legible por humanos.
 * Ejemplos:
 * - 75 minutos se convierte en "1h 15m"
 * - 60 minutos se convierte en "1h"
 * - 45 minutos se convierte en "45 min"
 * 
 * @param minutes La duración total en minutos.
 * @returns Una cadena de texto formateada que representa la duración.
 */
export const formatDuration = (minutes: number): string => {
    if (minutes <= 0) {
        return '0 min';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours}h`);
    }

    if (remainingMinutes > 0) {
        parts.push(`${remainingMinutes}m`);
    }

    // Si solo hay minutos (y no horas), añade ' min' para mayor claridad.
    if (hours === 0 && remainingMinutes > 0) {
        return `${remainingMinutes} min`;
    }

    return parts.join(' ');
};
