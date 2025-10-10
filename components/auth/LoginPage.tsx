import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StyleInjector } from '../common/StyleInjector';
import { INITIAL_BUSINESS_DATA } from '../../constants';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Mostrar banner de éxito si venimos de /reset-password
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === '1') {
      setResetSuccess('Tu contraseña fue restablecida con éxito. Ingresá con tu nueva contraseña.');
      // limpiar query param para evitar mensajes repetidos
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
    }
  }, [location.search]);

  if (loading) return <div className="p-6 text-center">Cargando...</div>;
  if (user) return <Navigate to="/admin" replace />;

  const onEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setSubmitting(false);
  };

  const openReset = () => {
    setResetEmail(email || '');
    setResetError(null);
    setResetOpen(true);
  };

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const value = resetEmail.trim();
    if (!validateEmail(value)) {
      setResetError('Ingresá un email válido');
      return;
    }
    setResetSubmitting(true);
    const redirectTo = window.location.origin + '/reset-password';
    // Log de diagnóstico: confirmar a dónde redirige el enlace de recuperación
    console.info('[ResetPassword][request] redirectTo =', redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo
    });
    setResetSubmitting(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    setResetOpen(false);
    setResetSuccess('Revisa tu email');
  };

  return (
    <div className="min-h-screen bg-background">
      <StyleInjector brandingOverride={INITIAL_BUSINESS_DATA.branding} />
      {/* Header simple de marca */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 rounded-lg bg-primary text-brand-text flex items-center justify-center font-semibold">ST</div>
          <span className="text-lg font-semibold text-primary">Sistema de Turnos</span>
        </div>
      </header>

      {/* Contenido centrado */}
      <div className="px-4">
        <div className="mx-auto max-w-md">
          <div className="bg-surface border border-primary shadow-sm rounded-xl p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-primary">Bienvenido de nuevo</h1>
              <p className="text-sm text-secondary mt-1">Ingresá para administrar tu agenda.</p>
            </div>

            {error && (
              <div className="mb-4 text-sm px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700">
                {error}
              </div>
            )}
            {resetSuccess && (
              <div className="mb-4 text-sm px-3 py-2 rounded-md border border-green-300 bg-green-50 text-green-800">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={onEmailPasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-secondary mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full border border-default rounded-lg px-3 py-2.5 bg-background text-primary placeholder:text-secondary focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm text-secondary mb-1">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-default rounded-lg px-3 py-2.5 bg-background text-primary placeholder:text-secondary focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary text-brand-text py-2.5 font-medium transition-colors hover:bg-primary-dark disabled:opacity-60 focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
              >
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={openReset}
                className="text-sm text-primary hover:underline underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="mt-6 text-sm text-secondary">
              ¿No tenés cuenta?{' '}
              <Link className="text-primary hover:underline underline underline-offset-2" to="/register">Registrate</Link>
            </div>
          </div>
          <p className="text-center text-xs text-secondary mt-6">© {new Date().getFullYear()} Sistema de Turnos</p>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-primary rounded-xl p-6 sm:p-7 w-full max-w-sm mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Restablecer contraseña</h2>
              <button
                onClick={() => setResetOpen(false)}
                className="text-secondary hover:text-primary focus:outline-none focus-visible:ring focus-visible:ring-primary/40 rounded"
                aria-label="Cerrar"
              >✕</button>
            </div>
            {resetError && (
              <div className="mb-3 text-sm px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700">
                {resetError}
              </div>
            )}
            <form onSubmit={onResetSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm text-secondary mb-1">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full border border-default rounded-lg px-3 py-2.5 bg-background text-primary placeholder:text-secondary focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="px-4 py-2 rounded-lg text-primary hover:bg-surface focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-brand-text disabled:opacity-60 focus:outline-none focus-visible:ring focus-visible:ring-primary/40 hover:bg-primary-dark"
                >
                  {resetSubmitting ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
