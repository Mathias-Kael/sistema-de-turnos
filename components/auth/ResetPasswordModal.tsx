import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess: (message: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, initialEmail = '', onSuccess }) => {
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setResetEmail(initialEmail);
  }, [initialEmail, isOpen]);

  if (!isOpen) return null;

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
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo });
    setResetSubmitting(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    onSuccess('Revisa tu email para ver el enlace de recuperación.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Restablecer contraseña</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {resetError && (
          <div className="mb-4 text-sm text-center text-red-600">
            {resetError}
          </div>
        )}
        <form onSubmit={onResetSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="sr-only">Email</label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetSubmitting}
              className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {resetSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};