import React from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="fixed top-0 right-0 h-full w-64 bg-surface shadow-lg p-6 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-8">
          <button onClick={onClose} aria-label="Cerrar menú">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav>
          <ul className="space-y-4">
            <li><a href="#" className="text-lg text-primary hover:underline">Inicio</a></li>
            <li><a href="#" className="text-lg text-primary hover:underline">Servicios</a></li>
            <li><a href="#" className="text-lg text-primary hover:underline">Contacto</a></li>
          </ul>
        </nav>
      </div>
    </div>
  );
};