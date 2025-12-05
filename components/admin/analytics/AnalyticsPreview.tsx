import React, { useEffect, useState } from 'react';
import { supabaseBackend } from '../../../services/supabaseBackend';
import { AnalyticsResponse } from '../../../types';
import { StatCard } from './StatCard';
import { DollarSign, Calendar, TrendingUp, Activity } from 'lucide-react';
import { LoadingSpinner, ErrorMessage } from '../../ui';
import { useBusinessState } from '../../../context/BusinessContext';

export const AnalyticsPreview: React.FC = () => {
  const business = useBusinessState();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await supabaseBackend.getAnalytics('week', false, business.id);
        setData(response);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las estadísticas.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently fail in preview or show minimal error
  }

  const { analytics } = data;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard 
        title="Ingresos (Semana)" 
        value={analytics.revenue.amount} 
        icon={DollarSign} 
        prefix="$" 
        highlight={true}
        previousValue={analytics.revenue.previousAmount}
      />
      <StatCard 
        title="Reservas" 
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
  );
};
