import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseBackend } from '../../services/supabaseBackend';
import { Business } from '../../types';
import { ClientBookingExperience } from './ClientBookingExperience';
import { logger } from '../../utils/logger';
import { Helmet } from 'react-helmet-async';

type Status = 'validating' | 'valid' | 'paused' | 'invalid';

export const PublicClientLoader: React.FC = () => {
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const qs = new URLSearchParams(window.location.search);
  const token = tokenFromPath || qs.get('token');
  const [status, setStatus] = useState<Status>('validating');
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      logger.debug('[PublicClientLoader] Validando token', token);
      try {
        const full = await supabaseBackend.getBusinessByToken(token);
        if (cancelled) return;

        if (!full) {
          logger.debug('[PublicClientLoader] Token inválido o no se pudo cargar business');
          setStatus('invalid');
          return;
        }

        if (full.shareTokenStatus === 'paused') {
          logger.debug('[PublicClientLoader] Token pausado');
          setStatus('paused');
          return;
        }

        logger.debug('[PublicClientLoader] Business cargado', full.id);
        setBusiness(full);
        setStatus('valid');
      } catch (e: any) {
        if (!cancelled) {
          logger.error('[PublicClientLoader] Error inesperado', e);
          setError('Error inesperado');
          setStatus('invalid');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (status === 'validating') {
    return <div className="p-8 text-center text-lg font-medium">Validando enlace...</div>;
  }
  if (status === 'paused') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="p-8 bg-surface shadow-md rounded-lg text-center max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-[color:var(--color-state-warning-text)]">Agenda Pausada</h1>
          <p className="mt-4 text-secondary">La agenda está temporalmente pausada. Volvé a intentar más tarde.</p>
        </div>
      </div>
    );
  }
  if (status !== 'valid' || !business) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="p-8 bg-surface shadow-md rounded-lg text-center max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-[color:var(--color-state-danger-text)]">Enlace Inválido o Expirado</h1>
          <p className="mt-4 text-secondary">{error || 'Este enlace ya no está activo. Pedí al negocio el nuevo link.'}</p>
        </div>
      </div>
    );
  }
  return (
    <>
      {business && (
        <Helmet>
          <title>{business.name} - Reservar cita</title>
          <meta property="og:title" content={business.name} />
          <meta property="og:image" content={business.profileImageUrl || "/assets/logo-astra.png"} />
          <meta property="og:image:width" content="400" />
          <meta property="og:image:height" content="400" />
        </Helmet>
      )}
      <ClientBookingExperience business={business} mode="public" publicToken={token!} />
    </>
  );
};
