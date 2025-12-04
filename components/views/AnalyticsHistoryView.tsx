import React, { useEffect, useState } from 'react';
import { supabaseBackend } from '../../services/supabaseBackend';
import { AnalyticsResponse } from '../../types';
import { LoadingSpinner, ErrorMessage } from '../ui';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react';

interface AnalyticsHistoryViewProps {
  onBack: () => void;
}

export const AnalyticsHistoryView: React.FC<AnalyticsHistoryViewProps> = ({ onBack }) => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Request history data
        const response = await supabaseBackend.getAnalytics(period, true);
        setData(response);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el historial.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [period]);

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
        <button onClick={onBack} className="mt-4 text-primary hover:underline">
          Volver
        </button>
      </div>
    );
  }

  if (!data || !data.analytics.historical) return null;

  const { historical } = data.analytics;

  // Format data for charts
  const chartData = historical.map(item => ({
    name: item.period,
    ingresos: item.revenue,
    reservas: item.bookings
  }));

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
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'week' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
          >
            Por Semanas
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'month' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
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
            <DollarSignIcon className="w-5 h-5 mr-2" /> Evolución de Ingresos
          </h3>
          <div className="h-80 w-full">
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
          </div>
        </div>

        {/* Bookings Trend */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> Evolución de Reservas
          </h3>
          <div className="h-64 w-full">
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
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper icon component
const DollarSignIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" x2="12" y1="2" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
