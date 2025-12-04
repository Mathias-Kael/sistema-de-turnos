import React, { useState, useEffect, useRef } from 'react';
import { AdminHeader } from '../admin/AdminHeader';
import { AdminFooter, AdminTab } from '../admin/AdminFooter';
import { DashboardView } from './DashboardView';
import { ManagementView } from './ManagementView';
import { ReservationsView } from './ReservationsView';
import { AnalyticsView } from './AnalyticsView';
import { ManualBookingModal } from '../admin/ManualBookingModal';
import { SharePanel } from '../admin/SharePanel';
import { ClientView } from './ClientView';

// Modales que se controlarán desde el Header
// Se podrían mover a un gestor de modales global en el futuro
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessDispatch } from '../../context/BusinessContext';
import { Booking } from '../../types';


export const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
    const dispatch = useBusinessDispatch();
    const isNavigatingRef = useRef(false);
    
    // Estados para controlar la visibilidad de los modales/paneles del Header
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState(false);
    const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);

    // Lógica del menú de usuario
    const { user, signOut } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // History API: Gestión del botón "Atrás" del navegador
    useEffect(() => {
        // Listener para interceptar el botón "Atrás"
        const handlePopState = (event: PopStateEvent) => {
            // Si hay paneles abiertos, cerrarlos primero
            if (isPreviewPanelOpen) {
                isNavigatingRef.current = true;
                setIsPreviewPanelOpen(false);
                return;
            }
            if (isSharePanelOpen) {
                isNavigatingRef.current = true;
                setIsSharePanelOpen(false);
                return;
            }
            // Si no estamos en dashboard, interceptar y volver a dashboard
            if (activeTab !== 'DASHBOARD') {
                isNavigatingRef.current = true;
                setActiveTab('DASHBOARD');
            }
            // Si estamos en dashboard, dejar que el navegador maneje la navegación normal
        };

        // Listener para confirmación de salida desde dashboard
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // Solo mostrar confirmación si estamos en dashboard y sin paneles abiertos
            if (activeTab === 'DASHBOARD' && !isPreviewPanelOpen && !isSharePanelOpen) {
                event.preventDefault();
                event.returnValue = ''; // Chrome requiere returnValue
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeTab, isPreviewPanelOpen, isSharePanelOpen]);

    // Empujar estado al historial cuando cambia activeTab o se abren paneles
    useEffect(() => {
        // No empujar estado si estamos navegando con el botón atrás
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
            return;
        }

        // Empujar estado si:
        // 1. activeTab no es DASHBOARD
        // 2. O si hay paneles abiertos (preview o share)
        if (activeTab !== 'DASHBOARD' || isPreviewPanelOpen || isSharePanelOpen) {
            window.history.pushState({
                tab: activeTab,
                preview: isPreviewPanelOpen,
                share: isSharePanelOpen
            }, '', '');
        }
    }, [activeTab, isPreviewPanelOpen, isSharePanelOpen]);

    const handleSignOut = async () => {
      await signOut();
    };

    const handleAddBooking = async (newBooking: Omit<Booking, 'id'>) => {
        try {
            await dispatch({ type: 'CREATE_BOOKING', payload: newBooking });
            setIsBookingModalOpen(false);
        } catch (e) {
            console.error("Error creating booking from header:", e);
            // Opcional: mostrar un toast/alerta de error al usuario
        }
    };

    const renderContent = () => {
        // Oculta la vista activa si un panel del header está abierto
        if (isPreviewPanelOpen || isSharePanelOpen) {
            return null;
        }

        switch (activeTab) {
            case 'DASHBOARD':
                return <DashboardView />;
            case 'ANALYTICS':
                return <AnalyticsView />;
            case 'MANAGEMENT':
                return <ManagementView />;
            case 'RESERVATIONS':
                return <ReservationsView />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background text-primary flex flex-col">
            <AdminHeader
                onNewBooking={() => setIsBookingModalOpen(true)}
                onPreview={() => setIsPreviewPanelOpen(true)}
                onShare={() => setIsSharePanelOpen(true)}
                onUserMenuToggle={() => setIsUserMenuOpen(prev => !prev)}
            />

            <main className="flex-1 pb-20">
                {/* Contenido principal que cambia con el footer */}
                {renderContent()}

                {/* Paneles flotantes que se abren desde el Header */}
                {isPreviewPanelOpen && (
                    <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                        <button onClick={() => setIsPreviewPanelOpen(false)} className="fixed top-4 right-4 h-8 w-8 bg-gray-800/50 text-white rounded-full flex items-center justify-center z-50 hover:bg-gray-800/75 transition-colors">&times;</button>
                        <ClientView />
                    </div>
                )}

                {isSharePanelOpen && (
                    <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                        <button onClick={() => setIsSharePanelOpen(false)} className="fixed top-4 right-4 h-8 w-8 bg-gray-800/50 text-white rounded-full flex items-center justify-center z-50 hover:bg-gray-800/75 transition-colors">&times;</button>
                        <SharePanel />
                    </div>
                )}
            </main>

            <AdminFooter activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Modales */}
            {isBookingModalOpen && (
                <ManualBookingModal
                    // defaultDate no se pasa, el modal usará la fecha actual como se especifica
                    onClose={() => setIsBookingModalOpen(false)}
                    onSave={handleAddBooking}
                />
            )}
            
            {/* Menú de usuario (lógica simplificada) */}
            {isUserMenuOpen && (
                 <div className="absolute top-16 right-4 mt-2 w-56 rounded-md border border-default bg-background shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-default">
                        <p className="text-xs text-secondary truncate" title={user?.email}>
                            {user?.email || 'Usuario'}
                        </p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-surface"
                    >
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
};
