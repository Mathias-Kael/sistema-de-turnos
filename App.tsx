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
import { ErrorBoundary } from './components/common/ErrorBoundary';

// DEBUG FLAG: Set to false to disable lazy loading for testing
// If lazy loading is the issue, setting this to false will confirm it
const ENABLE_LAZY_LOADING = true;

console.log('[App] Module loading - ENABLE_LAZY_LOADING:', ENABLE_LAZY_LOADING);
console.log('[App] Environment:', import.meta.env.MODE);
console.log('[App] Base URL:', import.meta.env.BASE_URL);

// DEBUG: Lazy load landing page with detailed error tracking
const LandingPage = React.lazy(() => {
  console.log('[App] Lazy import TRIGGERED for LandingPage at:', new Date().toISOString());
  console.log('[App] Attempting to import from: ./components/landing/LandingPage');
  
  return import('./components/landing/LandingPage')
    .then(module => {
      console.log('[App] ✅ LandingPage module loaded successfully');
      console.log('[App] Module exports:', Object.keys(module));
      console.log('[App] Default export exists:', !!module.default);
      return module;
    })
    .catch(error => {
      console.error('[App] ❌ CRITICAL: Failed to load LandingPage');
      console.error('[App] Error type:', error.constructor.name);
      console.error('[App] Error message:', error.message);
      console.error('[App] Error stack:', error.stack);
      
      // Try to provide more context
      if (error.message.includes('Failed to fetch')) {
        console.error('[App] Network error - chunk might not be built correctly');
      } else if (error.message.includes('Cannot find module')) {
        console.error('[App] Module resolution error - path might be incorrect');
      }
      
      throw error;
    });
});

// ShareLink se importa ahora desde types.ts

function RootRedirect() {
  // Maneja compat ?token y ?client (legacy query params)
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const clientPreview = params.get('client');
  
  console.log('[RootRedirect] Location:', location.pathname, 'Query params:', { token, clientPreview });
  
  // Legacy redirects for backwards compatibility
  if (token) {
    console.log('[RootRedirect] Redirecting to /public/' + token);
    return <Navigate to={`/public/${token}`} replace />;
  }
  if (clientPreview === '1') {
    console.log('[RootRedirect] Redirecting to /admin/preview');
    return <Navigate to="/admin/preview" replace />;
  }
  
  console.log('[RootRedirect] Rendering LandingPage');
  
  // Show landing page for root path
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Error al cargar Landing Page
            </h1>
            <p className="text-gray-700 mb-4">
              Hubo un problema al cargar la página. Verifica la consola para más detalles.
            </p>
            <a
              href="/admin"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Ir al Panel Admin
            </a>
          </div>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Cargando Landing Page...</p>
            </div>
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    </ErrorBoundary>
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