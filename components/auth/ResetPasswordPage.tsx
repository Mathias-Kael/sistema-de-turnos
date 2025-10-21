import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { Link } from 'react-router-dom';
import { BenefitsSection } from '../common/BenefitsSection';
import { ResetPasswordForm } from './ResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let eventHandled = false;
    let fallbackTimer: NodeJS.Timeout;

    const handleRecovery = () => {
      if (eventHandled) return;
      eventHandled = true;
      clearTimeout(fallbackTimer);
      setError(null);
      setReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      logger.debug(`[ResetPassword] onAuthStateChange event: ${event}`);
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        handleRecovery();
      }
    });

    // Fallback por si el evento no se dispara
    fallbackTimer = setTimeout(async () => {
      if (eventHandled) return;
      logger.warn('[ResetPassword] Fallback: onAuthStateChange no se disparó a tiempo.');
      
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          logger.info('[ResetPassword] Fallback: Tokens encontrados en el hash. Intentando setSession.');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionError) {
            handleRecovery();
            return;
          }
          logger.error('[ResetPassword] Fallback: setSession falló.', sessionError);
        }
      } catch (e) {
        logger.error('[ResetPassword] Fallback: Error parseando el hash.', e);
      }

      // Si el fallback también falla, mostramos el error.
      eventHandled = true;
      setError('El enlace de recuperación es inválido o ha expirado. Por favor, solicitá uno nuevo.');
      setReady(true);
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center text-gray-600">
        Validando enlace…
      </div>
    );
  }

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
            {error ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Enlace inválido</h2>
                <p className="mt-4 text-base text-red-600">{error}</p>
                <Link
                  to="/login"
                  state={{ openResetModal: true }}
                  className="mt-6 inline-block w-full text-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Solicitar un nuevo enlace
                </Link>
              </div>
            ) : (
              <ResetPasswordForm />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResetPasswordPage;
