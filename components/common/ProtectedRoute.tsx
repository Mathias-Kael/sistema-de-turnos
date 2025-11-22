import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="p-6 text-center">Cargando...</div>;
  
  // La redirección ahora es manejada por AuthRedirector en App.tsx
  return user ? <Outlet /> : null;
};

export default ProtectedRoute;
