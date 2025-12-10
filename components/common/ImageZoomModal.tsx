import React, { useEffect } from 'react';

interface ImageZoomModalProps {
    imageUrl: string;
    altText: string;
    onClose: () => void;
}

/**
 * Modal fullscreen para ampliar imágenes (fotos de empleados/espacios).
 * Click en cualquier lugar cierra el modal.
 * Soporta navegación back del dispositivo.
 */
export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ 
    imageUrl, 
    altText, 
    onClose 
}) => {
    console.log('[ImageZoomModal] 🖼️ Modal abierto', { imageUrl, altText });

    // Manejar tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log('[ImageZoomModal] ⌨️ Escape presionado, cerrando modal');
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Simular navegación back del browser
    // PERO: No hacerlo si estamos dentro de AdminView preview/panels
    useEffect(() => {
        // Detectar si estamos en contexto de AdminView (tiene z-50 panels)
        const isInAdminContext = document.querySelector('[class*="z-50"]') !== null;
        console.log('[ImageZoomModal] 🔍 ¿Estamos en AdminView?', isInAdminContext);

        if (isInAdminContext) {
            console.log('[ImageZoomModal] ⚠️ En AdminView, NO haciendo pushState para evitar conflictos');
            // En AdminView, solo manejar Escape y clicks, no history API
            return;
        }

        // Solo en vista pública: usar History API para back button
        console.log('[ImageZoomModal] 📍 Vista pública: Haciendo pushState');
        window.history.pushState({ modal: 'image-zoom', __modalInternal: true }, '');
        console.log('[ImageZoomModal] 📍 Estado actual:', window.history.state);

        const handlePopState = (e: PopStateEvent) => {
            console.log('[ImageZoomModal] ⬅️ popstate event recibido:', e.state);
            if (e.state?.modal === 'image-zoom') {
                console.log('[ImageZoomModal] ✅ Es nuestro modal, cerrando');
                onClose();
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // Limpiar estado si modal se cierra sin back button
            if (window.history.state?.modal === 'image-zoom') {
                console.log('[ImageZoomModal] 🧹 Cleanup: haciendo back');
                window.history.back();
            }
        };
    }, [onClose]);

    // Prevenir scroll del body
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Imagen ampliada"
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
                aria-label="Cerrar"
            >
                <svg 
                    className="w-6 h-6 text-white" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                    />
                </svg>
            </button>

            {/* Image - Click event stopped to prevent closing when clicking image */}
            <div 
                className="relative max-w-full max-h-full cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt={altText}
                    className="max-w-full max-h-[90vh] w-auto h-auto rounded-lg shadow-2xl object-contain"
                    style={{
                        // Smooth loading animation
                        animation: 'fadeIn 0.3s ease-out'
                    }}
                />
            </div>

            {/* Caption */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/70 backdrop-blur-sm">
                <p className="text-white text-sm font-medium">{altText}</p>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
};
