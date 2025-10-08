import React, { useState, useEffect } from 'react';
import { BusinessProvider } from './context/BusinessContext';
import { StyleInjector } from './components/common/StyleInjector';
import { ClientView } from './components/views/ClientView';
import { AdminView } from './components/views/AdminView';
import { PublicClientLoader } from './components/views/PublicClientLoader';

// ShareLink se importa ahora desde types.ts

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const clientPreview = searchParams.get('client');

  // Si hay un token en la URL, estamos en la vista de cliente.
  if (token) {
    return <PublicClientLoader />;
  }

  // Modo de previsualización directa del cliente para E2E / QA: ?client=1
  if (clientPreview === '1') {
    return (
      <BusinessProvider>
        <StyleInjector />
        <ClientView />
      </BusinessProvider>
    );
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