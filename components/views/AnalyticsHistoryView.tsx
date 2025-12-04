import React, { useState, useMemo, useEffect } from 'react';
import { LoadingSpinner, ErrorMessage, Button } from '../ui';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { ArrowLeft, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface AnalyticsHistoryViewProps {
  onBack: () => void;
}

export const AnalyticsHistoryView: React.FC<AnalyticsHistoryViewProps> = ({ onBack }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [isMounted, setIsMounted] = useState(false);
  const { data, loading, error } = useAnalytics(period, true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoizar datos ANTES de cualquier return condicional
  const chartData = useMemo(() => {
    if (!data || !data.analytics.historical) return [];
    return data.analytics.historical.map(item => ({
      name: item.period,
      ingresos: item.revenue,
      reservas: item.bookings
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message={error} />
        <Button onClick={onBack} className="mt-4" variant="secondary">
          Volver
        </Button>
      </div>
    );
  }

  if (!data || !data.analytics.historical) return null;

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-primary flex items-center">
              <TrendingUp className="mr-2 h-6 w-6 text-primary" />
              Historial de Rendimiento
            </h2>
            <p className="text-gray-500 text-sm">Evolución de tu negocio en el tiempo</p>
          </div>
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
            Por Semanas
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
            Por Meses
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Revenue Trend */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" /> Evolución de Ingresos
          </h3>
          <div className="h-80 w-full" style={{ minHeight: '320px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#4F46E5" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bookings Trend */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> Evolución de Reservas
          </h3>
          <div className="h-64 w-full" style={{ minHeight: '256px' }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Reservas']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reservas" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
