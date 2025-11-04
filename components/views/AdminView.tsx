import React, { useState } from 'react';
import { AdminHeader } from '../admin/AdminHeader';
import { AdminFooter, AdminTab } from '../admin/AdminFooter';
import { DashboardView } from './DashboardView';
import { ManagementView } from './ManagementView';
import { ReservationsView } from './ReservationsView';
import { ManualBookingModal } from '../admin/ManualBookingModal';
import { SharePanel } from '../admin/SharePanel';
import { ClientView } from './ClientView';

// Modales que se controlarán desde el Header
// Se podrían mover a un gestor de modales global en el futuro
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';


export const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
    
    // Estados para controlar la visibilidad de los modales/paneles del Header
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState(false);
    const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);

    // Lógica del menú de usuario (simplificada del código original)
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } finally {
            navigate('/login', { replace: true });
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
                        <button onClick={() => setIsPreviewPanelOpen(false)} className="absolute top-4 right-4 text-2xl">&times;</button>
                        <ClientView />
                    </div>
                )}

                {isSharePanelOpen && (
                    <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
                        <button onClick={() => setIsSharePanelOpen(false)} className="absolute top-4 right-4 text-2xl">&times;</button>
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
                    onSave={(booking) => {
                        console.log('Booking to save:', booking); // Lógica de guardado a implementar
                        setIsBookingModalOpen(false);
                    }}
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
