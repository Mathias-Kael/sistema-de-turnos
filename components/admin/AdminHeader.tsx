import React from 'react';
import { Button } from '../ui/Button';
import { Plus, Eye, Link, User } from 'lucide-react';
import InstallPWAButton from '../common/InstallPWAButton';

interface AdminHeaderProps {
  onNewBooking: () => void;
  onPreview: () => void;
  onShare: () => void;
  onSettings: () => void;
  onUserMenuToggle: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onNewBooking,
  onPreview,
  onShare,
  onSettings,
  onUserMenuToggle,
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-40">
      {/* Logo o Nombre del Negocio (Opcional, se puede agregar después) */}
      <div className="flex-1">
        <span className="text-xl font-bold text-primary">ASTRA</span>
      </div>

      {/* Acciones Principales */}
      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={onNewBooking} className="rounded-lg">
          <Plus className="mr-2 h-4 w-4" />
          Reserva
        </Button>
        <InstallPWAButton />
        <Button variant="ghost" size="icon" aria-label="Vista Previa" onClick={onPreview} className="rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Eye className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Compartir" onClick={onShare} className="rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Link className="h-5 w-5" />
        </Button>
        <div className="relative">
            <button onClick={onUserMenuToggle} className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-white font-bold border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <User className="h-5 w-5" />
            </button>
        </div>
      </div>
    </header>
  );
};