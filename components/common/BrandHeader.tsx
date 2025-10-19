import React from 'react';
import { Link } from 'react-router-dom';
import { AstraLogo } from '../../src/assets/icons';

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