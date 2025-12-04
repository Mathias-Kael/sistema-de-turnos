import React, { useMemo } from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { imageStorage } from '../../services/imageStorage';
import { SecondaryText } from '../ui';
import { AnalyticsPreview } from '../admin/analytics/AnalyticsPreview';

export const DashboardView: React.FC = () => {
    const business = useBusinessState();

    const { nextBooking } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const bookingsToday = business.bookings.filter(b => b.date === today && b.status !== 'cancelled');
        
        const upcomingBookings = bookingsToday
            .filter(b => new Date(`${b.date}T${b.start}`) > new Date())
            .sort((a, b) => a.start.localeCompare(b.start));
            
        return {
            nextBooking: upcomingBookings[0] || null,
        };
    }, [business.bookings]);

    return (
        <div className="p-4 sm:p-6 space-y-6" data-testid="dashboard-view">
            <div>
                <h2 className="text-2xl font-bold text-primary">🏠 Página de inicio</h2>
                <SecondaryText>Un resumen de tu negocio.</SecondaryText>
            </div>

            <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden h-48 md:h-64 w-full">
                    <img
                        src={business.coverImageUrl ? imageStorage.getImageUrl(business.coverImageUrl) : '/default-cover.jpg'}
                        alt="Portada del negocio"
                        className="w-full h-full object-cover"
                    />
                </div>
                <h3 className="text-xl font-bold text-primary">{business.name}</h3>
            </div>

            {/* Analytics Preview Section */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-3">Resumen Semanal</h3>
                <AnalyticsPreview />
            </div>

            {nextBooking && (
                <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
                    <h4 className="font-semibold text-primary mb-2">Próxima Reserva Hoy</h4>
                    <p><span className="font-semibold">Cliente:</span> {nextBooking.client.name}</p>
                    <p><span className="font-semibold">Hora:</span> {nextBooking.start.slice(0,5)} - {nextBooking.end.slice(0,5)}</p>
                    <p><span className="font-semibold">Servicios:</span> {nextBooking.services.map(s => s.name).join(', ')}</p>
                </div>
            )}
        </div>
    );
};
