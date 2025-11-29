import React, { useMemo } from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { imageStorage } from '../../services/imageStorage';
import { Wrench, Users, Calendar, Clock } from 'lucide-react';
import { SecondaryText } from '../ui';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-surface p-4 rounded-lg shadow-md border border-default flex items-center">
        <Icon className="h-8 w-8 mr-4 text-primary" />
        <div>
            <SecondaryText>{title}</SecondaryText>
            <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
    </div>
);

export const DashboardView: React.FC = () => {
    const business = useBusinessState();

    const { bookingsToday, nextBooking } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const bookingsToday = business.bookings.filter(b => b.date === today && b.status !== 'cancelled');
        
        const upcomingBookings = bookingsToday
            .filter(b => new Date(`${b.date}T${b.start}`) > new Date())
            .sort((a, b) => a.start.localeCompare(b.start));
            
        return {
            bookingsToday: bookingsToday.length,
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Servicios Activos" value={business.services.length} icon={Wrench} />
                <StatCard title="Empleados" value={business.employees.length} icon={Users} />
                <StatCard title="Reservas para Hoy" value={bookingsToday} icon={Calendar} />
                <StatCard title="Próxima Reserva" value={nextBooking ? nextBooking.start.slice(0,5) : 'N/A'} icon={Clock} />
            </div>

            {nextBooking && (
                <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
                    <h4 className="font-semibold text-primary mb-2">Detalles de la Próxima Reserva</h4>
                    <p><span className="font-semibold">Cliente:</span> {nextBooking.client.name}</p>
                    <p><span className="font-semibold">Hora:</span> {nextBooking.start.slice(0,5)} - {nextBooking.end.slice(0,5)}</p>
                    <p><span className="font-semibold">Servicios:</span> {nextBooking.services.map(s => s.name).join(', ')}</p>
                </div>
            )}
        </div>
    );
};