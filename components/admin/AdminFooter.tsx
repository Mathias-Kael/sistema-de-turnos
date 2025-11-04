import React from 'react';
import { Home, Wrench, Calendar } from 'lucide-react';

export type AdminTab = 'DASHBOARD' | 'MANAGEMENT' | 'RESERVATIONS';

interface AdminFooterProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'DASHBOARD', label: 'Inicio', icon: Home },
  { id: 'MANAGEMENT', label: 'Gestión', icon: Wrench },
  { id: 'RESERVATIONS', label: 'Reservas', icon: Calendar },
];

export const AdminFooter: React.FC<AdminFooterProps> = ({ activeTab, onTabChange }) => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-40">
      <nav className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <tab.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </footer>
  );
};