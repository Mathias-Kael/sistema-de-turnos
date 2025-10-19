import React from 'react';
import { Link } from 'react-router-dom';

// Asumimos que el logo está en /assets/logo-astra.png
const logoUrl = '/assets/logo-astra.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="absolute top-0 left-0 right-0 px-8 py-6">
        <Link to="/" aria-label="Volver al inicio">
          <img src={logoUrl} alt="Astra Logo" className="h-10 w-auto" />
        </Link>
      </header>
      <main className="min-h-screen flex items-center justify-center">
        {children}
      </main>
    </div>
  );
};