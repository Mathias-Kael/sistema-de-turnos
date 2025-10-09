import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
        <h1 className="text-xl font-semibold text-primary mb-4">Crear cuenta</h1>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        {info && <div className="mb-3 text-green-600 text-sm">{info}</div>}
        <form onSubmit={onEmailPasswordRegister} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm text-secondary mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-default rounded px-3 py-2 bg-background text-primary" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-secondary mb-1">Contraseña</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-default rounded px-3 py-2 bg-background text-primary" />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-primary text-brand-text rounded py-2 disabled:opacity-70">
            {submitting ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>
        <div className="my-4 text-center text-sm text-secondary">o</div>
        <button onClick={onGoogle} disabled={submitting} className="w-full border border-default rounded py-2">
          Continuar con Google
        </button>
        <div className="mt-4 text-sm text-secondary">
          ¿Ya tenés cuenta? <Link className="underline" to="/login">Ingresá</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
