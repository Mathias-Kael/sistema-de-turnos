import React from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { Branding } from '../../types';
import { BRANDING_PRESETS } from '../../constants';

export const BrandingEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_BUSINESS_INFO',
            payload: {
                name: name === 'name' ? value : business.name,
                description: name === 'description' ? value : business.description,
                logoUrl: name === 'logoUrl' ? value : business.logoUrl,
            }
        });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: 'SET_PHONE', payload: e.target.value });
    };

    const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const updatedBranding = {
            ...business.branding,
            [name]: value
        };
        dispatch({ type: 'SET_BRANDING', payload: updatedBranding });
    };

    const applyPreset = (preset: Branding) => {
        // CORRECCIÓN DEFINITIVA: Se crea un objeto 'newBranding' completamente nuevo y explícito.
        // Esto elimina cualquier ambigüedad y garantiza que React detecte un cambio de 
        // referencia en el estado, forzando la actualización de la vista previa en vivo.
        const newBranding: Branding = {
            primaryColor: preset.primaryColor,
            secondaryColor: preset.secondaryColor,
            textColor: preset.textColor,
            font: preset.font,
        };
        dispatch({ type: 'SET_BRANDING', payload: newBranding });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Información del Negocio</h3>
                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-secondary">Nombre del Negocio</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={business.name}
                            onChange={handleInfoChange}
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-secondary">Descripción</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            value={business.description}
                            onChange={handleInfoChange}
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="logoUrl" className="block text-sm font-medium text-secondary">URL del Logo</label>
                        <input
                            type="text"
                            id="logoUrl"
                            name="logoUrl"
                            value={business.logoUrl}
                            onChange={handleInfoChange}
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-secondary">Teléfono (WhatsApp)</label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            placeholder="5491112345678"
                            value={business.phone || ''}
                            onChange={handlePhoneChange}
                            className="mt-1 block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary"
                        />
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
                            <input
                                type="color"
                                id="primaryColor"
                                name="primaryColor"
                                value={business.branding.primaryColor}
                                onChange={handleBrandingChange}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                            <input type="text" name="primaryColor" value={business.branding.primaryColor} onChange={handleBrandingChange} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="secondaryColor" className="block text-sm font-medium text-secondary">Color Secundario</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                id="secondaryColor"
                                name="secondaryColor"
                                value={business.branding.secondaryColor}
                                onChange={handleBrandingChange}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                             <input type="text" name="secondaryColor" value={business.branding.secondaryColor} onChange={handleBrandingChange} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="textColor" className="block text-sm font-medium text-secondary">Color de Texto</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                id="textColor"
                                name="textColor"
                                value={business.branding.textColor}
                                onChange={handleBrandingChange}
                                className="h-10 w-10 p-1 border border-default rounded-md cursor-pointer"
                            />
                            <input type="text" name="textColor" value={business.branding.textColor} onChange={handleBrandingChange} className="block w-full px-3 py-2 border border-default rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-surface text-primary" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="font" className="block text-sm font-medium text-secondary">Fuente</label>
                        <select
                            id="font"
                            name="font"
                            value={business.branding.font}
                            onChange={handleBrandingChange}
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
        </div>
    );
};