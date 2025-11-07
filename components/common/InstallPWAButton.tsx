import React, { useState, useEffect } from 'react';
import { ArrowDownToLine } from 'lucide-react';

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setDeferredPrompt(null);
    } else {
      // Si no hay deferredPrompt, mostramos las instrucciones para iOS/otros
      setShowInstructions(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Instalar aplicación"
      >
        <ArrowDownToLine className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {showInstructions && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Instalar ASTRA</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Para instalar la aplicación en tu dispositivo, toca el ícono de <strong>Menú (los tres puntos)</strong> en tu navegador y luego selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
            </p>
            <button
              onClick={() => setShowInstructions(false)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg w-full"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWAButton;