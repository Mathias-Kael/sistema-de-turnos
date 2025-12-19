// ErrorBoundary with TypeScript compatibility for current tsconfig
import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

// Using Component directly to avoid class field issues
export class ErrorBoundary extends React.Component<Props, State> {
  state = {
    hasError: false,
    error: null as Error | null,
    errorInfo: null as React.ErrorInfo | null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    // @ts-ignore - setState exists on Component
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // @ts-ignore - props exists on Component
      if (this.props.fallback) {
        // @ts-ignore
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              ⚠️ Error de Carga
            </h1>
            <p className="text-gray-700 mb-4">
              Ocurrió un error al cargar esta página. Por favor, intenta recargar.
            </p>
            {this.state.error && (
              <details className="bg-gray-100 p-4 rounded text-sm">
                <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
                  Detalles técnicos (para debugging)
                </summary>
                <pre className="text-red-600 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore - props.children exists on Component
    return this.props.children;
  }
}
