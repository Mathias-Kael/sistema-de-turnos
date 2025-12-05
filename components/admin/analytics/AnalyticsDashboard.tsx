import React, { useState, useMemo } from 'react';
import { StatCard } from './StatCard';
import { TopServicesList } from './TopServicesList';
import { FrequentClientsList } from './FrequentClientsList';
import { PeakDaysChart } from './PeakDaysChart';
import { DollarSign, Calendar, TrendingUp, Activity } from 'lucide-react';
import { LoadingSpinner, ErrorMessage, Button } from '../../ui';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useBusinessState } from '../../../context/BusinessContext';

export const AnalyticsDashboard: React.FC = () => {
  const business = useBusinessState();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data, loading, error, refetch } = useAnalytics(period, false, business.id);

  // Memoizar cálculo de total de reservas
  const totalBookings = useMemo(() => {
    if (!data) return 0;
    return data.analytics.peakDays.reduce((acc, day) => acc + day.total_reservas, 0);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message={error} />
        <Button 
          onClick={refetch} 
          className="mt-4"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { analytics } = data;

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <Activity className="mr-2 h-6 w-6 text-primary" />
            Panel de Control
          </h2>
          <p className="text-gray-500 text-sm">Resumen de rendimiento de tu negocio</p>
        </div>
        
        <div className="bg-surface p-1 rounded-lg border border-default inline-flex shadow-sm">
          <button
            onClick={() => setPeriod('week')}
            disabled={loading}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'week' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            disabled={loading}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'month' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Este Mes
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Ingresos Totales" 
          value={analytics.revenue.amount} 
          icon={DollarSign} 
          prefix="$" 
          highlight={true}
          previousValue={analytics.revenue.previousAmount}
        />
        <StatCard 
          title="Reservas Totales" 
          value={totalBookings} 
          icon={Calendar} 
        />
        <StatCard 
          title="Servicio Top" 
          value={analytics.topServices[0]?.total_reservas || 0} 
          icon={TrendingUp}
          suffix=" reservas"
        />
        <StatCard 
          title="Clientes Activos" 
          value={analytics.frequentClients.length} 
          icon={Activity} 
        />
      </div>

      {/* Charts & Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PeakDaysChart days={analytics.peakDays} />
          <TopServicesList services={analytics.topServices} />
        </div>
        <div className="space-y-6">
          <FrequentClientsList clients={analytics.frequentClients} />
        </div>
      </div>
    </div>
  );
};
