
import { Service, Business } from '../types';

export const generateICS = (date: Date, startTime: string, services: Service[], business: Business) => {
    const startDateTime = new Date(`${date.toISOString().split('T')[0]}T${startTime}:00`);
    const totalDuration = services.reduce((acc, s) => acc + s.duration + s.buffer, 0);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

    const toICSFormat = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const event = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//YourAppName//EN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@yourdomain.com`,
        `DTSTAMP:${toICSFormat(new Date())}`,
        `DTSTART:${toICSFormat(startDateTime)}`,
        `DTEND:${toICSFormat(endDateTime)}`,
        `SUMMARY:Cita en ${business.name}`,
        `DESCRIPTION:Tu cita para ${services.map(s => s.name).join(', ')}.`,
        `LOCATION:${business.name}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([event], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cita.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
