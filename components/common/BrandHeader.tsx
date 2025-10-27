import React from 'react';
import { Link } from 'react-router-dom';
// TODO: Crear archivo de iconos en src/assets/icons.tsx con AstraLogo
// import { AstraLogo } from '../../src/assets/icons';

// Placeholder SVG hasta que se cree el archivo de assets
const AstraLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="currentColor" opacity="0.2"/>
    <circle cx="20" cy="20" r="12" fill="currentColor"/>
  </svg>
);

export const BrandHeader: React.FC = () => {
  return (
    <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 select-none">
        <AstraLogo className="w-10 h-10" />
        <span className="text-2xl font-bold text-primary">ASTRA</span>
      </Link>
      <div>
        <Link
          to="/login"
          className="text-primary font-medium hover:underline underline-offset-4"
        >
          ¿Ya tenés cuenta? Ingresá
        </Link>
      </div>
    </header>
  );
};