import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName,
        },
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) setError(error.message);
    else setInfo('Revisá tu email para confirmar la cuenta.');
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md">
      {error && (
        <div className="mb-4 text-center text-sm text-red-500">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 text-center text-sm text-green-500">
          {info}
        </div>
      )}

      <form onSubmit={onEmailPasswordRegister} className="space-y-5">
        <div className="relative">
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
            placeholder="Nombre del negocio"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Creando cuenta…' : 'Crear Cuenta Gratis'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;