import { describe, it, expect } from '@jest/globals';
import {
    detectsCrossesMidnight,
    dayHoursCrossesMidnight,
    weekHoursCrossesMidnight,
    calculateMidnightCrossingHours,
    isIntervalActive,
    isOpenNow,
    timeToMinutes,
    minutesToTime,
    calcularTurnosDisponibles,
} from './availability';
import { DayHours, Hours } from '../types';

describe('Midnight Crossing Detection', () => {
    describe('detectsCrossesMidnight', () => {
        it('detecta correctamente horario que cruza medianoche', () => {
            expect(detectsCrossesMidnight({ open: '22:00', close: '02:00' })).toBe(true);
            expect(detectsCrossesMidnight({ open: '23:00', close: '01:00' })).toBe(true);
            expect(detectsCrossesMidnight({ open: '20:00', close: '06:00' })).toBe(true);
        });

        it('detecta correctamente horario normal (no cruza medianoche)', () => {
            expect(detectsCrossesMidnight({ open: '09:00', close: '17:00' })).toBe(false);
            expect(detectsCrossesMidnight({ open: '14:00', close: '22:00' })).toBe(false);
            expect(detectsCrossesMidnight({ open: '00:00', close: '23:59' })).toBe(false);
        });
    });

    describe('calculateMidnightCrossingHours', () => {
        it('calcula correctamente horas para horario que cruza medianoche', () => {
            // 22:00 - 02:00 = 4 horas
            expect(calculateMidnightCrossingHours({ open: '22:00', close: '02:00' })).toBe(4);

            // 23:00 - 01:00 = 2 horas
            expect(calculateMidnightCrossingHours({ open: '23:00', close: '01:00' })).toBe(2);

            // 20:00 - 06:00 = 10 horas
            expect(calculateMidnightCrossingHours({ open: '20:00', close: '06:00' })).toBe(10);
        });

        it('calcula correctamente horas para horario normal', () => {
            // 09:00 - 17:00 = 8 horas
            expect(calculateMidnightCrossingHours({ open: '09:00', close: '17:00' })).toBe(8);

            // 14:00 - 18:00 = 4 horas
            expect(calculateMidnightCrossingHours({ open: '14:00', close: '18:00' })).toBe(4);
        });
    });

    describe('isIntervalActive', () => {
        it('verifica correctamente si un intervalo que cruza medianoche está activo', () => {
            const interval = { open: '22:00', close: '02:00' };

            // 23:00 (1380 minutos) - antes de medianoche
            expect(isIntervalActive(timeToMinutes('23:00'), interval)).toBe(true);

            // 01:00 (60 minutos) - después de medianoche
            expect(isIntervalActive(timeToMinutes('01:00'), interval)).toBe(true);

            // 10:00 (600 minutos) - fuera del rango
            expect(isIntervalActive(timeToMinutes('10:00'), interval)).toBe(false);

            // 21:00 (1260 minutos) - antes del inicio
            expect(isIntervalActive(timeToMinutes('21:00'), interval)).toBe(false);
        });

        it('verifica correctamente si un intervalo normal está activo', () => {
            const interval = { open: '09:00', close: '17:00' };

            // 12:00 - dentro del rango
            expect(isIntervalActive(timeToMinutes('12:00'), interval)).toBe(true);

            // 08:00 - antes del inicio
            expect(isIntervalActive(timeToMinutes('08:00'), interval)).toBe(false);

            // 18:00 - después del fin
            expect(isIntervalActive(timeToMinutes('18:00'), interval)).toBe(false);
        });
    });

    describe('isOpenNow', () => {
        it('detecta correctamente si está abierto con horario que cruza medianoche', () => {
            const dayHours: DayHours = {
                enabled: true,
                intervals: [{ open: '22:00', close: '02:00' }],
            };

            expect(isOpenNow(dayHours, '23:00')).toBe(true);
            expect(isOpenNow(dayHours, '01:00')).toBe(true);
            expect(isOpenNow(dayHours, '10:00')).toBe(false);
        });

        it('detecta correctamente si está abierto con horario normal', () => {
            const dayHours: DayHours = {
                enabled: true,
                intervals: [{ open: '09:00', close: '17:00' }],
            };

            expect(isOpenNow(dayHours, '12:00')).toBe(true);
            expect(isOpenNow(dayHours, '08:00')).toBe(false);
            expect(isOpenNow(dayHours, '18:00')).toBe(false);
        });

        it('retorna false si el día no está habilitado', () => {
            const dayHours: DayHours = {
                enabled: false,
                intervals: [{ open: '09:00', close: '17:00' }],
            };

            expect(isOpenNow(dayHours, '12:00')).toBe(false);
        });
    });

    describe('calcularTurnosDisponibles con horarios que cruzan medianoche', () => {
        it('genera slots correctamente para horario que cruza medianoche', () => {
            const dayHours: DayHours = {
                enabled: true,
                intervals: [{ open: '22:00', close: '02:00' }],
            };

            const slots = calcularTurnosDisponibles({
                fecha: new Date('2025-11-10'),
                duracionTotal: 60, // 1 hora
                horarioDelDia: dayHours,
                reservasOcupadas: [],
                midnightModeEnabled: true, // REQUERIDO para lógica medianoche
            });

            // Debería generar slots: 22:00, 23:00, 00:00, 01:00
            expect(slots).toContain('22:00');
            expect(slots).toContain('23:00');
            expect(slots).toContain('00:00');
            expect(slots).toContain('01:00');
            expect(slots.length).toBe(4);
        });

        it('genera slots correctamente para horario normal', () => {
            const dayHours: DayHours = {
                enabled: true,
                intervals: [{ open: '09:00', close: '17:00' }],
            };

            const slots = calcularTurnosDisponibles({
                fecha: new Date('2025-11-10'),
                duracionTotal: 60, // 1 hora
                horarioDelDia: dayHours,
                reservasOcupadas: [],
            });

            // Debería generar slots de 09:00 a 16:00 (8 slots)
            expect(slots).toContain('09:00');
            expect(slots).toContain('10:00');
            expect(slots).toContain('16:00');
            expect(slots.length).toBe(8);
        });

        it.skip('respeta reservas existentes en horario que cruza medianoche (TODO: Fase 3)', () => {
            // TODO: Este caso requiere lógica adicional para manejar reservas que cruzan medianoche
            // Será implementado en Fase 3 - Data Population
            const dayHours: DayHours = {
                enabled: true,
                intervals: [{ open: '22:00', close: '02:00' }],
            };

            const slots = calcularTurnosDisponibles({
                fecha: new Date('2025-11-10'),
                duracionTotal: 60,
                horarioDelDia: dayHours,
                reservasOcupadas: [{ start: '23:00', end: '01:00' }],
            });

            expect(slots).toContain('22:00');
            expect(slots).not.toContain('23:00');
            expect(slots).not.toContain('00:00');
            expect(slots).toContain('01:00');
        });
    });

    describe('dayHoursCrossesMidnight', () => {
        it('detecta correctamente si un día tiene horario que cruza medianoche', () => {
            const dayHoursWithMidnight: DayHours = {
                enabled: true,
                intervals: [{ open: '22:00', close: '02:00' }],
            };

            const dayHoursNormal: DayHours = {
                enabled: true,
                intervals: [{ open: '09:00', close: '17:00' }],
            };

            expect(dayHoursCrossesMidnight(dayHoursWithMidnight)).toBe(true);
            expect(dayHoursCrossesMidnight(dayHoursNormal)).toBe(false);
        });
    });
});

