import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PasswordInput } from '../ui/PasswordInput';

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const translateError = (message: string) => {
    if (message.includes('duplicate key value violates unique constraint "users_email_key"')) return 'Ya existe una cuenta con este email.';
    if (message.includes('Password should be at least 6 characters')) return 'La contraseña debe tener al menos 6 caracteres.';
    return message;
  };

  const onEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) setError(translateError(error.message));
    else setInfo('Revisá tu email para confirmar la cuenta.');
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md">
      {error && (
        <div className="mb-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 text-center text-sm text-green-600">
          {info}
        </div>
      )}

      <form onSubmit={onEmailPasswordRegister} className="space-y-5">
        <div className="relative">
          <label htmlFor="email" className="sr-only">Email</label>
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
          <label htmlFor="password" className="sr-only">Contraseña</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        <div className="relative">
          <label htmlFor="confirmPassword" className="sr-only">Confirmar Contraseña</label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirmar contraseña"
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