import React, { useState, useCallback, useRef } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Branding, Business } from '../../types';
import { BRANDING_PRESETS } from '../../constants';
import { ErrorMessage } from '../ui/ErrorMessage';
import {
    sanitizeWhatsappNumber,
    sanitizeInstagramUsername,
    sanitizeFacebookPage,
    isValidWhatsappNumber,
    isValidInstagramUsername,
    isValidFacebookPage,
} from '../../utils/socialMedia';

export const BrandingEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Estado local para inputs de redes sociales (para respuesta inmediata)
    const [localWhatsapp, setLocalWhatsapp] = useState(business.whatsapp || '');
    const [localInstagram, setLocalInstagram] = useState(business.instagram || '');
    const [localFacebook, setLocalFacebook] = useState(business.facebook || '');
    
    // Track si hay cambios sin guardar
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Sincronizar estado local cuando cambia el business (ej: al cargar datos)
    React.useEffect(() => {
        setLocalWhatsapp(business.whatsapp || '');
        setLocalInstagram(business.instagram || '');
        setLocalFacebook(business.facebook || '');
        setHasUnsavedChanges(false);
    }, [business.whatsapp, business.instagram, business.facebook]);

    // Función con debounce para actualizar el estado del negocio (usado para branding)
    const debouncedUpdate = useCallback((updatedBusiness: Business) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(async () => {
            setError(null);
            try {
                await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            } catch (e: any) {
                setError(e.message);
            }
        }, 500);
    }, [dispatch]);

    const handleUpdate = (field: keyof Business, value: any) => {
        const updatedBusiness = { ...business, [field]: value };
        debouncedUpdate(updatedBusiness);
    };

    const handleBrandingChange = (field: keyof Branding, value: string) => {
        handleUpdate('branding', { ...business.branding, [field]: value });
    };

    const applyPreset = (preset: Branding) => {
        handleUpdate('branding', preset);
    };

    const handleSocialMediaChange = (field: 'whatsapp' | 'instagram' | 'facebook', value: string) => {
        // Actualizar estado local inmediatamente para feedback visual
        switch (field) {
            case 'whatsapp':
                setLocalWhatsapp(value);
                break;
            case 'instagram':
                setLocalInstagram(value);
                break;
            case 'facebook':
                setLocalFacebook(value);
                break;
        }
        
        // Marcar que hay cambios sin guardar
        setHasUnsavedChanges(true);
        setError(null);
        setSuccessMessage(null);
    };

    // Nueva función para guardar redes sociales explícitamente
    const handleSaveSocialMedia = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const updatedBusiness = {
                ...business,
                whatsapp: localWhatsapp || undefined,
                instagram: localInstagram || undefined,
                facebook: localFacebook || undefined,
            };

            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            
            setSuccessMessage('✅ Redes sociales guardadas correctamente');
            setHasUnsavedChanges(false);
            
            // Limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (e: any) {
            setError(e.message || 'Error al guardar las redes sociales');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
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
                            <input
                                type="color"
                                id="primaryColor"
                                value={business.branding.primaryColor}
                                onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                            <input type="text" value={business.branding.primaryColor} onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="secondaryColor" className="block text-sm font-medium text-secondary">Color Secundario</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                id="secondaryColor"
                                value={business.branding.secondaryColor}
                                onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                             <input type="text" value={business.branding.secondaryColor} onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="textColor" className="block text-sm font-medium text-secondary">Color de Texto</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                id="textColor"
                                value={business.branding.textColor}
                                onChange={(e) => handleBrandingChange('textColor', e.target.value)}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                            <input type="text" value={business.branding.textColor} onChange={(e) => handleBrandingChange('textColor', e.target.value)} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="font" className="block text-sm font-medium text-secondary">Fuente</label>
                        <select
                            id="font"
                            value={business.branding.font}
                            onChange={(e) => handleBrandingChange('font', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-default bg-surface rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-primary"
                        >
                            <option value="'Poppins', sans-serif">Poppins</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'Merriweather', serif">Merriweather</option>
                            <option value="'Lato', sans-serif">Lato</option>
                            <option value="'Montserrat', sans-serif">Montserrat</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sección de Redes Sociales */}
            <div className="mt-8 pt-6 border-t border-default">
                <h3 className="text-lg font-medium mb-4">Redes Sociales</h3>
                <p className="text-sm text-secondary mb-4">
                    Configura tus redes sociales para que tus clientes puedan contactarte fácilmente.
                </p>
                <div className="space-y-4">
                    {/* WhatsApp del negocio */}
                    <div>
                        <label htmlFor="businessWhatsapp" className="block text-sm font-medium text-secondary">
                            WhatsApp del Negocio
                        </label>
                        <input
                            type="text"
                            id="businessWhatsapp"
                            value={localWhatsapp}
                            onChange={(e) => handleSocialMediaChange('whatsapp', e.target.value)}
                            placeholder="+54911234567890"
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
                        <p className="mt-1 text-xs text-secondary">
                            Formato internacional con código de país (ej: +54911234567890)
                        </p>
                    </div>

                    {/* Instagram */}
                    <div>
                        <label htmlFor="instagram" className="block text-sm font-medium text-secondary">
                            Instagram
                        </label>
                        <div className="mt-1 flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-default bg-surface text-secondary text-sm">
                                @
                            </span>
                            <input
                                type="text"
                                id="instagram"
                                value={localInstagram}
                                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                                placeholder="mi_negocio"
                                className="flex-1 px-3 py-2 border border-default rounded-r-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                            />
                        </div>
                        <p className="mt-1 text-xs text-secondary">
                            Solo el nombre de usuario (sin @)
                        </p>
                    </div>

                    {/* Facebook */}
                    <div>
                        <label htmlFor="facebook" className="block text-sm font-medium text-secondary">
                            Facebook
                        </label>
                        <input
                            type="text"
                            id="facebook"
                            value={localFacebook}
                            onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                            placeholder="mi.negocio o ID de página"
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
                        <p className="mt-1 text-xs text-secondary">
                            Nombre de usuario o ID de tu página de Facebook
                        </p>
                    </div>
                </div>

                {/* Botón de guardar */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleSaveSocialMedia}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
                            hasUnsavedChanges && !isSaving
                                ? 'bg-primary text-brand-text hover:opacity-90'
                                : 'bg-surface text-secondary cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Redes Sociales'}
                    </button>
                    
                    {hasUnsavedChanges && !isSaving && (
                        <span className="text-sm text-secondary">
                            • Hay cambios sin guardar
                        </span>
                    )}
                    
                    {successMessage && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                            {successMessage}
                        </span>
                    )}
                </div>
            </div>

            {error && <ErrorMessage message={error} />}
        </div>
    );
};