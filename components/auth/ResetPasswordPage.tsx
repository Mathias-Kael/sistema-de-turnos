import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StyleInjector } from '../common/StyleInjector';
import { INITIAL_BUSINESS_DATA } from '../../constants';
import { logger } from '../../utils/logger';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (ranRef.current) return; // evitar doble ejecución
      ranRef.current = true;
      try {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  logger.debug('[ResetPassword] URL hash recibido:', hash);
  logger.debug('[ResetPassword] URL search recibido:', search);

        // Errores pasados por el proveedor
        const allParams = new URLSearchParams((hash.startsWith('#') ? hash.substring(1) : hash).replace(/^\?/, ''));
        const allSearch = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search);
        const errCode = allParams.get('error_code') || allSearch.get('error_code');
        const errDesc = allParams.get('error_description') || allSearch.get('error_description');
        if (errCode) {
          logger.error('[ResetPassword] error_code en URL:', errCode, errDesc);
          setError(errCode === '401' ? 'El enlace expiró. Volvé a solicitar un nuevo enlace.' : `No se pudo validar el enlace (${errCode}). ${errDesc || ''}`);
          setReady(true);
          return;
        }

        const hasAccess = /[?#&]access_token=/.test(hash) || hash.includes('access_token=') || search.includes('access_token=');
        const hasRefresh = /[?#&]refresh_token=/.test(hash) || hash.includes('refresh_token=') || search.includes('refresh_token=');
        const hasCode = /[?#&]code=/.test(hash) || search.includes('code=');

        const typeParam = allParams.get('type') || allSearch.get('type');
        const isRecovery = (typeParam || '').toLowerCase() === 'recovery';

        // 1) PKCE/verifyOtp si viene type=recovery
        if (isRecovery) {
          const token_hash = allParams.get('token_hash') || allSearch.get('token_hash')
            || allParams.get('recovery_token') || allSearch.get('recovery_token')
            || allParams.get('token') || allSearch.get('token')
            || allParams.get('access_token') || allSearch.get('access_token')
            || '';
          logger.debug('[ResetPassword] Flujo recovery detectado. token_hash preview:', token_hash ? token_hash.substring(0, 8) + '…' : null);
          if (token_hash) {
            const { data: vData, error: vErr } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' as any });
            logger.debug('[ResetPassword] verifyOtp (recovery) resultado:', { error: vErr?.message || null, session_present: !!vData?.session });
            try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
            if (vErr || !vData?.session) {
              // Doble intento: puede que el primer verify haya creado sesión y el segundo falle
              const { data: sessCheck } = await supabase.auth.getSession();
              if (!sessCheck?.session) {
                const code = (vErr as any)?.status || (vErr as any)?.code;
                setError(code === 401 || code === '401' || code === 403 || code === '403'
                  ? 'El enlace expiró o no es válido. Volvé a solicitar un nuevo enlace.'
                  : 'No se pudo validar el enlace de recuperación. Volvé a solicitarlo.');
                setReady(true);
                return;
              }
            }
          } else if (hasCode) {
            const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
            logger.debug('[ResetPassword] exchangeCodeForSession (recovery):', { error: exErr?.message || null, session_present: !!exData?.session });
            try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
            if (exErr || !exData?.session) {
              setError('No se pudo validar el enlace de recuperación. Volvé a solicitarlo.');
              setReady(true);
              return;
            }
          } else {
            setError('Enlace de recuperación incompleto. Solicitá uno nuevo.');
            setReady(true);
            return;
          }
        } else if (hasAccess && hasRefresh) {
          // 2) Implícito: setSession
          const access_token = allParams.get('access_token') || allSearch.get('access_token') || '';
          const refresh_token = allParams.get('refresh_token') || allSearch.get('refresh_token') || '';
          logger.debug('[ResetPassword] Tokens parseados:', {
            hasAccess: !!access_token,
            hasRefresh: !!refresh_token,
            access_token_preview: access_token ? access_token.substring(0, 8) + '…' : null,
            refresh_token_preview: refresh_token ? refresh_token.substring(0, 8) + '…' : null,
          });
          if (access_token && refresh_token) {
            const { data: setData, error } = await supabase.auth.setSession({ access_token, refresh_token });
            logger.debug('[ResetPassword] setSession resultado:', { error: error?.message || null, session_present: !!setData?.session });
            try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
            if (error) {
              const code = (error as any)?.status || (error as any)?.code;
              setError(code === 401 || code === '401' ? 'El enlace expiró. Volvé a solicitar un nuevo enlace.' : 'No se pudo validar el enlace de recuperación. Volvé a solicitarlo.');
              setReady(true);
              return;
            }
            if (!setData?.session) {
              await new Promise(r => setTimeout(r, 250));
              const { data: retryData } = await supabase.auth.getSession();
              if (!retryData?.session) {
                setError('No se pudo establecer la sesión de recuperación. Reintentá desde el enlace nuevamente.');
                setReady(true);
                return;
              }
            }
          }
        } else if (hasCode) {
          // 3) PKCE: code en URL
          try {
            const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
            logger.debug('[ResetPassword] exchangeCodeForSession:', { error: exErr?.message || null, session_present: !!exData?.session });
            try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
            if (exErr || !exData?.session) {
              setError('No se pudo validar el enlace de recuperación (código). Solicitá uno nuevo.');
              setReady(true);
              return;
            }
          } catch (e) {
            logger.error('[ResetPassword] exchangeCodeForSession falló:', e);
            setError('No se pudo validar el enlace de recuperación. Solicitá uno nuevo.');
            setReady(true);
            return;
          }
        }

        // Verificación final de sesión
        const { data, error: getSessErr } = await supabase.auth.getSession();
        if (getSessErr) {
          logger.error('[ResetPassword] getSession error:', getSessErr);
        }
        if (!data.session) {
          setError('El enlace de recuperación es inválido o expiró. Solicitá uno nuevo.');
        }
      } catch (e: any) {
        logger.error('[ResetPassword] Validación de enlace falló:', e);
        setError('No se pudo validar el enlace de recuperación. Intentalo más tarde.');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-background">
        <StyleInjector brandingOverride={INITIAL_BUSINESS_DATA.branding} />
        <header className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 select-none">
            <div className="h-9 w-9 rounded-lg bg-primary text-brand-text flex items-center justify-center font-semibold">ST</div>
            <span className="text-lg font-semibold text-primary">Sistema de Turnos</span>
          </div>
        </header>
        <div className="px-4">
          <div className="mx-auto max-w-md">
            <div className="bg-surface border border-primary shadow-sm rounded-xl p-6 sm:p-8 text-center text-secondary">Cargando…</div>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Validaciones reforzadas
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    // Requerimos al menos una letra y un número para mejorar seguridad básica
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      setError('La contraseña debe incluir al menos una letra y un número.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    const { data: updData, error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      logger.error('[ResetPassword] updateUser error:', updErr);
      setSubmitting(false);
      const code = (updErr as any)?.status || (updErr as any)?.code;
      if (code === 401 || code === '401') {
        setError('Tu enlace expiró. Volvé a solicitar uno nuevo desde "¿Olvidaste tu contraseña?"');
      } else {
        setError('No se pudo actualizar la contraseña. Verificá el enlace o intentá nuevamente.');
      }
      return;
    }
    logger.info('[ResetPassword] updateUser OK, user id:', updData?.user?.id);
    // Cerrar sesión de recuperación para evitar estados inconsistentes
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logger.warn('[ResetPassword] signOut warning:', e);
    }
    setSubmitting(false);
    navigate('/login?reset=1', { replace: true });
  };

  // Si por algún motivo la sesión ya cambió a un usuario normal, igual permitimos el cambio si updateUser no falla.
  return (
    <div className="min-h-screen bg-background">
      <StyleInjector brandingOverride={INITIAL_BUSINESS_DATA.branding} />
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 rounded-lg bg-primary text-brand-text flex items-center justify-center font-semibold">ST</div>
          <span className="text-lg font-semibold text-primary">Sistema de Turnos</span>
        </div>
      </header>

      <div className="px-4">
        <div className="mx-auto max-w-md">
          <div className="bg-surface border border-primary shadow-sm rounded-xl p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-primary">Restablecer contraseña</h1>
              <p className="text-sm text-secondary mt-1">Ingresá tu nueva contraseña.</p>
            </div>

            {error && (
              <div className="mb-4 text-sm px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700">{error}</div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm text-secondary mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-default rounded-lg px-3 py-2.5 pr-10 bg-background text-primary placeholder:text-secondary focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                  >
                    {showPwd ? (
                      // eye-off
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-2.37-2.37a12.1 12.1 0 0 0 3.22-4.1.75.75 0 0 0 0-.6C20.7 8.01 16.02 5 11 5c-1.9 0-3.72.4-5.37 1.12L3.53 2.47ZM12.94 9.35l1.71 1.71a3 3 0 0 0-1.7-1.7Zm-1.02 1.02 1.71 1.71a3 3 0 0 1-1.71-1.71ZM7.7 4.7A12.1 12.1 0 0 1 11 4c5.47 0 10.52 3.23 12.59 7.7-.6 1.28-1.4 2.44-2.36 3.45L18.3 12.22a5 5 0 0 0-6.52-6.52L7.7 4.7Zm7.9 13.6a5 5 0 0 1-6.9-6.9l-1.1-1.1A7 7 0 0 0 12 19a6.98 6.98 0 0 0 3.6-.98Z"/></svg>
                    ) : (
                      // eye
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 5c-5.02 0-9.7 3.01-12 7.03a.75.75 0 0 0 0 .6C2.3 16 6.98 19 12 19s9.7-3.01 12-7.03a.75.75 0 0 0 0-.6C21.7 8.01 17.02 5 12 5Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-secondary">Mínimo 8 caracteres, incluir al menos una letra y un número.</p>
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm text-secondary mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-default rounded-lg px-3 py-2.5 pr-10 bg-background text-primary placeholder:text-secondary focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                  >
                    {showConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-2.37-2.37a12.1 12.1 0 0 0 3.22-4.1.75.75 0 0 0 0-.6C20.7 8.01 16.02 5 11 5c-1.9 0-3.72.4-5.37 1.12L3.53 2.47ZM12.94 9.35l1.71 1.71a3 3 0 0 0-1.7-1.7Zm-1.02 1.02 1.71 1.71a3 3 0 0 1-1.71-1.71ZM7.7 4.7A12.1 12.1 0 0 1 11 4c5.47 0 10.52 3.23 12.59 7.7-.6 1.28-1.4 2.44-2.36 3.45L18.3 12.22a5 5 0 0 0-6.52-6.52L7.7 4.7Zm7.9 13.6a5 5 0 0 1-6.9-6.9l-1.1-1.1A7 7 0 0 0 12 19a6.98 6.98 0 0 0 3.6-.98Z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 5c-5.02 0-9.7 3.01-12 7.03a.75.75 0 0 0 0 .6C2.3 16 6.98 19 12 19s9.7-3.01 12-7.03a.75.75 0 0 0 0-.6C21.7 8.01 17.02 5 12 5Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary text-brand-text py-2.5 font-medium transition-colors hover:bg-primary-dark disabled:opacity-60 focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
              >
                {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>

            <div className="mt-6 text-sm text-secondary">
              ¿Recordaste la contraseña?{' '}
              <Link className="text-primary hover:underline underline underline-offset-2" to="/login">Iniciá sesión</Link>
            </div>
          </div>
          <p className="text-center text-xs text-secondary mt-6">© {new Date().getFullYear()} Sistema de Turnos</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
