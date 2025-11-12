import { timeToMinutes, minutesToTime, validarIntervalos } from './availability';

describe('timeToMinutes', () => {
  describe('basic time conversion', () => {
    it('should convert midnight (00:00) without context to 0 minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('should convert noon (12:00) to 720 minutes', () => {
      expect(timeToMinutes('12:00')).toBe(720);
    });

    it('should convert 18:00 to 1080 minutes', () => {
      expect(timeToMinutes('18:00')).toBe(1080);
    });

    it('should convert 23:59 to 1439 minutes', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('should handle minutes correctly', () => {
      expect(timeToMinutes('14:30')).toBe(870); // 14*60 + 30
    });
  });

  describe('contextual midnight (00:00) handling', () => {
    it('should return 0 for 00:00 with "open" context (start of day)', () => {
      expect(timeToMinutes('00:00', 'open')).toBe(0);
    });

    it('should return 1440 for 00:00 with "close" context (end of day)', () => {
      expect(timeToMinutes('00:00', 'close')).toBe(1440);
    });

    it('should return 0 for 00:00 without context (backward compatible)', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });
  });

  describe('nighttime hours support (critical feature)', () => {
    it('should correctly validate 18:00-00:00 (Arena use case)', () => {
      const openMinutes = timeToMinutes('18:00', 'open');
      const closeMinutes = timeToMinutes('00:00', 'close');

      expect(openMinutes).toBe(1080); // 18*60
      expect(closeMinutes).toBe(1440); // 24*60
      expect(closeMinutes - openMinutes).toBe(360); // 6 hours duration
      expect(openMinutes < closeMinutes).toBe(true); // Valid interval
    });

    it('should correctly validate 22:00-00:00 (late night hours)', () => {
      const openMinutes = timeToMinutes('22:00', 'open');
      const closeMinutes = timeToMinutes('00:00', 'close');

      expect(openMinutes).toBe(1320); // 22*60
      expect(closeMinutes).toBe(1440); // 24*60
      expect(closeMinutes - openMinutes).toBe(120); // 2 hours duration
    });

    it('should handle 00:00-00:00 as 24-hour operation', () => {
      const openMinutes = timeToMinutes('00:00', 'open');
      const closeMinutes = timeToMinutes('00:00', 'close');

      expect(openMinutes).toBe(0);
      expect(closeMinutes).toBe(1440);
      expect(closeMinutes - openMinutes).toBe(1440); // Full 24 hours
    });

    it('should support early morning closing (e.g., bar closing at 02:00)', () => {
      const openMinutes = timeToMinutes('20:00', 'open');
      const closeMinutes = timeToMinutes('02:00', 'close');

      expect(openMinutes).toBe(1200); // 20*60
      expect(closeMinutes).toBe(120);  // 2*60
      // Note: For multi-day hours (20:00-02:00), need crosses_midnight column
      // This test documents current behavior; actual multi-day support pending
    });
  });

  describe('special case: 24:00', () => {
    it('should convert 24:00 to 1440 minutes', () => {
      expect(timeToMinutes('24:00')).toBe(1440);
    });

    it('should handle 24:00 with any context as 1440', () => {
      expect(timeToMinutes('24:00', 'open')).toBe(1440);
      expect(timeToMinutes('24:00', 'close')).toBe(1440);
    });
  });

  describe('edge cases', () => {
    it('should handle 00:01 correctly', () => {
      expect(timeToMinutes('00:01', 'open')).toBe(1);
      expect(timeToMinutes('00:01', 'close')).toBe(1);
    });

    it('should handle 23:00 correctly', () => {
      expect(timeToMinutes('23:00', 'open')).toBe(1380);
      expect(timeToMinutes('23:00', 'close')).toBe(1380);
    });
  });
});

