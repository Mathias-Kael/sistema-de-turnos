import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onGoogle = async () => {
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/admin' }
    });
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface border border-default rounded-lg p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold text-primary mb-4">Iniciar sesión</h1>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <form onSubmit={onEmailPasswordLogin} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm text-secondary mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-default rounded px-3 py-2 bg-background text-primary" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-secondary mb-1">Contraseña</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-default rounded px-3 py-2 bg-background text-primary" />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-primary text-brand-text rounded py-2 disabled:opacity-70">
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div className="my-4 text-center text-sm text-secondary">o</div>
        <button onClick={onGoogle} disabled={submitting} className="w-full border border-default rounded py-2">
          Continuar con Google
        </button>
        <div className="mt-4 text-sm text-secondary">
          ¿No tenés cuenta? <Link className="underline" to="/register">Registrate</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
