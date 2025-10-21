import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { PasswordInput } from '../ui/PasswordInput';

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });

    if (updErr) {
      logger.error('[ResetPassword] updateUser error:', updErr);
      setSubmitting(false);
      const code = (updErr as any)?.status || (updErr as any)?.code;
      if (code === 401 || code === '401' || updErr.message.includes('Auth session missing')) {
        setError('Tu sesión de recuperación expiró. Volvé a solicitar un nuevo enlace.');
      } else {
        setError('No se pudo actualizar la contraseña. Verificá el enlace o intentá nuevamente.');
      }
      return;
    }

    logger.info('[ResetPassword] Contraseña actualizada correctamente.');
    
    // Limpiar la sesión de recuperación para evitar conflictos
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logger.warn('[ResetPassword] signOut after update warning:', e);
    }

    setSubmitting(false);
    navigate('/login?reset=1', { replace: true });
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Restablecer tu contraseña
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Ingresá tu nueva contraseña segura.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="mb-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="relative">
          <PasswordInput
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Nueva contraseña"
          />
        </div>
        <div className="relative">
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirmar nueva contraseña"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </div>
  );
};