import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { BusinessRating } from '../../types';
import { ExternalLink } from 'lucide-react';

export const RatingEditor: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();

    const [score, setScore] = useState(business.branding?.rating?.score?.toString() || '');
    const [count, setCount] = useState(business.branding?.rating?.count?.toString() || '');
    const [googleMapsUrl, setGoogleMapsUrl] = useState(business.branding?.rating?.googleMapsUrl || '');
    const [visible, setVisible] = useState(business.branding?.rating?.visible ?? true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Validaciones
    const validateScore = (value: string): boolean => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 5;
    };

    const validateCount = (value: string): boolean => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && Number.isInteger(parseFloat(value));
    };

    const validateGoogleMapsUrl = (url: string): boolean => {
        if (!url) return true; // Opcional
        try {
            const parsed = new URL(url);
            // Aceptar todos los dominios de Google Maps y Google Share
            return parsed.hostname.includes('google.com') || 
                   parsed.hostname.includes('maps.google') ||
                   parsed.hostname.includes('goo.gl') ||
                   parsed.hostname === 'share.google';
        } catch {
            return false;
        }
    };

    const handleSave = async () => {
        // Validar inputs
        if (!validateScore(score)) {
            setMessage({ type: 'error', text: 'Puntuación debe ser entre 0 y 5 (ej: 4.3)' });
            return;
        }

        if (!validateCount(count)) {
            setMessage({ type: 'error', text: 'Cantidad de reseñas debe ser un número entero' });
            return;
        }

        if (!validateGoogleMapsUrl(googleMapsUrl)) {
            setMessage({ type: 'error', text: 'URL debe ser de Google Maps o Google Share' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const ratingData: BusinessRating = {
                score: parseFloat(score),
                count: parseInt(count),
                googleMapsUrl: googleMapsUrl.trim() || undefined,
                visible
            };

            await dispatch({ type: 'UPDATE_RATING', payload: ratingData });
            setMessage({ type: 'success', text: '✅ Calificación guardada correctamente' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error al guardar' });
        } finally {
            setIsSaving(false);
        }
    };

    // Preview de estrellas
    const renderStars = () => {
        const scoreNum = parseFloat(score) || 0;
        const fullStars = Math.floor(scoreNum);
        const hasHalfStar = scoreNum % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return (
            <div className="flex items-center gap-1">
                {[...Array(fullStars)].map((_, i) => (
                    <span key={`full-${i}`} className="text-yellow-400 text-2xl">⭐</span>
                ))}
                {hasHalfStar && <span className="text-yellow-400 text-2xl">⭐</span>}
                {[...Array(emptyStars)].map((_, i) => (
                    <span key={`empty-${i}`} className="text-gray-300 text-2xl">⭐</span>
                ))}
                <span className="ml-2 text-lg font-semibold text-primary">
                    {scoreNum.toFixed(1)}
                </span>
                {count && (
                    <span className="ml-1 text-sm text-secondary">
                        ({count} reseñas)
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">⭐ Calificación de tu Negocio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Muestra tu puntuación de Google Reviews en la página de reservas
                </p>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 ¿Dónde encontrar tu puntuación?</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Busca tu negocio en Google</li>
                    <li>Verás algo como: <strong>"⭐ 4.3 (47 reseñas)"</strong></li>
                    <li>Copia esos números aquí abajo</li>
                    <li>Opcional: Copia el link de Google Maps</li>
                </ol>
                <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(business.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                    <ExternalLink className="h-4 w-4" />
                    Buscar mi negocio en Google
                </a>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Puntuación */}
                    <div>
                        <label htmlFor="score" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Puntuación <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                id="score"
                                step="0.1"
                                min="0"
                                max="5"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                placeholder="4.3"
                                className="flex-1 px-3 py-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-secondary">de 5 estrellas</span>
                        </div>
                        {score && !validateScore(score) && (
                            <p className="text-xs text-red-500 mt-1">Debe ser entre 0 y 5</p>
                        )}
                    </div>

                    {/* Cantidad reseñas */}
                    <div>
                        <label htmlFor="count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cantidad de reseñas <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="count"
                            min="0"
                            step="1"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            placeholder="47"
                            className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary"
                        />
                        {count && !validateCount(count) && (
                            <p className="text-xs text-red-500 mt-1">Debe ser un número entero</p>
                        )}
                    </div>
                </div>

                {/* Google Maps URL */}
                <div>
                    <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Link de Google Maps <span className="text-gray-400">(opcional)</span>
                    </label>
                    <input
                        type="url"
                        id="googleMapsUrl"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="https://maps.google.com/maps/place/..."
                        className="w-full px-3 py-2 border border-default rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary"
                    />
                    {googleMapsUrl && !validateGoogleMapsUrl(googleMapsUrl) && (
                        <p className="text-xs text-red-500 mt-1">URL inválida (debe ser de Google Maps)</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Si agregas el link, los clientes podrán hacer click para verificar las reseñas
                    </p>
                </div>

                {/* Toggle visible */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="visible"
                        checked={visible}
                        onChange={(e) => setVisible(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mostrar en página de reservas
                    </label>
                </div>
            </div>

            {/* Preview */}
            {score && count && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview:</h4>
                    {renderStars()}
                </div>
            )}

            {/* Messages */}
            {message && (
                <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving || !score || !count || !validateScore(score) || !validateCount(count) || !validateGoogleMapsUrl(googleMapsUrl)}
                className="w-full px-4 py-2 bg-primary text-brand-text font-medium rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isSaving ? 'Guardando...' : 'Guardar Calificación'}
            </button>
        </div>
    );
};
