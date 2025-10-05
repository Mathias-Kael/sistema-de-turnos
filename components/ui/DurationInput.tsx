import React, { useState, useEffect } from 'react';

/**
 * Props para el componente DurationInput.
 * @interface DurationInputProps
 */ 
interface DurationInputProps {
    /**
     * Duración total en minutos.
     */
    value: number;
    /**
     * Callback cuando cambia la duración.
     * @param minutes - Nueva duración en minutos.
     */
    onChange: (minutes: number) => void;
    /**
     * Texto del placeholder para el campo de horas.
     * @default "Horas"
     */
    hoursPlaceholder?: string;
    /**
     * Texto del placeholder para el campo de minutos.
     * @default "Min"
     */
    minutesPlaceholder?: string;
    /**
     * Clases CSS adicionales para el contenedor.
     */
    className?: string;
    /**
     * Si está deshabilitado.
     */
    disabled?: boolean;
    /**
     * Duración máxima permitida en minutos.
     * @default 480 (8 horas)
     */
    maxMinutes?: number;
    /**
     * Duración mínima permitida en minutos.
     * @default 0
     */
    minMinutes?: number;
}

/**
 * Componente para entrada de duración en horas y minutos.
 * Internamente maneja la conversión entre horas+minutos y minutos totales.
 *
 * Validaciones:
 * - Normaliza automáticamente (ej: 0h 90min → 1h 30min al perder foco)
 * - Limita duración máxima (por defecto 8 horas = 480 minutos)
 * - Duración mínima 0 minutos
 * - Si ambos campos están vacíos, el valor es 0
 *
 * @example
 * ```tsx
 * <DurationInput
 *   value={90}
 *   onChange={(minutes) => setDuration(minutes)}
 *   maxMinutes={480}
 * />
 * ```
 *
 * @param {DurationInputProps} props - Las props para el componente.
 * @returns {React.ReactElement} El componente de input de duración renderizado.
 */
export const DurationInput: React.FC<DurationInputProps> = ({
    value,
    onChange,
    hoursPlaceholder = 'Horas',
    minutesPlaceholder = 'Min',
    className = '',
    disabled = false,
    maxMinutes = 480, // 8 horas por defecto
    minMinutes = 0,
}) => {
    const [hours, setHours] = useState(Math.floor(value / 60));
    const [minutes, setMinutes] = useState(value % 60);

    // Actualizar estado interno cuando cambia el valor externo
    useEffect(() => {
        setHours(Math.floor(value / 60));
        setMinutes(value % 60);
    }, [value]);

    // Normalizar minutos excedentes (ej: 90 min → 1h 30min)
    const normalizeTime = (h: number, m: number) => {
        const totalMinutes = h * 60 + m;
        const normalizedHours = Math.floor(totalMinutes / 60);
        const normalizedMinutes = totalMinutes % 60;
        return { hours: normalizedHours, minutes: normalizedMinutes, total: totalMinutes };
    };

    const handleHoursChange = (newHours: number) => {
        const validHours = Math.max(0, newHours);
        setHours(validHours);

        const totalMinutes = validHours * 60 + minutes;
        const clampedTotal = Math.max(minMinutes, Math.min(maxMinutes, totalMinutes));
        onChange(clampedTotal);
    };

    const handleMinutesChange = (newMinutes: number) => {
        const validMinutes = Math.max(0, newMinutes);
        setMinutes(validMinutes);

        const totalMinutes = hours * 60 + validMinutes;
        const clampedTotal = Math.max(minMinutes, Math.min(maxMinutes, totalMinutes));
        onChange(clampedTotal);
    };

    const handleBlur = () => {
        // Normalizar cuando el usuario termina de editar
        const normalized = normalizeTime(hours, minutes);
        if (normalized.hours !== hours || normalized.minutes !== minutes) {
            setHours(normalized.hours);
            setMinutes(normalized.minutes);
            const clampedTotal = Math.max(minMinutes, Math.min(maxMinutes, normalized.total));
            onChange(clampedTotal);
        }
    };

    const maxHours = Math.floor(maxMinutes / 60);

    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="relative flex-1">
                <input
                    type="number"
                    min="0"
                    max={maxHours}
                    placeholder={hoursPlaceholder}
                    value={hours || ''}
                    onChange={(e) => handleHoursChange(Number(e.target.value) || 0)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className="w-full p-2 pr-10 border border-default rounded bg-background text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Horas (máx: ${maxHours})`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none select-none opacity-70">
                    hs
                </span>
            </div>
            <div className="relative flex-1">
                <input
                    type="number"
                    min="0"
                    placeholder={minutesPlaceholder}
                    value={minutes || ''}
                    onChange={(e) => handleMinutesChange(Number(e.target.value) || 0)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className="w-full p-2 pr-12 border border-default rounded bg-background text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Minutos (se normalizarán automáticamente)"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none select-none opacity-70">
                    min
                </span>
            </div>
        </div>
    );
};
