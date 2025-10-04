import React, { useState, useEffect } from 'react';
import { BusinessProvider } from './context/BusinessContext';
import { StyleInjector } from './components/common/StyleInjector';
import { ClientView } from './components/views/ClientView';
import { AdminView } from './components/views/AdminView';
import { mockBackend } from './services/mockBackend';
import { ShareLink } from './types';

// ShareLink se importa ahora desde types.ts

/**
 * Componente que valida el token y el estado del enlace de acceso del cliente.
 */
const TokenValidationView: React.FC<{ token: string }> = ({ token }) => {
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'paused' | 'invalid'>('validating');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const biz = await mockBackend.getBusinessByToken(token);
        if (cancelled) return;
        if (!biz) {
          setValidationStatus('invalid');
          return;
        }
        // Recuperar metadatos para determinar estado (paused vs active)
        const storedTokenData = localStorage.getItem('shareToken');
        if (storedTokenData && storedTokenData !== 'null') {
          try {
            const link: ShareLink = JSON.parse(storedTokenData);
            if (link.token !== token) {
              setValidationStatus('invalid');
              return;
            }
            const isExpired = link.expiresAt !== null && Date.now() > link.expiresAt;
            if (isExpired || link.status === 'revoked') {
              setValidationStatus('invalid');
            } else if (link.status === 'paused') {
              setValidationStatus('paused');
            } else if (link.status === 'active') {
              setValidationStatus('valid');
            } else {
              setValidationStatus('invalid');
            }
          } catch {
            setValidationStatus('valid'); // Token backend válido pero metadatos corruptos -> permitir
          }
        } else {
          setValidationStatus('valid'); // Backend lo aceptó aunque no tengamos metadatos (edge case)
        }
      } catch {
        if (!cancelled) setValidationStatus('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (validationStatus === 'validating') {
    return <div className="p-8 text-center text-lg font-medium">Validando enlace...</div>;
  }
  
  if (validationStatus === 'valid') {
    return (
      <BusinessProvider>
        <StyleInjector />
        <main>
          <ClientView />
        </main>
      </BusinessProvider>
    );
  }

  if (validationStatus === 'paused') {
     return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="p-8 bg-surface shadow-md rounded-lg text-center max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-[color:var(--color-state-warning-text)]">Agenda Pausada</h1>
            <p className="mt-4 text-secondary">
              La agenda está temporalmente pausada. Volvé a intentar más tarde.
            </p>
          </div>
        </div>
      );
  }

  // Para 'invalid', 'revoked', 'expired'
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="p-8 bg-surface shadow-md rounded-lg text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-[color:var(--color-state-danger-text)]">Enlace Inválido o Expirado</h1>
        <p className="mt-4 text-secondary">
          Este enlace ya no está activo. Pedí al negocio el nuevo link para reservar.
        </p>
      </div>
    </div>
  );
};


function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  // Si hay un token en la URL, estamos en la vista de cliente.
  if (token) {
    return <TokenValidationView token={token} />;
  }

  // De lo contrario, es la vista de administrador.
  return (
    <BusinessProvider>
      <StyleInjector />
      <main>
        <AdminView />
      </main>
    </BusinessProvider>
  );
}

export default App;