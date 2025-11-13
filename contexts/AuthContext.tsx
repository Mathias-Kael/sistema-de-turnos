import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
}

const AuthContext = createContext<AuthState>({ loading: true, user: null, session: null });

/**
 * Limpia sesión inválida del storage local.
 * Esto fuerza a Supabase a descartar tokens obsoletos.
 */
const clearInvalidSession = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    // Ignorar errores de signOut - el objetivo es limpiar estado
    console.warn('Error clearing invalid session:', error);
  }
};

/**
 * Verifica si un error es de tipo "Invalid Refresh Token"
 */
const isInvalidRefreshTokenError = (error: AuthError | null): boolean => {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('token has expired') ||
    message.includes('invalid grant')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode } > = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Intentar obtener sesión existente
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        // Si hay error de refresh token inválido, limpiar estado
        if (isInvalidRefreshTokenError(error)) {
          console.warn('Invalid refresh token detected, clearing session');
          await clearInvalidSession();
          setSession(null);
          setLoading(false);
          return;
        }

        // Si hay sesión válida, usarla
        if (data.session) {
          setSession(data.session);
        } else {
          setSession(null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event, newSession ? 'session exists' : 'no session');

      // Casos especiales que requieren limpieza de estado
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        console.warn('Token refresh failed, clearing session');
        await clearInvalidSession();
      }

      if (event === 'SIGNED_OUT') {
        await clearInvalidSession();
      }

      // Eventos que indican email confirmado externamente
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Nueva sesión válida - puede ser post-confirmación de email
        console.log('User session established:', event);
      }

      setSession(newSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ loading, user, session }), [loading, user, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
