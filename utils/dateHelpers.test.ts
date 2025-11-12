import {
    getLocalDateString,
    getTodayString,
    getServerDateSync,
    parseDateString,
    isPastDate,
    getDayNameES,
    formatDateES
} from './dateHelpers';

describe('dateHelpers', () => {
    describe('getLocalDateString', () => {
        it('should format date in YYYY-MM-DD using local timezone', () => {
            const date = new Date(2025, 10, 15, 14, 30); // Nov 15, 2025, 2:30 PM local
            expect(getLocalDateString(date)).toBe('2025-11-15');
        });

        it('should pad single-digit months and days with zeros', () => {
            const date = new Date(2025, 0, 5); // Jan 5, 2025
            expect(getLocalDateString(date)).toBe('2025-01-05');
        });

        it('should handle year-end dates correctly', () => {
            const date = new Date(2025, 11, 31); // Dec 31, 2025
            expect(getLocalDateString(date)).toBe('2025-12-31');
        });
    });

    describe('getTodayString', () => {
        it('should return today\'s date in YYYY-MM-DD format', () => {
            const result = getTodayString();
            const today = new Date();
            const expected = getLocalDateString(today);
            expect(result).toBe(expected);
        });
    });

    describe('getServerDateSync', () => {
        it('should return date normalized to midnight', () => {
            const result = getServerDateSync();
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it('should return today\'s date', () => {
            const result = getServerDateSync();
            const today = new Date();
            expect(result.getDate()).toBe(today.getDate());
            expect(result.getMonth()).toBe(today.getMonth());
            expect(result.getFullYear()).toBe(today.getFullYear());
        });
    });

    describe('parseDateString', () => {
        it('should parse YYYY-MM-DD string to local midnight, not UTC', () => {
            // This is the critical test that prevents the timezone bug
            const result = parseDateString('2025-11-15');

            // Should be Nov 15 at midnight LOCAL time, not UTC
            expect(result.getDate()).toBe(15);
            expect(result.getMonth()).toBe(10); // November (0-indexed)
            expect(result.getFullYear()).toBe(2025);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        it('should not shift dates due to timezone when displayed', () => {
            // The bug was: new Date("2025-11-15") in UTC-3 would show as Nov 14
            // Our fix: parseDateString("2025-11-15") should show as Nov 15
            const date = parseDateString('2025-11-11');
            const formatted = date.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit'
            });

            // Should show correct weekday and date, not shifted
            // Nov 11, 2025 is a Tuesday
            expect(formatted).toContain('11');
            expect(formatted).toContain('martes');
        });

        it('should handle year boundaries correctly', () => {
            const result = parseDateString('2025-01-01');
            expect(result.getDate()).toBe(1);
            expect(result.getMonth()).toBe(0);
            expect(result.getFullYear()).toBe(2025);
        });
    });

    describe('isPastDate', () => {
        it('should return true for dates before today', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterday);

            expect(isPastDate(yesterdayStr)).toBe(true);
            expect(isPastDate(yesterday)).toBe(true);
        });

        it('should return false for today', () => {
            const today = new Date();
            const todayStr = getLocalDateString(today);

            expect(isPastDate(todayStr)).toBe(false);
            expect(isPastDate(today)).toBe(false);
        });

        it('should return false for future dates', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = getLocalDateString(tomorrow);

            expect(isPastDate(tomorrowStr)).toBe(false);
            expect(isPastDate(tomorrow)).toBe(false);
        });
    });

    describe('getDayNameES', () => {
        it('should return correct Spanish day names', () => {
            // Test a known date: Nov 11, 2025 is Tuesday
            expect(getDayNameES('2025-11-11')).toBe('Martes');

            // Test another known date: Nov 10, 2025 is Monday
            expect(getDayNameES('2025-11-10')).toBe('Lunes');

            // Test Sunday: Nov 9, 2025
            expect(getDayNameES('2025-11-09')).toBe('Domingo');
        });

        it('should work with Date objects', () => {
            const tuesday = parseDateString('2025-11-11');
            expect(getDayNameES(tuesday)).toBe('Martes');
        });
    });

    describe('formatDateES', () => {
        const testDate = '2025-11-15'; // Nov 15, 2025

        it('should format in short format (DD/MM/YYYY)', () => {
            const result = formatDateES(testDate, 'short');
            // es-AR format is DD/MM/YYYY
            expect(result).toMatch(/15\/11\/2025/);
        });

        it('should format in medium format (DD MMM YYYY)', () => {
            const result = formatDateES(testDate, 'medium');
            expect(result).toBe('15 Nov 2025');
        });

        it('should format in long format (DD de MMMM de YYYY)', () => {
            const result = formatDateES(testDate, 'long');
            expect(result).toBe('15 de Noviembre de 2025');
        });

        it('should default to medium format', () => {
            const result = formatDateES(testDate);
            expect(result).toBe('15 Nov 2025');
        });

        it('should work with Date objects', () => {
            const date = parseDateString(testDate);
            const result = formatDateES(date, 'medium');
            expect(result).toBe('15 Nov 2025');
        });

        it('should handle all months correctly', () => {
            expect(formatDateES('2025-01-15', 'medium')).toBe('15 Ene 2025');
            expect(formatDateES('2025-02-15', 'medium')).toBe('15 Feb 2025');
            expect(formatDateES('2025-12-15', 'medium')).toBe('15 Dic 2025');
        });
    });

    describe('timezone bug prevention', () => {
        it('should not suffer from UTC midnight timezone shift bug', () => {
            // Regression test for the specific bug we fixed in HoursEditor.tsx
            // Bug: new Date("2025-11-11") interpreted as UTC midnight
            //      In UTC-3 (Argentina), displayed as Nov 10 at 21:00

            const dateString = '2025-11-11';
            const buggyParsing = new Date(dateString); // OLD WAY (buggy)
            const correctParsing = parseDateString(dateString); // NEW WAY (fixed)

            // The buggy way would show wrong day in UTC-3 timezone
            // The correct way should always show the right day
            expect(correctParsing.getDate()).toBe(11);
            expect(correctParsing.getMonth()).toBe(10); // November

            // Verify formatting doesn't shift dates
            const formatted = correctParsing.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'numeric'
            });

            expect(formatted).toContain('11');
        });

        it('should parse dates consistently for comparison', () => {
            // Ensure date comparisons work correctly across timezones
            const date1 = parseDateString('2025-11-10');
            const date2 = parseDateString('2025-11-11');
            const date3 = parseDateString('2025-11-11');

            expect(date1 < date2).toBe(true);
            expect(date2 > date1).toBe(true);
            expect(date2.getTime()).toBe(date3.getTime());
        });
    });
});
