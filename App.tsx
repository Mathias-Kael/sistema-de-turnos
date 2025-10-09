import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BusinessProvider } from './context/BusinessContext';
import { StyleInjector } from './components/common/StyleInjector';
import { ClientView } from './components/views/ClientView';
import { AdminView } from './components/views/AdminView';
import { PublicClientLoader } from './components/views/PublicClientLoader';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';

// ShareLink se importa ahora desde types.ts

function LegacyQueryRedirect() {
  // Maneja compat ?token y ?client
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const clientPreview = params.get('client');
  if (token) return <Navigate to={`/public/${token}`} replace />;
  if (clientPreview === '1') return <Navigate to="/admin/preview" replace />;
  return <Navigate to="/admin" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/public/:token" element={<PublicClientLoader />} />

          {/* Compatibilidad con query params antiguos */}
          <Route path="/" element={<LegacyQueryRedirect />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}> 
            <Route
              path="/admin"
              element={(
                <BusinessProvider>
                  <StyleInjector />
                  <main>
                    <AdminView />
                  </main>
                </BusinessProvider>
              )}
            />
            <Route
              path="/admin/preview"
              element={(
                <BusinessProvider>
                  <StyleInjector />
                  <ClientView />
                </BusinessProvider>
              )}
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;