describe('Arena Sport Club - BUG FIX: Slots que cruzan medianoche', () => {
    it('genera correctamente slots para 13:00-02:00 con servicio 2h (TOGGLE ON)', () => {
        // Este es el caso real de Arena Sport Club
        const dayHours: DayHours = {
            enabled: true,
            intervals: [{ open: '13:00', close: '02:00' }],
        };

        const slots = calcularTurnosDisponibles({
            fecha: new Date('2025-11-10'),
            duracionTotal: 120, // 2 horas
            horarioDelDia: dayHours,
            reservasOcupadas: [],
            midnightModeEnabled: true, // TOGGLE ON
        });

        // ESPERADO: [13:00→15:00, 15:00→17:00, 17:00→19:00, 19:00→21:00, 21:00→23:00, 23:00→01:00]
        // El slot 23:00→01:00 cruza medianoche y DEBE aparecer
        // Son 6 slots de INICIO: 13:00, 15:00, 17:00, 19:00, 21:00, 23:00
        expect(slots).toContain('13:00');
        expect(slots).toContain('15:00');
        expect(slots).toContain('17:00');
        expect(slots).toContain('19:00');
        expect(slots).toContain('21:00');
        expect(slots).toContain('23:00'); // Este es el crítico - cruza medianoche (23:00→01:00)
        expect(slots.length).toBe(6); // 6 slots de inicio, el último cruza medianoche
    });

    it('NO genera slots medianoche para 13:00-02:00 con TOGGLE OFF (backward compatibility)', () => {
        // Con toggle OFF, debe comportarse como horario inválido o usar lógica normal
        const dayHours: DayHours = {
            enabled: true,
            intervals: [{ open: '13:00', close: '02:00' }],
        };

        const slots = calcularTurnosDisponibles({
            fecha: new Date('2025-11-10'),
            duracionTotal: 120,
            horarioDelDia: dayHours,
            reservasOcupadas: [],
            midnightModeEnabled: false, // TOGGLE OFF
        });

        // Con toggle OFF, este horario debería usar lógica normal (que no procesa correctamente)
        // Esto asegura isolation - sin toggle, no hay comportamiento especial
        expect(slots.length).toBe(0); // Lógica normal falla con open > close
    });

    it('genera slots correctamente para cierre a medianoche 20:00-00:00 (TOGGLE OFF)', () => {
        // Caso normal: cierre a medianoche exacta (NO cruza al día siguiente)
        const dayHours: DayHours = {
            enabled: true,
            intervals: [{ open: '20:00', close: '00:00' }],
        };

        const slots = calcularTurnosDisponibles({
            fecha: new Date('2025-11-10'),
            duracionTotal: 120, // 2 horas
            horarioDelDia: dayHours,
            reservasOcupadas: [],
            midnightModeEnabled: false, // Toggle OFF
        });

        // ESPERADO: [20:00, 22:00] - Solo hasta antes de medianoche
        expect(slots).toContain('20:00');
        expect(slots).toContain('22:00');
        expect(slots.length).toBe(2);
    });

    it('genera slots medianoche solo para intervalos específicos (22:00-02:00 TOGGLE ON)', () => {
        // Caso específico: horario que cruza medianoche con toggle ON
        const dayHours: DayHours = {
            enabled: true,
            intervals: [{ open: '22:00', close: '02:00' }],
        };

        const slots = calcularTurnosDisponibles({
            fecha: new Date('2025-11-10'),
            duracionTotal: 60, // 1 hora
            horarioDelDia: dayHours,
            reservasOcupadas: [],
            midnightModeEnabled: true, // Toggle ON
        });

        // ESPERADO: [22:00, 23:00, 00:00, 01:00]
        expect(slots).toContain('22:00');
        expect(slots).toContain('23:00');
        expect(slots).toContain('00:00');
        expect(slots).toContain('01:00');
        expect(slots.length).toBe(4);
    });
});
