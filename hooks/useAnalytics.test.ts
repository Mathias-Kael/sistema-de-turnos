import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import { supabaseBackend } from '../services/supabaseBackend';

jest.mock('../services/supabaseBackend');

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe cargar analytics exitosamente', async () => {
    const mockData = {
      analytics: {
        revenue: { current: 1000, previous: 800, period: 'week' as const },
        topServices: [],
        frequentClients: [],
        peakDays: []
      }
    };

    (supabaseBackend.getAnalytics as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAnalytics('week'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(supabaseBackend.getAnalytics).toHaveBeenCalledWith('week', false, undefined);
  });

  test('debe manejar errores correctamente', async () => {
    (supabaseBackend.getAnalytics as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalytics('month'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('No se pudieron cargar las estadísticas. Intenta nuevamente.');
    expect(result.current.data).toBeNull();
  });

  test('debe recargar datos cuando cambia el período', async () => {
    const mockData = { analytics: { revenue: { current: 1000, previous: 800, period: 'week' as const }, topServices: [], frequentClients: [], peakDays: [] } };
    (supabaseBackend.getAnalytics as jest.Mock).mockResolvedValue(mockData);

    const { result, rerender } = renderHook(
      ({ period }) => useAnalytics(period),
      { initialProps: { period: 'week' as 'week' | 'month' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabaseBackend.getAnalytics).toHaveBeenCalledWith('week', false, undefined);

    rerender({ period: 'month' });

    await waitFor(() => {
      expect(supabaseBackend.getAnalytics).toHaveBeenCalledWith('month', false, undefined);
    });
  });

  test('debe soportar includeHistory flag', async () => {
    const mockData = { analytics: { revenue: { current: 1000, previous: 800, period: 'week' as const }, topServices: [], frequentClients: [], peakDays: [], historical: [] } };
    (supabaseBackend.getAnalytics as jest.Mock).mockResolvedValue(mockData);

    renderHook(() => useAnalytics('week', true));

    await waitFor(() => {
      expect(supabaseBackend.getAnalytics).toHaveBeenCalledWith('week', true, undefined);
    });
  });

  test('debe enviar businessId cuando se proporciona', async () => {
    const mockData = { analytics: { revenue: { current: 1000, previous: 800, period: 'week' as const }, topServices: [], frequentClients: [], peakDays: [] } };
    (supabaseBackend.getAnalytics as jest.Mock).mockResolvedValue(mockData);

    renderHook(() => useAnalytics('week', false, 123));

    await waitFor(() => {
      expect(supabaseBackend.getAnalytics).toHaveBeenCalledWith('week', false, 123);
    });
  });
});
