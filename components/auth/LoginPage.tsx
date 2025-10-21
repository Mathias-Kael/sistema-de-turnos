import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BenefitsSection } from '../common/BenefitsSection';
import { LoginForm } from './LoginForm';
import { ResetPasswordModal } from './ResetPasswordModal';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === '1') {
      setResetSuccess('Tu contraseña fue restablecida con éxito. Ingresá con tu nueva contraseña.');
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
    }

    if (location.state?.openResetModal) {
      setResetOpen(true);
      // Limpiar el estado para que no se vuelva a abrir en futuras navegaciones
      window.history.replaceState({ ...window.history.state, openResetModal: false }, '');
    }
  }, [location.search, location.state]);

  if (loading) return <div className="fixed inset-0 bg-white flex items-center justify-center">Cargando...</div>;
  if (user) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="grid lg:grid-cols-10 min-h-screen">
        
        {/* Columna Izquierda (70%): Valor y Marca */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center px-8 sm:px-12 lg:px-16 py-16 lg:py-24">
          <div className="w-full max-w-3xl">
            <div className="text-center">
              <img src="/assets/logo-astra.png" alt="Astra Logo" className="h-48 w-auto mx-auto mb-8" />
              <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
                Tu tiempo, en perfecta sincronía.
              </h1>
              <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto">
                La plataforma definitiva para gestionar tus reservas, clientes y equipo. Simple, potente y diseñado para tu crecimiento.
              </p>
            </div>
            <div className="py-20" />
            <BenefitsSection />
          </div>
        </div>

        {/* Columna Derecha (30%): Formulario */}
        <div className="lg:col-span-3 bg-gray-50 flex flex-col justify-center p-8 sm:p-12 border-l border-gray-200">
          <div className="w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Creá una acá
              </Link>
            </p>
            <div className="mt-8">
              {resetSuccess && (
                <div className="mb-4 text-sm text-center text-green-600">
                  {resetSuccess}
                </div>
              )}
              <LoginForm openResetPassword={() => setResetOpen(true)} />
            </div>
          </div>
        </div>

      </div>

      <ResetPasswordModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onSuccess={(message) => {
          setResetOpen(false);
          setResetSuccess(message);
        }}
      />
    </div>
  );
};

export default LoginPage;
