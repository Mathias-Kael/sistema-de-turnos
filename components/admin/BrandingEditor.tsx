import React, { useState, useCallback, useRef } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Branding, Business } from '../../types';
import { BRANDING_PRESETS } from '../../constants';
import { ErrorMessage } from '../ui/ErrorMessage';
import { ImageUploader } from '../common/ImageUploader';
import { EditInfoModal } from '../admin/EditInfoModal';

export const BrandingEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<null | 'name' | 'description' | 'phone'>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setMessage = (type: 'success' | 'error', text: string) => {
        if (type === 'success') {
            setSuccessMessage(text);
            setError(null);
            setTimeout(() => setSuccessMessage(null), 3000);
        } else {
            setError(text);
            setSuccessMessage(null);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleCoverImageUpload = async (imageUrl: string) => {
        try {
            await dispatch({ type: 'SET_COVER_IMAGE', payload: imageUrl });
            setMessage('success', 'Foto de portada actualizada correctamente');
        } catch (error) {
            setMessage('error', 'Error al actualizar la foto de portada');
        }
    };

    const handleProfileImageUpload = async (imageUrl: string) => {
        try {
            await dispatch({ type: 'SET_PROFILE_IMAGE', payload: imageUrl });
            setMessage('success', 'Foto de perfil actualizada correctamente');
        } catch (error) {
            setMessage('error', 'Error al actualizar la foto de perfil');
        }
    };

    const handleBusinessInfoUpdate = async (field: 'name' | 'description' | 'phone', value: string) => {
        try {
            const updatedInfo = { ...business, [field]: value };
            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedInfo });
            setMessage('success', 'Información actualizada correctamente');
            setEditingField(null);
        } catch (error) {
            setMessage('error', 'Error al actualizar la información');
        }
    };

    const debouncedUpdate = useCallback((updatedBusiness: Business) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            try {
                await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            } catch (e: any) {
                setMessage('error', e.message);
            }
        }, 500);
    }, [dispatch]);

    const handleBrandingChange = (field: keyof Branding, value: string) => {
        debouncedUpdate({ ...business, branding: { ...business.branding, [field]: value } });
    };

    const applyPreset = (preset: Branding) => {
        debouncedUpdate({ ...business, branding: preset });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {successMessage && <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">{successMessage}</div>}
            {error && <ErrorMessage message={error} />}

            <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Imágenes del Negocio</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Personaliza las fotos que representan tu negocio</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto de Portada</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recomendado: 1200x400px</p>
                        <ImageUploader type="cover" currentImageUrl={business.coverImageUrl} onImageChange={handleCoverImageUpload} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto de Perfil</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Logo o imagen circular (400x400px)</p>
                        <ImageUploader type="profile" currentImageUrl={business.profileImageUrl} onImageChange={handleProfileImageUpload} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información del Negocio</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Datos básicos que aparecen en tu página</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <div><span className="font-medium">Nombre:</span> {business.name}</div>
                        <button onClick={() => setEditingField('name')} className="text-sm text-blue-600 hover:underline">Editar</button>
                    </div>
                    <div className="flex justify-between items-center">
                        <div><span className="font-medium">Descripción:</span> {business.description || 'No especificada'}</div>
                        <button onClick={() => setEditingField('description')} className="text-sm text-blue-600 hover:underline">Editar</button>
                    </div>
                    <div className="flex justify-between items-center">
                        <div><span className="font-medium">Teléfono:</span> {business.phone || 'No especificado'}</div>
                        <button onClick={() => setEditingField('phone')} className="text-sm text-blue-600 hover:underline">Editar</button>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium">Branding y Estilo</h3>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-secondary">Presets</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {BRANDING_PRESETS.map(preset => (
                            <button key={preset.name} onClick={() => applyPreset(preset.colors)} className="px-3 py-1.5 border border-default rounded-md text-sm hover:bg-surface-hover text-primary">
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="primaryColor" className="block text-sm font-medium text-secondary">Color Primario</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" id="primaryColor" value={business.branding.primaryColor} onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer" />
                            <input type="text" value={business.branding.primaryColor} onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="secondaryColor" className="block text-sm font-medium text-secondary">Color Secundario</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" id="secondaryColor" value={business.branding.secondaryColor} onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)} className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer" />
                            <input type="text" value={business.branding.secondaryColor} onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="textColor" className="block text-sm font-medium text-secondary">Color de Texto</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" id="textColor" value={business.branding.textColor} onChange={(e) => handleBrandingChange('textColor', e.target.value)} className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer" />
                            <input type="text" value={business.branding.textColor} onChange={(e) => handleBrandingChange('textColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="font" className="block text-sm font-medium text-secondary">Fuente</label>
                        <select id="font" value={business.branding.font} onChange={(e) => handleBrandingChange('font', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-default bg-surface rounded-md shadow-sm text-primary">
                            <option value="'Poppins', sans-serif">Poppins</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'Merriweather', serif">Merriweather</option>
                            <option value="'Lato', sans-serif">Lato</option>
                            <option value="'Montserrat', sans-serif">Montserrat</option>
                        </select>
                    </div>
                </div>
            </div>

            {editingField && (
                <EditInfoModal
                    field={editingField}
                    currentValue={business[editingField] || ''}
                    onSave={(value) => handleBusinessInfoUpdate(editingField, value)}
                    onClose={() => setEditingField(null)}
                />
            )}
        </div>
    );
};