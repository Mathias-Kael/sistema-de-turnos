import React, { useEffect, useRef, useState } from 'react';
import { BrandingEditor } from '../admin/BrandingEditor';
import { ServicesEditor } from '../admin/ServicesEditor';
import { HoursEditor } from '../admin/HoursEditor';
import { EmployeesEditor } from '../admin/EmployeesEditor';
import { SharePanel } from '../admin/SharePanel';
import { ReservationsManager } from '../admin/ReservationsManager';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { ClientView } from './ClientView';
import { HeroSection } from '../common/HeroSection';
import { EditInfoModal } from '../admin/EditInfoModal';
import { ImageUploader } from '../common/ImageUploader';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Tab = 'services' | 'equipo' | 'hours' | 'share' | 'reservations' | 'preview' | 'branding';

export const AdminView: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('services');
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    const tabs: { id: Tab; label: string }[] = [
        { id: 'services', label: 'Servicios' },
        { id: 'equipo', label: 'Equipo' },
        { id: 'hours', label: 'Horarios' },
        { id: 'reservations', label: 'Reservas' },
        { id: 'branding', label: 'Branding' },
        { id: 'share', label: 'Compartir' },
        { id: 'preview', label: 'Vista Previa' },
    ];
    const [editingField, setEditingField] = useState<null | 'name' | 'description' | 'phone'>(null);
    const [editingCover, setEditingCover] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // User menu (avatar + dropdown)
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const userEmail = user?.email ?? '';
    const avatarUrl: string | undefined = (user as any)?.user_metadata?.avatar_url ?? undefined;
    const userInitial = (userEmail || business.name || 'U').charAt(0).toUpperCase();

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [menuOpen]);

    const renderContent = () => {
        switch (activeTab) {
            case 'branding':
                return <BrandingEditor />;
            case 'services':
                return <ServicesEditor />;
            case 'equipo':
                return <EmployeesEditor />;
            case 'hours':
                return <HoursEditor />;
            case 'share':
                return <SharePanel />;
            case 'reservations':
                return <ReservationsManager />;
            case 'preview':
                return <div className="border-default rounded-lg p-2 bg-background"><ClientView /></div>;
            default:
                return null;
        }
    };

    const MobileSelect: React.FC = () => (
        <div className="md:hidden px-6 mb-4">
            <label htmlFor="admin-tab-select" className="sr-only">Seleccionar sección</label>
            <select
                id="admin-tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as Tab)}
                className="w-full p-2 border border-default rounded-lg bg-surface text-primary"
            >
                {tabs.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                ))}
            </select>
        </div>
    );

    const handleSaveField = async (field: 'name' | 'description' | 'phone', value: string) => {
        if (field === 'phone') {
            await dispatch({ type: 'SET_PHONE', payload: value });
        } else {
            await dispatch({
                type: 'SET_BUSINESS_INFO',
                payload: {
                    name: field === 'name' ? value : business.name,
                    description: field === 'description' ? value : business.description,
                }
            });
        }
        setEditingField(null);
        setSuccess(`${field === 'name' ? 'Nombre' : field === 'description' ? 'Descripción' : 'Teléfono'} actualizado`);
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleCoverImageChange = async (imageId: string) => {
        try {
            setError('');
            await dispatch({ type: 'SET_COVER_IMAGE', payload: imageId });
            setEditingCover(false);
            setSuccess('Portada actualizada');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Error al actualizar portada');
        }
    };

    const handleProfileImageChange = async (imageId: string) => {
        try {
            setError('');
            await dispatch({ type: 'SET_PROFILE_IMAGE', payload: imageId });
            setEditingProfile(false);
            setSuccess('Perfil actualizado');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Error al actualizar perfil');
        }
    };

    return (
        <div className="min-h-screen bg-background text-primary">
            {/* Top bar con menú de usuario */}
            <div className="bg-background border-b border-default">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end">
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring focus-visible:ring-primary/40"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="h-9 w-9 rounded-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-brand-text text-sm font-semibold">
                                    {userInitial}
                                </span>
                            )}
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                aria-label="Menú de usuario"
                                className="absolute right-0 mt-2 w-56 rounded-md border border-default bg-background shadow-lg z-50 overflow-hidden"
                            >
                                <div className="px-3 py-2 border-b border-default">
                                    <p className="text-xs text-secondary truncate" title={userEmail}>
                                        {userEmail || 'Usuario'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-3 py-2 text-primary hover:bg-surface"
                                    role="menuitem"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <HeroSection
                    business={business}
                    editable
                    onEditCover={() => setEditingCover(true)}
                    onEditProfile={() => setEditingProfile(true)}
                    onEditInfo={(f) => setEditingField(f)}
                />
            </div>
            <MobileSelect />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
                <div
                    className="hidden md:flex admin-desktop-tabs overflow-x-auto hide-scrollbar gap-1 -mb-px border-b border-default"
                    role="tablist"
                    aria-label="Navegación administración"
                >
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-4 py-2 text-sm font-medium rounded-t-md transition-colors focus:outline-none focus-visible:ring focus-visible:ring-primary/40 ${
                                    isActive
                                        ? 'text-primary bg-surface'
                                        : 'text-secondary hover:text-primary hover:bg-surface'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="absolute left-0 bottom-0 h-0.5 w-full bg-primary rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div
                    id={`panel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeTab}`}
                    className="bg-surface p-6 rounded-lg shadow border border-default"
                >
                    {renderContent()}
                </div>
            </main>

            {editingField && (
                <EditInfoModal
                    field={editingField}
                    currentValue={business[editingField] || ''}
                    onSave={(val) => handleSaveField(editingField, val)}
                    onClose={() => setEditingField(null)}
                />
            )}

            {editingCover && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 border border-default">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-primary">Editar Portada</h3>
                            <button
                                onClick={() => { setEditingCover(false); setError(''); }}
                                className="text-secondary hover:text-primary"
                                aria-label="Cerrar"
                            >✕</button>
                        </div>
                        <ImageUploader
                            currentImageUrl={business.coverImageUrl}
                            type="cover"
                            label="Nueva portada"
                            onImageChange={handleCoverImageChange}
                            onError={(err) => setError(err)}
                        />
                        {error && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
                        )}
                    </div>
                </div>
            )}
            
            {editingProfile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 border border-default">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-primary">Editar Perfil</h3>
                            <button
                                onClick={() => { setEditingProfile(false); setError(''); }}
                                className="text-secondary hover:text-primary"
                                aria-label="Cerrar"
                            >✕</button>
                        </div>
                        <ImageUploader
                            currentImageUrl={business.profileImageUrl}
                            type="profile"
                            label="Nueva imagen de perfil"
                            onImageChange={handleProfileImageChange}
                            onError={(err) => setError(err)}
                        />
                        {error && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
                        )}
                    </div>
                </div>
            )}

            {(success || error) && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-full max-w-sm px-4">
                    {success && (
                        <div className="px-4 py-2 rounded-md bg-green-100 text-green-800 text-sm shadow border border-green-300">
                            {success}
                        </div>
                    )}
                    {error && !editingCover && !editingProfile && (
                        <div className="px-4 py-2 rounded-md bg-red-100 text-red-700 text-sm shadow border border-red-300">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
