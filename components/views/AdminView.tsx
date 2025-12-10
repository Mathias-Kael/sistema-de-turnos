import React, { useState, useEffect, useRef } from 'react';
import { AdminHeader } from '../admin/AdminHeader';
import { AdminFooter, AdminTab } from '../admin/AdminFooter';
import { DashboardView } from './DashboardView';
import { ManagementView } from './ManagementView';
import { ReservationsView } from './ReservationsView';
import { AnalyticsView } from './AnalyticsView';
import { BrandingEditor } from '../admin/BrandingEditor';
import { ManualBookingModal } from '../admin/ManualBookingModal';
import { SharePanel } from '../admin/SharePanel';
import { ClientView } from './ClientView';
import { LayoutProvider } from '../../contexts/LayoutContext';

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
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

    // Lógica del menú de usuario
    const { user, signOut } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // History API: Gestión del botón "Atrás" del navegador
    useEffect(() => {
        console.log('[AdminView] 🎛️ Estado paneles:', { isPreviewPanelOpen, isSharePanelOpen, isSettingsPanelOpen, activeTab });

        // Listener para interceptar el botón "Atrás"
        const handlePopState = (event: PopStateEvent) => {
            console.log('[AdminView] ⬅️ popstate event recibido en AdminView:', event.state);
            console.log('[AdminView] 🔍 Estado ACTUAL de history:', window.history.state);
            console.log('[AdminView] 📊 Estado actual paneles:', { isPreviewPanelOpen, isSharePanelOpen, isSettingsPanelOpen });
            
            // IMPORTANTE: event.state contiene el estado ANTERIOR, no el actual
            // Debemos verificar window.history.state que tiene el estado ACTUAL después del pushState
            const currentState = window.history.state;
            
            // Ignorar eventos de modals internos (ImageZoom, ServiceDescription, etc.)
            if (currentState?.__modalInternal) {
                console.log('[AdminView] 🚫 Estado ACTUAL tiene __modalInternal, IGNORANDO');
                return;
            }
            
            console.log('[AdminView] ✅ Estado ACTUAL NO tiene __modalInternal, procesando...');
            
            // Si hay paneles abiertos, cerrarlos primero
            if (isPreviewPanelOpen) {
                console.log('[AdminView] 🔴 Cerrando PreviewPanel');
                isNavigatingRef.current = true;
                setIsPreviewPanelOpen(false);
                return;
            }
            if (isSharePanelOpen) {
                console.log('[AdminView] 🔴 Cerrando SharePanel');
                isNavigatingRef.current = true;
                setIsSharePanelOpen(false);
                return;
            }
            if (isSettingsPanelOpen) {
                console.log('[AdminView] 🔴 Cerrando SettingsPanel');
                isNavigatingRef.current = true;
                setIsSettingsPanelOpen(false);
                return;
            }
            // Si no estamos en dashboard, interceptar y volver a dashboard
            if (activeTab !== 'DASHBOARD') {
                console.log('[AdminView] 🔴 Volviendo a DASHBOARD desde', activeTab);
                isNavigatingRef.current = true;
                setActiveTab('DASHBOARD');
            }
            console.log('[AdminView] ✅ No hay acción que tomar');
            // Si estamos en dashboard, dejar que el navegador maneje la navegación normal
        };

        // Listener para confirmación de salida desde dashboard
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // Solo mostrar confirmación si estamos en dashboard y sin paneles abiertos
            if (activeTab === 'DASHBOARD' && !isPreviewPanelOpen && !isSharePanelOpen && !isSettingsPanelOpen) {
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
    }, [activeTab, isPreviewPanelOpen, isSharePanelOpen, isSettingsPanelOpen]);

    // Empujar estado al historial cuando cambia activeTab o se abren paneles
    useEffect(() => {
        // No empujar estado si estamos navegando con el botón atrás
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
            return;
        }

        // Empujar estado si:
        // 1. activeTab no es DASHBOARD
        // 2. O si hay paneles abiertos (preview, share o settings)
        if (activeTab !== 'DASHBOARD' || isPreviewPanelOpen || isSharePanelOpen || isSettingsPanelOpen) {
            window.history.pushState({
                tab: activeTab,
                preview: isPreviewPanelOpen,
                share: isSharePanelOpen,
                settings: isSettingsPanelOpen
            }, '', '');
        }
    }, [activeTab, isPreviewPanelOpen, isSharePanelOpen, isSettingsPanelOpen]);

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
        if (isPreviewPanelOpen || isSharePanelOpen || isSettingsPanelOpen) {
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
                onSettings={() => {
                    setIsSettingsPanelOpen(true);
                    setIsUserMenuOpen(false);
                }}
                onUserMenuToggle={() => setIsUserMenuOpen(prev => !prev)}
            />

            <main className="flex-1 pb-20">
                {/* Contenido principal que cambia con el footer */}
                {renderContent()}

                {/* Paneles flotantes que se abren desde el Header */}
                {isPreviewPanelOpen && (
                    <LayoutProvider isInAdminPreview={true}>
                        <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                            <button onClick={() => setIsPreviewPanelOpen(false)} className="fixed top-4 right-4 h-8 w-8 bg-gray-800/50 text-white rounded-full flex items-center justify-center z-50 hover:bg-gray-800/75 transition-colors">&times;</button>
                            <ClientView />
                        </div>
                    </LayoutProvider>
                )}

                {isSharePanelOpen && (
                    <LayoutProvider isInAdminPreview={true}>
                        <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                            <button onClick={() => setIsSharePanelOpen(false)} className="fixed top-4 right-4 h-8 w-8 bg-gray-800/50 text-white rounded-full flex items-center justify-center z-50 hover:bg-gray-800/75 transition-colors">&times;</button>
                            <SharePanel />
                        </div>
                    </LayoutProvider>
                )}

                {isSettingsPanelOpen && (
                    <LayoutProvider isInAdminPreview={true}>
                        <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                            <button onClick={() => setIsSettingsPanelOpen(false)} className="fixed top-4 right-4 h-8 w-8 bg-gray-800/50 text-white rounded-full flex items-center justify-center z-50 hover:bg-gray-800/75 transition-colors">&times;</button>
                            <div className="max-w-4xl mx-auto pt-8">
                                <h2 className="text-2xl font-bold text-primary mb-6">Configuración del Negocio</h2>
                                <BrandingEditor />
                            </div>
                        </div>
                    </LayoutProvider>
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
            
            {/* Menú de usuario */}
            {isUserMenuOpen && (
                 <div className="fixed top-16 right-4 w-56 rounded-md border border-default bg-background shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-default">
                        <p className="text-xs text-secondary truncate" title={user?.email}>
                            {user?.email || 'Usuario'}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsSettingsPanelOpen(true);
                            setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-surface flex items-center gap-2"
                    >
                        <span className="text-lg">⚙️</span>
                        Configuración
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-surface flex items-center gap-2"
                    >
                        <span className="text-lg">🚪</span>
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
};
