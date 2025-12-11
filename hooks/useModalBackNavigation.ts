import { useEffect } from 'react';

interface UseModalBackNavigationOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId: string;
  shouldEnable?: boolean;
}

/**
 * Hook para manejar la navegación hacia atrás en modales usando History API.
 * Permite cerrar modales con el botón "atrás" del navegador.
 * 
 * @param isOpen - Si el modal está abierto
 * @param onClose - Callback para cerrar el modal
 * @param modalId - ID único del modal
 * @param shouldEnable - Si debe habilitar la funcionalidad (default: true)
 */
export const useModalBackNavigation = ({
  isOpen,
  onClose,
  modalId,
  shouldEnable = true,
}: UseModalBackNavigationOptions) => {
  useEffect(() => {
    if (!isOpen || !shouldEnable) return;

    const stateId = `modal-${modalId}`;
    window.history.pushState({ modal: stateId, __modalInternal: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      const currentState = window.history.state;
      if (currentState?.modal === stateId) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Si cerramos el modal manualmente y el estado sigue ahí, hacemos back
      if (window.history.state?.modal === stateId) {
        window.history.back();
      }
    };
  }, [isOpen, shouldEnable, modalId, onClose]);
};
