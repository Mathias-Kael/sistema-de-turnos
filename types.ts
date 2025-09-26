// types.ts

export interface Branding {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  font: string;
}

export interface Employee {
  id: string;
  name: string;
  avatarUrl: string;
  hours: Hours; // Horario individual del empleado
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  buffer: number; // in minutes
  price: number;
  requiresDeposit?: boolean;
  employeeIds: string[];
}

export interface Interval {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface DayHours {
  enabled: boolean;
  intervals: Interval[];
}

export type Hours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export interface Business {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  phone: string;
  branding: Branding;
  employees: Employee[];
  services: Service[];
  hours: Hours;
}

// Types related to bookings/reservations
export interface Client {
  name: string;
  email?: string;
  phone: string;
}

export interface BookingService {
    id: string;
    name: string;
    price: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
    id: string;
    client: Client;
    date: string; // "YYYY-MM-DD"
    start: string; // "HH:mm"
    end: string; // "HH:mm"
    services: BookingService[];
    employeeId: string;
    status: BookingStatus;
    notes?: string;
}
