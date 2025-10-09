import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { supabaseBackend } from '../../services/supabaseBackend';
import { Business } from '../../types';
import { ClientBookingExperience } from './ClientBookingExperience';
import { logger } from '../../utils/logger';

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
        const { data, error } = await supabase
          .from('businesses')
          .select('id, share_token_status, share_token_expires_at')
          .eq('share_token', token)
          .eq('status', 'active')
          .single();

  logger.debug('[PublicClientLoader] Resultado inicial', { data, error });

        if (cancelled) return;
        if (error || !data) {
          logger.debug('[PublicClientLoader] Token no encontrado o error');
          setStatus('invalid');
          return;
        }

        if (data.share_token_expires_at) {
          const expMs = new Date(data.share_token_expires_at).getTime();
          if (Date.now() > expMs) {
            logger.debug('[PublicClientLoader] Token expirado');
            setStatus('invalid');
            return;
          }
        }

        if (data.share_token_status === 'paused') {
          logger.debug('[PublicClientLoader] Token pausado');
            setStatus('paused');
            return;
        }
        if (data.share_token_status !== 'active') {
          logger.debug('[PublicClientLoader] Token no activo');
          setStatus('invalid');
          return;
        }

  logger.debug('[PublicClientLoader] Token activo, cargando business completo');
        const full = await supabaseBackend.getBusinessByToken(token);
        if (!full) {
          logger.debug('[PublicClientLoader] No se pudo construir business');
          setStatus('invalid');
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
  return <ClientBookingExperience business={business} mode="public" />;
};
