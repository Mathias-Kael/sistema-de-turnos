import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StyleInjector } from '../common/StyleInjector';
import { INITIAL_BUSINESS_DATA } from '../../constants';

export const RegisterPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) return <div className="p-6 text-center">Cargando...</div>;
  if (user) return <Navigate to="/admin" replace />;

  const onEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/admin' } });
    if (error) setError(error.message);
    else setInfo('Revisá tu email para confirmar la cuenta.');
    setSubmitting(false);
  };

  // Eliminado Google OAuth para mantener consistencia con Login

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

      <div className="px-4">
        <div className="mx-auto max-w-md">
          <div className="bg-surface border border-primary shadow-sm rounded-xl p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-primary">Crear cuenta</h1>
              <p className="text-sm text-secondary mt-1">Empezá a gestionar tu agenda.</p>
            </div>

            {error && (
              <div className="mb-4 text-sm px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-4 text-sm px-3 py-2 rounded-md border border-green-300 bg-green-50 text-green-800">
                {info}
              </div>
            )}

            <form onSubmit={onEmailPasswordRegister} className="space-y-4">
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
                {submitting ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>

            <div className="mt-6 text-sm text-secondary">
              ¿Ya tenés cuenta?{' '}
              <Link className="text-primary hover:underline underline underline-offset-2" to="/login">Ingresá</Link>
            </div>
          </div>
          <p className="text-center text-xs text-secondary mt-6">© {new Date().getFullYear()} Sistema de Turnos</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
