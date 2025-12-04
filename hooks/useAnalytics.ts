import { useState, useEffect } from 'react';
import { supabaseBackend } from '../services/supabaseBackend';
import { AnalyticsResponse } from '../types';

/**
 * Custom hook para cargar datos de analytics con gestión de estado.
 * Evita duplicación de lógica entre componentes de analytics.
 * 
 * @param period - 'week' | 'month' - Período de análisis
 * @param includeHistory - Si se deben incluir datos históricos
 * @returns { data, loading, error, refetch }
 */
export const useAnalytics = (period: 'week' | 'month', includeHistory: boolean = false) => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await supabaseBackend.getAnalytics(period, includeHistory);
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('No se pudieron cargar las estadísticas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, includeHistory]);

  return { data, loading, error, refetch: fetchAnalytics };
};
