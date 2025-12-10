import React, { useEffect } from 'react';
import { Service } from '../../types';
import { formatDuration } from '../../utils/format';

interface ServiceDescriptionModalProps {
    service: Service;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Modal fullscreen para mostrar descripción completa del servicio.
 * Soporta navegación back del dispositivo para cerrar.
 */
export const ServiceDescriptionModal: React.FC<ServiceDescriptionModalProps> = ({ 
    service, 
    onClose, 
    onConfirm 
}) => {
    console.log('[ServiceDescriptionModal] 📄 Modal abierto', { service: service.name });

    // Manejar tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log('[ServiceDescriptionModal] ⌨️ Escape presionado, cerrando modal');
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
        console.log('[ServiceDescriptionModal] 🔍 ¿Estamos en AdminView?', isInAdminContext);

        if (isInAdminContext) {
            console.log('[ServiceDescriptionModal] ⚠️ En AdminView, NO haciendo pushState para evitar conflictos');
            // En AdminView, solo manejar Escape y clicks, no history API
            return;
        }

        // Solo en vista pública: usar History API para back button
        console.log('[ServiceDescriptionModal] 📍 Vista pública: Haciendo pushState');
        window.history.pushState({ modal: 'service-description', __modalInternal: true }, '');
        console.log('[ServiceDescriptionModal] 📍 Estado actual:', window.history.state);

        const handlePopState = (e: PopStateEvent) => {
            console.log('[ServiceDescriptionModal] ⬅️ popstate event recibido:', e.state);
            if (e.state?.modal === 'service-description') {
                console.log('[ServiceDescriptionModal] ✅ Es nuestro modal, cerrando');
                onClose();
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // Limpiar estado si modal se cierra sin back button
            if (window.history.state?.modal === 'service-description') {
                console.log('[ServiceDescriptionModal] 🧹 Cleanup: haciendo back');
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
            className="fixed inset-0 z-[100] flex flex-col bg-background"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-default bg-surface px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <h2 
                        id="modal-title"
                        className="text-xl sm:text-2xl font-bold text-primary"
                    >
                        {service.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-background transition-colors"
                        aria-label="Cerrar"
                    >
                        <svg 
                            className="w-6 h-6 text-secondary" 
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
                </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center px-4 py-2 rounded-lg bg-surface font-semibold text-sm text-secondary">
                            <svg 
                                className="w-4 h-4 mr-2" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                                />
                            </svg>
                            {formatDuration(service.duration)}
                        </span>
                        <span className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-brand-text font-bold text-sm">
                            <svg 
                                className="w-4 h-4 mr-2" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                />
                            </svg>
                            {service.price}
                        </span>
                        {service.requiresDeposit && (
                            <span className="inline-flex items-center px-4 py-2 rounded-lg bg-surface text-secondary font-medium text-sm">
                                <svg 
                                    className="w-4 h-4 mr-2" 
                                    fill="currentColor" 
                                    viewBox="0 0 20 20"
                                >
                                    <path 
                                        fillRule="evenodd" 
                                        d="M10 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm-1 4V5a1 1 0 012 0v1H9z" 
                                        clipRule="evenodd" 
                                    />
                                </svg>
                                Requiere seña
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="prose prose-lg max-w-none">
                        <div className="text-base sm:text-lg text-primary leading-relaxed whitespace-pre-wrap">
                            {service.description || 'Sin descripción disponible.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 border-t border-default bg-surface px-4 py-4 sm:px-6">
                <div className="max-w-3xl mx-auto flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-secondary border-2 border-default hover:bg-background transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold bg-primary text-brand-text hover:opacity-90 transition-opacity shadow-md"
                    >
                        Seleccionar servicio
                    </button>
                </div>
            </div>
        </div>
    );
};
