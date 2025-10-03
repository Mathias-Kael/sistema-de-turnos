import { useState, useMemo } from 'react';

export type AdminTab = 'info' | 'services' | 'employees' | 'hours' | 'share' | 'reservations' | 'preview';

interface UseAdminTabsResult {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  tabs: { id: AdminTab; label: string }[];
}

/**
 * Hook centralizado para la definición de tabs del panel admin.
 * Futuro: aquí se podrá filtrar/ordenar tabs según roles, flags o features dinámicas.
 */
export function useAdminTabs(initial: AdminTab = 'info'): UseAdminTabsResult {
  const [activeTab, setActiveTab] = useState<AdminTab>(initial);

  const tabs = useMemo(() => (
    [
      { id: 'info' as const, label: 'Info y Estilo' },
      { id: 'services' as const, label: 'Servicios' },
      { id: 'employees' as const, label: 'Empleados' },
      { id: 'hours' as const, label: 'Horarios' },
      { id: 'reservations' as const, label: 'Reservas' },
      { id: 'share' as const, label: 'Compartir' },
      { id: 'preview' as const, label: 'Vista Previa' },
    ]
  ), []);

  return { activeTab, setActiveTab, tabs };
}
