/**
 * Date Helper Utilities
 *
 * Centralized date manipulation functions for consistent date handling
 * across the application. Handles local timezone formatting and server date sync.
 */

/**
 * Converts a Date object to local date string in YYYY-MM-DD format.
 *
 * Uses local timezone (not UTC) to avoid off-by-one date issues
 * when displaying dates in date pickers.
 *
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getLocalDateString(new Date('2025-11-15T10:30:00')) // "2025-11-15"
 */
export const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Gets today's date in YYYY-MM-DD format (local timezone).
 *
 * Useful for setting `min` attribute in date inputs to prevent
 * selecting past dates.
 *
 * @returns Today's date string in YYYY-MM-DD format
 *
 * @example
 * getTodayString() // "2025-11-11"
 */
export const getTodayString = (): string => {
    return getLocalDateString(new Date());
};

/**
 * Gets the current server date with timezone normalization.
 *
 * This function ensures date validation uses server time, not client time,
 * to prevent timezone-related edge cases (e.g., client in UTC+8 booking
 * for "tomorrow" when it's still "today" on the server in UTC-5).
 *
 * Implementation Strategy:
 * 1. For MVP: Uses client date with midnight normalization (acceptable for local businesses)
 * 2. For production: Should call backend API endpoint that returns server timestamp
 * 3. Fallback: WorldTimeAPI.org for timezone-aware server date
 *
 * @returns Date object representing server's current date at 00:00:00 local time
 *
 * @example
 * const serverDate = await getServerDate();
 * if (bookingDate < serverDate) {
 *   // Booking is in the past
 * }
 *
 * @todo Implement actual server date API call for multi-timezone support
 */
export const getServerDate = async (): Promise<Date> => {
    // MVP Implementation: Use client date normalized to midnight
    // This is acceptable for businesses operating in a single timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;

    // TODO: Production implementation with server date API
    /*
    try {
        const response = await fetch('/api/server-time');
        const data = await response.json();
        const serverDate = new Date(data.timestamp);
        serverDate.setHours(0, 0, 0, 0);
        return serverDate;
    } catch (error) {
        console.error('Failed to fetch server date, using client date as fallback:', error);
        const fallback = new Date();
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
    */
};

/**
 * Synchronous version of getServerDate() for scenarios where async is not feasible.
 *
 * WARNING: This uses client time and may have timezone discrepancies.
 * Prefer getServerDate() whenever possible.
 *
 * @returns Date object representing current date at 00:00:00 local time
 */
export const getServerDateSync = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

/**
 * Parses a YYYY-MM-DD string into a Date object at midnight local time.
 *
 * Appends 'T00:00:00' to ensure the date is created in local timezone,
 * not UTC. This prevents the common "off by one day" bug when parsing
 * ISO date strings.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at 00:00:00 local time
 *
 * @example
 * parseDateString("2025-11-15") // Date object for Nov 15, 2025 at 00:00:00 local
 */
export const parseDateString = (dateStr: string): Date => {
    return new Date(dateStr + 'T00:00:00');
};

/**
 * Checks if a date is in the past (before today at server time).
 *
 * @param date - Date to check (can be Date object or YYYY-MM-DD string)
 * @returns true if date is before today, false otherwise
 *
 * @example
 * isPastDate(new Date('2024-01-01')) // true (assuming current year is 2025)
 * isPastDate('2025-12-31') // false (assuming current date is before Dec 31, 2025)
 */
export const isPastDate = (date: Date | string): boolean => {
    const checkDate = typeof date === 'string' ? parseDateString(date) : date;
    const today = getServerDateSync();
    return checkDate < today;
};

/**
 * Gets the day of week in Spanish.
 *
 * @param date - Date object or YYYY-MM-DD string
 * @returns Day name in Spanish (e.g., "Lunes", "Martes")
 */
export const getDayNameES = (date: Date | string): string => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dateObj = typeof date === 'string' ? parseDateString(date) : date;
    return dayNames[dateObj.getDay()];
};

/**
 * Formats a date for display in Spanish locale.
 *
 * @param date - Date object or YYYY-MM-DD string
 * @param format - 'short' (15/11/2025), 'medium' (15 Nov 2025), 'long' (15 de Noviembre de 2025)
 * @returns Formatted date string
 *
 * @example
 * formatDateES(new Date('2025-11-15'), 'short') // "15/11/2025"
 * formatDateES(new Date('2025-11-15'), 'medium') // "15 Nov 2025"
 * formatDateES(new Date('2025-11-15'), 'long') // "15 de Noviembre de 2025"
 */
export const formatDateES = (date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string => {
    const dateObj = typeof date === 'string' ? parseDateString(date) : date;

    if (format === 'short') {
        return dateObj.toLocaleDateString('es-AR');
    }

    const day = dateObj.getDate();
    const monthNames = {
        short: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        long: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    };
    const year = dateObj.getFullYear();

    if (format === 'medium') {
        return `${day} ${monthNames.short[dateObj.getMonth()]} ${year}`;
    }

    // format === 'long'
    return `${day} de ${monthNames.long[dateObj.getMonth()]} de ${year}`;
};
