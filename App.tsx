import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BusinessProvider } from './context/BusinessContext';
import { StyleInjector } from './components/common/StyleInjector';
import { ClientView } from './components/views/ClientView';
import { AdminView } from './components/views/AdminView';
import { PublicClientLoader } from './components/views/PublicClientLoader';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Lazy load landing page to optimize initial bundle
const LandingPage = React.lazy(() => import('./components/landing/LandingPage'));

// ShareLink se importa ahora desde types.ts

function RootRedirect() {
  // Maneja compat ?token y ?client (legacy query params)
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const clientPreview = params.get('client');
  
  // Legacy redirects for backwards compatibility
  if (token) return <Navigate to={`/public/${token}`} replace />;
  if (clientPreview === '1') return <Navigate to="/admin/preview" replace />;
  
  // Show landing page for root path
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <LandingPage />
    </Suspense>
  );
}

// Componente que maneja la lógica de redirección post-logout
const AuthRedirector = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigatedRef = React.useRef(false);

  React.useEffect(() => {
    // Si no hay usuario y estamos en una ruta protegida, redirigir a /login
    if (!user && !loading && location.pathname.startsWith('/admin') && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate('/login', { replace: true });
    }
    // Resetea el ref si el usuario vuelve a iniciar sesión
    if (user) {
      hasNavigatedRef.current = false;
    }
  }, [user, loading, location, navigate]);

  return null; // Este componente no renderiza nada
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-center" />
        <AuthRedirector />
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/public/:token" element={<PublicClientLoader />} />

          {/* Landing Page Marketing (lazy loaded) */}
          <Route path="/" element={<RootRedirect />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;