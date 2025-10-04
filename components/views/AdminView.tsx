import React, { useState } from 'react';
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
import { imageStorage } from '../../services/imageStorage';

type Tab = 'services' | 'equipo' | 'hours' | 'share' | 'reservations' | 'preview' | 'branding';

export const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('services');
    // Tabs centralizados
    const tabs: { id: Tab; label: string }[] = [
        { id: 'services', label: 'Servicios' },
        { id: 'equipo', label: 'Equipo' },
        { id: 'hours', label: 'Horarios' },
        { id: 'reservations', label: 'Reservas' },
        { id: 'branding', label: 'Branding' },
        { id: 'share', label: 'Compartir' },
        { id: 'preview', label: 'Vista Previa' },
    ];
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    // Estados para modals de edición
    const [editingField, setEditingField] = useState<null | 'name' | 'description' | 'phone'>(null);
    const [editingCover, setEditingCover] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'branding':
                return <BrandingEditor />; // ahora sólo colores/fuentes
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

    const DesktopTabs: React.FC = () => (
        <div className="hidden md:flex gap-2 border-b border-default px-6 mt-2 mb-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                        activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const MobileSelect: React.FC = () => (
        <div className="md:hidden px-4 mt-2 mb-6">
            <select
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
    };

    const handleCoverUpload = async (file: File) => {
        const res = await imageStorage.uploadImage(file, 'cover', business.coverImageUrl);
        if (!res.success || !res.imageId) {
            console.error('Error al subir portada:', res.error);
            return;
        }
        await dispatch({ type: 'SET_COVER_IMAGE', payload: res.imageId });
        setEditingCover(false);
    };

    const handleProfileUpload = async (file: File) => {
        const res = await imageStorage.uploadImage(file, 'profile', business.profileImageUrl);
        if (!res.success || !res.imageId) {
            console.error('Error al subir imagen de perfil:', res.error);
            return;
        }
        await dispatch({ type: 'SET_PROFILE_IMAGE', payload: res.imageId });
        setEditingProfile(false);
    };

    return (
        <div className="min-h-screen bg-background text-primary">
            {/* Hero (sin header tradicional) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <HeroSection
                    business={business}
                    editable
                    onEditCover={() => setEditingCover(true)}
                    onEditProfile={() => setEditingProfile(true)}
                    onEditInfo={(f) => setEditingField(f)}
                />
            </div>

            {/* Menú móvil */}
            {/* Navegación responsive */}
            <MobileSelect />
            <DesktopTabs />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="bg-surface p-6 rounded-lg shadow border border-default">
                    {renderContent()}
                </div>
            </main>

            {/* Modals de edición de texto */}
            {editingField && (
                <EditInfoModal
                    field={editingField}
                    currentValue={business[editingField] || ''}
                    onSave={(val) => handleSaveField(editingField, val)}
                    onClose={() => setEditingField(null)}
                />
            )}

            {/* Modals simples para subir cover/profile (reutiliza input oculto) */}
            {editingCover && (
                <ImageUploadInlineModal
                    title="Editar Portada"
                    type="cover"
                    currentImageId={business.coverImageUrl}
                    onClose={() => setEditingCover(false)}
                    onUpload={handleCoverUpload}
                />
            )}
            {editingProfile && (
                <ImageUploadInlineModal
                    title="Editar Perfil"
                    type="profile"
                    currentImageId={business.profileImageUrl}
                    onClose={() => setEditingProfile(false)}
                    onUpload={handleProfileUpload}
                />
            )}
        </div>
    );
};

// Modal interno para uploads rápidos (sin drag & drop avanzado) para foco en flujo hero
const ImageUploadInlineModal: React.FC<{
    title: string;
    type: 'cover' | 'profile';
    currentImageId?: string;
    onClose: () => void;
    onUpload: (file: File) => Promise<void>;
}> = ({ title, type, onClose, onUpload }) => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsLoading(true);
            await onUpload(file);
        } catch (err: any) {
            setError(err.message || 'Error al subir la imagen');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 border border-default">
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <input
                    type="file"
                    accept={type === 'cover' ? 'image/*' : 'image/*'}
                    onChange={handleChange}
                    className="w-full mb-4"
                />
                {isLoading && <p className="text-sm text-secondary mb-2">Procesando...</p>}
                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-default rounded-md hover:bg-surface-hover">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
