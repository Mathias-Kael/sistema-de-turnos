import React, { useState, useCallback, useRef } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Branding, Business } from '../../types';
import { BRANDING_PRESETS } from '../../constants';
import { ErrorMessage } from '../ui/ErrorMessage';

export const BrandingEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Función con debounce para actualizar el estado del negocio
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
        }, 500); // 500ms de espera
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

            {error && <ErrorMessage message={error} />}
        </div>
    );
};