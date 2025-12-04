import React, { useEffect, useState } from 'react';
import { supabaseBackend } from '../../services/supabaseBackend';
import { AnalyticsResponse } from '../../types';
import { StatCard } from '../admin/analytics/StatCard';
import { DollarSign, Calendar, TrendingUp, Activity, PieChart as PieIcon } from 'lucide-react';
import { LoadingSpinner, ErrorMessage } from '../ui';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalyticsView: React.FC = () => {
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
      <div className="flex justify-center items-center h-full">
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

  // Prepare data for charts
  const topServicesData = analytics.topServices.map(s => ({
    name: s.servicio,
    reservas: s.total_reservas,
    ingresos: s.ingresos_total
  })).slice(0, 5);

  const peakDaysData = analytics.peakDays.map(d => ({
    name: d.dia_nombre,
    value: d.total_reservas
  }));

  // Mock data for Revenue Comparison (Current vs Previous) since we don't have time series
  const getPeriodLabel = (isCurrent: boolean) => {
    if (period === 'week') return isCurrent ? 'Esta Semana' : 'Semana Anterior';
    if (period === 'month') return isCurrent ? 'Este Mes' : 'Mes Anterior';
    return isCurrent ? 'Actual' : 'Anterior';
  };

  const revenueComparisonData = [
    { name: getPeriodLabel(false), amount: analytics.revenue.previousAmount || 0 },
    { name: getPeriodLabel(true), amount: analytics.revenue.amount }
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <Activity className="mr-2 h-6 w-6 text-primary" />
            Analytics Pro
          </h2>
          <p className="text-gray-500 text-sm">Análisis detallado de rendimiento</p>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Chart */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" /> Comparativa de Ingresos
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={60} animationDuration={1500}>
                  {revenueComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? '#4F46E5' : '#9CA3AF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Services Chart */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" /> Servicios Más Solicitados
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServicesData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Reservas']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="reservas" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Days Pie Chart */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <PieIcon className="w-5 h-5 mr-2" /> Días con Mayor Demanda
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={peakDaysData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {peakDaysData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequent Clients List (Enhanced) */}
        <div className="bg-surface p-4 rounded-lg shadow-md border border-default">
          <h3 className="font-bold text-lg text-primary mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" /> Clientes Frecuentes
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-64 pr-2">
            {analytics.frequentClients.map((client, index) => (
              <div key={index} className="relative">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{client.cliente}</span>
                  <span className="font-bold text-primary">{client.total_reservas} reservas</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((client.total_reservas / (analytics.frequentClients[0]?.total_reservas || 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1 text-right">
                  Última visita: {new Date(client.ultima_visita).toLocaleDateString()}
                </div>
              </div>
            ))}
            {analytics.frequentClients.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay datos de clientes aún.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
