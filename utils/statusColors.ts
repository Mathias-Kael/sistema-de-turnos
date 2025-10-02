import { BookingStatus } from '../types';

export const statusColors: Record<BookingStatus, string> = {
    pending: 'var(--color-state-warning-text)',
    confirmed: 'var(--color-state-success-text)',
    cancelled: 'var(--color-state-danger-text)',
};

export const statusBackgroundColors: Record<BookingStatus, string> = {
    pending: 'var(--color-state-warning-bg)',
    confirmed: 'var(--color-state-success-bg)',
    cancelled: 'var(--color-state-danger-bg)',
};