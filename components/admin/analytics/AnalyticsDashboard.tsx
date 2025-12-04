import React, { useEffect, useState } from 'react';
import { supabaseBackend } from '../../../services/supabaseBackend';
import { AnalyticsResponse } from '../../../types';
import { StatCard } from './StatCard';
import { TopServicesList } from './TopServicesList';
import { FrequentClientsList } from './FrequentClientsList';
import { PeakDaysChart } from './PeakDaysChart';
import { DollarSign, Calendar, TrendingUp, Activity } from 'lucide-react';
import { LoadingSpinner, ErrorMessage } from '../../ui';

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await supabaseBackend.getAnalytics(period);
        setData(response);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las estadísticas. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

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
        <button 
          onClick={() => setPeriod(period)} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Reintentar
        </button>
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
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'week' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'month' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
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
          value={analytics.peakDays.reduce((acc, day) => acc + day.total_reservas, 0)} 
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