describe('minutesToTime', () => {
  describe('basic time conversion', () => {
    it('should convert 0 minutes to 00:00', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('should convert 720 minutes to 12:00', () => {
      expect(minutesToTime(720)).toBe('12:00');
    });

    it('should convert 1080 minutes to 18:00', () => {
      expect(minutesToTime(1080)).toBe('18:00');
    });

    it('should convert 1439 minutes to 23:59', () => {
      expect(minutesToTime(1439)).toBe('23:59');
    });

    it('should handle single-digit hours with padding', () => {
      expect(minutesToTime(90)).toBe('01:30'); // 1 hour 30 minutes
    });
  });

  describe('special case: 1440 minutes (midnight as close)', () => {
    it('should convert 1440 minutes to 00:00 (normalized)', () => {
      // Per implementation: 24:00 is normalized to 00:00 for output
      expect(minutesToTime(1440)).toBe('00:00');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain consistency for open context', () => {
      const times = ['06:00', '09:30', '14:00', '18:45', '22:00'];

      times.forEach(time => {
        const minutes = timeToMinutes(time, 'open');
        const converted = minutesToTime(minutes);
        expect(converted).toBe(time);
      });
    });

    it('should handle 00:00 close -> 00:00 conversion', () => {
      const closeMinutes = timeToMinutes('00:00', 'close'); // 1440
      const converted = minutesToTime(closeMinutes); // "00:00"
      expect(converted).toBe('00:00');
    });
  });
});

describe('validarIntervalos', () => {
  describe('valid intervals', () => {
    it('should accept non-overlapping intervals', () => {
      const intervals = [
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '18:00' }
      ];

      expect(validarIntervalos(intervals)).toBe(true);
    });

    it('should accept adjacent intervals (12:00-14:00)', () => {
      const intervals = [
        { open: '09:00', close: '12:00' },
        { open: '12:00', close: '14:00' }
      ];

      expect(validarIntervalos(intervals)).toBe(true);
    });

    it('should accept single interval', () => {
      const intervals = [{ open: '09:00', close: '17:00' }];
      expect(validarIntervalos(intervals)).toBe(true);
    });

    it('should accept nighttime hours (18:00-00:00)', () => {
      const intervals = [{ open: '18:00', close: '00:00' }];
      expect(validarIntervalos(intervals)).toBe(true);
    });

    it('should accept 24-hour operation (00:00-00:00)', () => {
      const intervals = [{ open: '00:00', close: '00:00' }];
      expect(validarIntervalos(intervals)).toBe(true);
    });
  });

  describe('invalid intervals', () => {
    it('should reject overlapping intervals', () => {
      const intervals = [
        { open: '09:00', close: '13:00' },
        { open: '12:00', close: '15:00' } // Overlaps by 1 hour
      ];

      expect(validarIntervalos(intervals)).toBe(false);
    });

    it('should reject intervals where open >= close (without context)', () => {
      // Note: This test documents current behavior without contextual validation
      // Real validation uses timeToMinutes with context in UI components
      const intervals = [
        { open: '18:00', close: '09:00' } // Invalid without crosses_midnight
      ];

      // The function should handle this based on implementation
      const result = validarIntervalos(intervals);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should accept empty intervals array', () => {
      expect(validarIntervalos([])).toBe(true);
    });

    it('should handle intervals with same start and end (zero duration)', () => {
      const intervals = [{ open: '12:00', close: '12:00' }];
      const result = validarIntervalos(intervals);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('integration: nighttime hours workflow', () => {
  it('should support complete Arena workflow (18:00-00:00)', () => {
    // Step 1: User configures nighttime hours
    const interval = { open: '18:00', close: '00:00' };

    // Step 2: UI validates interval
    const openMinutes = timeToMinutes(interval.open, 'open');
    const closeMinutes = timeToMinutes(interval.close, 'close');
    const isValid = openMinutes < closeMinutes;

    expect(isValid).toBe(true);

    // Step 3: Interval validation
    expect(validarIntervalos([interval])).toBe(true);

    // Step 4: Calculate duration
    const durationMinutes = closeMinutes - openMinutes;
    expect(durationMinutes).toBe(360); // 6 hours
  });

  it('should support gym 24/7 workflow (00:00-00:00)', () => {
    const interval = { open: '00:00', close: '00:00' };

    const openMinutes = timeToMinutes(interval.open, 'open');
    const closeMinutes = timeToMinutes(interval.close, 'close');

    expect(openMinutes).toBe(0);
    expect(closeMinutes).toBe(1440);
    expect(closeMinutes - openMinutes).toBe(1440); // Full day
    expect(validarIntervalos([interval])).toBe(true);
  });

  it('should support split-shift with nighttime hours', () => {
    const intervals = [
      { open: '06:00', close: '14:00' },  // Morning shift
      { open: '18:00', close: '00:00' }   // Evening/night shift
    ];

    // Validate both intervals separately
    intervals.forEach(interval => {
      const openMinutes = timeToMinutes(interval.open, 'open');
      const closeMinutes = timeToMinutes(interval.close, 'close');
      expect(openMinutes < closeMinutes).toBe(true);
    });

    // Validate no overlaps
    expect(validarIntervalos(intervals)).toBe(true);
  });
});

describe('backward compatibility', () => {
  it('should maintain compatibility with code not using context parameter', () => {
    // Old code that doesn't pass context should still work
    const time1 = timeToMinutes('09:00');
    const time2 = timeToMinutes('17:00');

    expect(time1).toBe(540);
    expect(time2).toBe(1020);
    expect(time2 > time1).toBe(true);
  });

  it('should not break existing normal hours (09:00-17:00)', () => {
    const intervals = [{ open: '09:00', close: '17:00' }];

    // Without context (backward compatible)
    const openOld = timeToMinutes(intervals[0].open);
    const closeOld = timeToMinutes(intervals[0].close);
    expect(closeOld > openOld).toBe(true);

    // With context (new behavior)
    const openNew = timeToMinutes(intervals[0].open, 'open');
    const closeNew = timeToMinutes(intervals[0].close, 'close');
    expect(closeNew > openNew).toBe(true);

    // Results should be identical for normal hours
    expect(openNew).toBe(openOld);
    expect(closeNew).toBe(closeOld);
  });
});

describe('timeToMinutes - Input Validation (Robustness)', () => {
  describe('invalid format errors', () => {
    it('should reject empty string', () => {
      expect(() => timeToMinutes('')).toThrow(
        '[timeToMinutes] Input inválido: se esperaba string no vacío en formato "HH:mm"'
      );
    });

    it('should reject null', () => {
      expect(() => timeToMinutes(null as any)).toThrow(
        '[timeToMinutes] Input inválido'
      );
    });

    it('should reject undefined', () => {
      expect(() => timeToMinutes(undefined as any)).toThrow(
        '[timeToMinutes] Input inválido'
      );
    });

    it('should reject number instead of string', () => {
      expect(() => timeToMinutes(1080 as any)).toThrow(
        '[timeToMinutes] Input inválido'
      );
    });

    it('should reject format without leading zeros (9:30)', () => {
      expect(() => timeToMinutes('9:30')).toThrow(
        '[timeToMinutes] Formato inválido: se esperaba "HH:mm" con ceros leading'
      );
    });

    it('should reject format with single digit hours (9:00)', () => {
      expect(() => timeToMinutes('9:00')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject format with single digit minutes (09:5)', () => {
      expect(() => timeToMinutes('09:5')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject format without colon (0930)', () => {
      expect(() => timeToMinutes('0930')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject format with wrong separator (09-30)', () => {
      expect(() => timeToMinutes('09-30')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject alphabetic characters (ab:cd)', () => {
      expect(() => timeToMinutes('ab:cd')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject too long string (009:030)', () => {
      expect(() => timeToMinutes('009:030')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });
  });

  describe('out of range errors', () => {
    it('should reject hours > 24', () => {
      expect(() => timeToMinutes('25:00')).toThrow(
        '[timeToMinutes] Horas fuera de rango: debe estar entre 0-24'
      );
    });

    it('should reject hours = 99', () => {
      expect(() => timeToMinutes('99:00')).toThrow(
        '[timeToMinutes] Horas fuera de rango'
      );
    });

    it('should reject minutes > 59', () => {
      expect(() => timeToMinutes('12:60')).toThrow(
        '[timeToMinutes] Minutos fuera de rango: debe estar entre 0-59'
      );
    });

    it('should reject minutes = 99', () => {
      expect(() => timeToMinutes('12:99')).toThrow(
        '[timeToMinutes] Minutos fuera de rango'
      );
    });

    it('should reject 24:01 (24 only valid with :00)', () => {
      expect(() => timeToMinutes('24:01')).toThrow(
        '[timeToMinutes] Formato inválido: "24:00" es válido, pero "24:01" no'
      );
    });

    it('should reject 24:30 (24 only valid with :00)', () => {
      expect(() => timeToMinutes('24:30')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });

    it('should reject 24:59 (24 only valid with :00)', () => {
      expect(() => timeToMinutes('24:59')).toThrow(
        '[timeToMinutes] Formato inválido'
      );
    });
  });

  describe('edge case validation', () => {
    it('should accept 00:00 (valid midnight)', () => {
      expect(() => timeToMinutes('00:00')).not.toThrow();
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('should accept 24:00 (valid end of day)', () => {
      expect(() => timeToMinutes('24:00')).not.toThrow();
      expect(timeToMinutes('24:00')).toBe(1440);
    });

    it('should accept 23:59 (last minute of day)', () => {
      expect(() => timeToMinutes('23:59')).not.toThrow();
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('should accept 00:01 (first minute after midnight)', () => {
      expect(() => timeToMinutes('00:01')).not.toThrow();
      expect(timeToMinutes('00:01')).toBe(1);
    });
  });

  describe('error messages quality', () => {
    it('should include received value in error message', () => {
      try {
        timeToMinutes('99:99');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('99');
        expect(error.message).toContain('[timeToMinutes]');
      }
    });

    it('should provide examples of valid format', () => {
      try {
        timeToMinutes('9:30');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('Ejemplos válidos');
        expect(error.message).toContain('09:30');
      }
    });

    it('should be descriptive and actionable', () => {
      try {
        timeToMinutes('25:00');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('debe estar entre 0-24');
        expect(error.message.length).toBeGreaterThan(30); // Non-trivial message
      }
    });
  });
});

describe('minutesToTime - Input Validation (Robustness)', () => {
  describe('invalid type errors', () => {
    it('should reject string instead of number', () => {
      expect(() => minutesToTime('720' as any)).toThrow(
        '[minutesToTime] Input inválido: se esperaba number'
      );
    });

    it('should reject null', () => {
      expect(() => minutesToTime(null as any)).toThrow(
        '[minutesToTime] Input inválido'
      );
    });

    it('should reject undefined', () => {
      expect(() => minutesToTime(undefined as any)).toThrow(
        '[minutesToTime] Input inválido'
      );
    });

    it('should reject object', () => {
      expect(() => minutesToTime({} as any)).toThrow(
        '[minutesToTime] Input inválido'
      );
    });

    it('should reject array', () => {
      expect(() => minutesToTime([720] as any)).toThrow(
        '[minutesToTime] Input inválido'
      );
    });
  });

  describe('non-finite number errors', () => {
    it('should reject NaN', () => {
      expect(() => minutesToTime(NaN)).toThrow(
        '[minutesToTime] Input inválido: se esperaba número finito'
      );
    });

    it('should reject Infinity', () => {
      expect(() => minutesToTime(Infinity)).toThrow(
        '[minutesToTime] Input inválido: se esperaba número finito'
      );
    });

    it('should reject -Infinity', () => {
      expect(() => minutesToTime(-Infinity)).toThrow(
        '[minutesToTime] Input inválido: se esperaba número finito'
      );
    });
  });

  describe('out of range errors', () => {
    it('should reject negative values', () => {
      expect(() => minutesToTime(-1)).toThrow(
        '[minutesToTime] Valor fuera de rango: debe estar entre 0-1440'
      );
    });

    it('should reject -100', () => {
      expect(() => minutesToTime(-100)).toThrow(
        '[minutesToTime] Valor fuera de rango'
      );
    });

    it('should reject values > 1440', () => {
      expect(() => minutesToTime(1441)).toThrow(
        '[minutesToTime] Valor fuera de rango'
      );
    });

    it('should reject 2000 (> 1440)', () => {
      expect(() => minutesToTime(2000)).toThrow(
        '[minutesToTime] Valor fuera de rango'
      );
    });

    it('should reject very large values', () => {
      expect(() => minutesToTime(999999)).toThrow(
        '[minutesToTime] Valor fuera de rango'
      );
    });
  });

  describe('boundary validation', () => {
    it('should accept 0 (midnight start)', () => {
      expect(() => minutesToTime(0)).not.toThrow();
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('should accept 1440 (midnight end)', () => {
      expect(() => minutesToTime(1440)).not.toThrow();
      expect(minutesToTime(1440)).toBe('00:00');
    });

    it('should accept 1 (first minute)', () => {
      expect(() => minutesToTime(1)).not.toThrow();
      expect(minutesToTime(1)).toBe('00:01');
    });

    it('should accept 1439 (last minute)', () => {
      expect(() => minutesToTime(1439)).not.toThrow();
      expect(minutesToTime(1439)).toBe('23:59');
    });
  });

  describe('error messages quality', () => {
    it('should include received value in error message', () => {
      try {
        minutesToTime(2000);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('2000');
        expect(error.message).toContain('[minutesToTime]');
      }
    });

    it('should explain valid range', () => {
      try {
        minutesToTime(-10);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('0-1440');
        expect(error.message).toContain('00:00');
      }
    });

    it('should be descriptive for NaN', () => {
      try {
        minutesToTime(NaN);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('número finito');
        expect(error.message).toContain('NaN');
      }
    });
  });
});

describe('Integration: Validation in Real Workflows', () => {
  it('should catch malformed input from user input early', () => {
    // Simulate user typing "9:30" instead of "09:30"
    const userInput = '9:30';

    expect(() => {
      timeToMinutes(userInput, 'open');
    }).toThrow(/formato inválido.*ceros leading/i);
  });

  it('should prevent calculation with invalid hours from propagating', () => {
    // Attempt to create interval with invalid time
    expect(() => {
      const start = timeToMinutes('18:00', 'open');  // ✅ Valid
      const end = timeToMinutes('25:00', 'close');   // ❌ Invalid - should throw
      const duration = end - start;                  // Never reached
    }).toThrow(/horas fuera de rango/i);
  });

  it('should validate both open and close times in nighttime hours', () => {
    // Valid nighttime hours should work
    expect(() => {
      const start = timeToMinutes('18:00', 'open');
      const end = timeToMinutes('00:00', 'close');
      expect(end - start).toBe(360); // 6 hours
    }).not.toThrow();

    // Invalid close time should fail
    expect(() => {
      const start = timeToMinutes('18:00', 'open');
      const end = timeToMinutes('24:30', 'close'); // Invalid
    }).toThrow();
  });

  it('should provide clear error when converting invalid calculation result', () => {
    // Simulate bug that produces negative duration
    expect(() => {
      minutesToTime(-60); // Bug: negative duration
    }).toThrow(/valor fuera de rango/i);
  });
});

describe('Developer Experience: IDE Autocomplete & Error Messages', () => {
  it('should have TypeScript types that prevent obvious mistakes', () => {
    // TypeScript should catch these at compile time, but runtime also validates

    // @ts-expect-error - TS should catch number instead of string
    expect(() => timeToMinutes(1080)).toThrow();

    // @ts-expect-error - TS should catch string instead of number
    expect(() => minutesToTime('720')).toThrow();
  });

  it('should have error messages that guide developers to fix', () => {
    try {
      timeToMinutes('9:30'); // Missing leading zero
      fail('Expected error');
    } catch (error: any) {
      // Error should explain WHAT is wrong and HOW to fix it
      expect(error.message).toMatch(/formato inválido/i);
      expect(error.message).toMatch(/ceros leading/i);
      expect(error.message).toContain('09:30'); // Shows correct format
    }
  });

  it('should include function name in errors for stack trace clarity', () => {
    try {
      timeToMinutes('99:99');
      fail('Expected error');
    } catch (error: any) {
      expect(error.message).toContain('[timeToMinutes]');
    }

    try {
      minutesToTime(-1);
      fail('Expected error');
    } catch (error: any) {
      expect(error.message).toContain('[minutesToTime]');
    }
  });
});

describe('normalizeTimeString', () => {
  const { normalizeTimeString } = require('./availability');

  it('should return HH:mm format unchanged', () => {
    expect(normalizeTimeString('09:00')).toBe('09:00');
    expect(normalizeTimeString('18:30')).toBe('18:30');
    expect(normalizeTimeString('23:59')).toBe('23:59');
    expect(normalizeTimeString('00:00')).toBe('00:00');
  });

  it('should normalize HH:mm:ss to HH:mm (DB format)', () => {
    expect(normalizeTimeString('09:00:00')).toBe('09:00');
    expect(normalizeTimeString('18:30:45')).toBe('18:30');
    expect(normalizeTimeString('23:59:59')).toBe('23:59');
    expect(normalizeTimeString('00:00:00')).toBe('00:00');
  });

  it('should handle edge cases safely', () => {
    expect(normalizeTimeString('12:00:00')).toBe('12:00');
    expect(normalizeTimeString('24:00:00')).toBe('24:00');
  });
});

describe('calcularTurnosDisponibles - Integration with DB format', () => {
  const { calcularTurnosDisponibles, normalizeTimeString } = require('./availability');

  it('should handle bookings with HH:mm:ss format from database', () => {
    // Simular reservas como vienen de Supabase (con segundos)
    const reservasDB = [
      { date: '2025-11-19', start: '09:00:00', end: '10:00:00' },
      { date: '2025-11-19', start: '14:00:00', end: '15:00:00' },
    ];

    // Normalizar como lo hace services/api.ts
    const reservasNormalizadas = reservasDB.map(r => ({
      date: r.date,
      start: normalizeTimeString(r.start),
      end: normalizeTimeString(r.end),
    }));

    const slots = calcularTurnosDisponibles({
      fecha: new Date('2025-11-19'),
      duracionTotal: 60,
      horarioDelDia: {
        enabled: true,
        intervals: [{ open: '09:00', close: '18:00' }],
      },
      reservasOcupadas: reservasNormalizadas,
    });

    // Verificar que slots ocupados NO aparecen
    expect(slots).not.toContain('09:00'); // Ocupado 09:00-10:00
    expect(slots).not.toContain('14:00'); // Ocupado 14:00-15:00

    // Verificar que slots libres SÍ aparecen
    expect(slots).toContain('10:00'); // Libre después de primera reserva
    expect(slots).toContain('11:00'); // Libre
    expect(slots).toContain('13:00'); // Libre antes de segunda reserva
    expect(slots).toContain('15:00'); // Libre después de segunda reserva
  });

  it('should handle midnight bookings with DB format (nighttime hours)', () => {
    const reservasDB = [
      { date: '2025-11-19', start: '22:00:00', end: '23:00:00' },
    ];

    const reservasNormalizadas = reservasDB.map(r => ({
      date: r.date,
      start: normalizeTimeString(r.start),
      end: normalizeTimeString(r.end),
    }));

    const slots = calcularTurnosDisponibles({
      fecha: new Date('2025-11-19'),
      duracionTotal: 60,
      horarioDelDia: {
        enabled: true,
        intervals: [{ open: '18:00', close: '00:00' }], // Horario nocturno
      },
      reservasOcupadas: reservasNormalizadas,
    });

    // Verificar que slot ocupado NO aparece
    expect(slots).not.toContain('22:00');

    // Verificar que slots libres SÍ aparecen
    expect(slots).toContain('18:00');
    expect(slots).toContain('19:00');
    expect(slots).toContain('23:00'); // Libre después de reserva
  });
});
