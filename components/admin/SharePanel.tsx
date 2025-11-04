import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';

type ExpirationOption = 'permanent' | '7d' | '30d' | '1y';
type LinkStatus = 'active' | 'paused' | 'revoked';
type DerivedStatus = LinkStatus | 'expired';

const ExpirationLabel: Record<ExpirationOption, string> = {
    permanent: 'Permanente (sin caducidad)',
    '7d': '7 días',
    '30d': '30 días',
    '1y': '1 año',
};

const StatusInfo: Record<DerivedStatus, { text: string; className: string }> = {
    active: { text: 'Activo', className: 'bg-[color:var(--color-state-success-bg)] text-[color:var(--color-state-success-text)]' },
    paused: { text: 'Pausado', className: 'bg-[color:var(--color-state-warning-bg)] text-[color:var(--color-state-warning-text)]' },
    revoked: { text: 'Revocado', className: 'bg-[color:var(--color-state-danger-bg)] text-[color:var(--color-state-danger-text)]' },
    expired: { text: 'Expirado', className: 'bg-[color:var(--color-state-neutral-bg)] text-[color:var(--color-state-neutral-text)]' },
};

export const SharePanel: React.FC = () => {
    const business = useBusinessState();
    const dispatch = useBusinessDispatch();
    
    const [expirationOption, setExpirationOption] = useState<ExpirationOption>('permanent');
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Estado local para inputs de redes sociales
    const [localWhatsapp, setLocalWhatsapp] = useState(business.whatsapp || '');
    const [localInstagram, setLocalInstagram] = useState(business.instagram || '');
    const [localFacebook, setLocalFacebook] = useState(business.facebook || '');
    const [hasUnsavedSocialChanges, setHasUnsavedSocialChanges] = useState(false);
    const [isSavingSocial, setIsSavingSocial] = useState(false);

    // Sincronizar estado local
    useEffect(() => {
        setLocalWhatsapp(business.whatsapp || '');
        setLocalInstagram(business.instagram || '');
        setLocalFacebook(business.facebook || '');
        setHasUnsavedSocialChanges(false);
    }, [business.whatsapp, business.instagram, business.facebook]);

    // Derivar estado del token desde el business
    const hasToken = !!business.shareToken;
    const tokenStatus = business.shareTokenStatus;
    const tokenExpiry = business.shareTokenExpiresAt;

    const derivedStatus: DerivedStatus | null = useMemo(() => {
        if (!hasToken) return null;
        if (tokenStatus === 'revoked') return 'revoked';
        const isExpired = tokenExpiry !== null && tokenExpiry !== undefined && new Date(tokenExpiry).getTime() < Date.now();
        if (isExpired) return 'expired';
        return tokenStatus as LinkStatus;
    }, [hasToken, tokenStatus, tokenExpiry]);

    const shareableLink = hasToken ? `${window.location.origin}/?token=${business.shareToken}` : null;

    // Generar QR cuando hay link
    useEffect(() => {
        if (shareableLink && derivedStatus === 'active') {
            QRCode.toDataURL(shareableLink, { width: 300 })
                .then(setQrCodeUrl)
                .catch(err => console.error('Error generando QR:', err));
        } else {
            setQrCodeUrl('');
        }
    }, [shareableLink, derivedStatus]);

    const handleGenerateLink = async () => {
        try {
            setError('');
            
            // Si ya existe un token activo/pausado, confirmar regeneración
            if (hasToken && derivedStatus !== 'revoked' && derivedStatus !== 'expired') {
                if (!window.confirm('¿Seguro que quieres regenerar el enlace? El enlace anterior será invalidado permanentemente.')) {
                    return;
                }
            }

            // Generar nuevo token
            const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Calcular expiración
            let expiresAt: string | null = null;
            const now = new Date();
            switch (expirationOption) {
                case '7d': 
                    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case '30d': 
                    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case '1y': 
                    expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
                    break;
            }

            // Actualizar en Supabase
            await dispatch({
                type: 'UPDATE_SHARE_TOKEN',
                payload: {
                    shareToken: newToken,
                    shareTokenStatus: 'active',
                    shareTokenExpiresAt: expiresAt,
                }
            });

            setSuccess('Enlace generado exitosamente');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Error al generar enlace');
        }
    };

    const handleTogglePause = async () => {
        try {
            setError('');
            const newStatus = tokenStatus === 'active' ? 'paused' : 'active';
            
            await dispatch({
                type: 'UPDATE_SHARE_TOKEN',
                payload: {
                    shareToken: business.shareToken!,
                    shareTokenStatus: newStatus,
                    shareTokenExpiresAt: business.shareTokenExpiresAt,
                }
            });

            setSuccess(`Enlace ${newStatus === 'active' ? 'reactivado' : 'pausado'}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Error al pausar/reactivar enlace');
        }
    };

    const handleRevoke = async () => {
        if (!window.confirm('¿Revocar permanentemente este enlace? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            setError('');
            
            await dispatch({
                type: 'UPDATE_SHARE_TOKEN',
                payload: {
                    shareToken: business.shareToken!,
                    shareTokenStatus: 'revoked',
                    shareTokenExpiresAt: business.shareTokenExpiresAt,
                }
            });

            setSuccess('Enlace revocado permanentemente');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Error al revocar enlace');
        }
    };

    const handleCopyLink = () => {
        if (shareableLink) {
            navigator.clipboard.writeText(shareableLink);
            setSuccess('Enlace copiado al portapapeles');
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleDownloadQR = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = 'qr-reservas.png';
            link.click();
            setSuccess('Código QR descargado');
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleSocialMediaChange = (field: 'whatsapp' | 'instagram' | 'facebook', value: string) => {
        switch (field) {
            case 'whatsapp': setLocalWhatsapp(value); break;
            case 'instagram': setLocalInstagram(value); break;
            case 'facebook': setLocalFacebook(value); break;
        }
        setHasUnsavedSocialChanges(true);
    };

    const handleSaveSocialMedia = async () => {
        setIsSavingSocial(true);
        setError('');
        setSuccess('');
        try {
            const updatedBusiness = {
                ...business,
                whatsapp: localWhatsapp || undefined,
                instagram: localInstagram || undefined,
                facebook: localFacebook || undefined,
            };
            await dispatch({ type: 'UPDATE_BUSINESS', payload: updatedBusiness });
            setSuccess('Redes sociales guardadas');
            setHasUnsavedSocialChanges(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Error al guardar redes sociales');
        } finally {
            setIsSavingSocial(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-primary mb-2">Compartir y Redes Sociales</h3>
                <p className="text-secondary text-sm">
                    Genera enlaces de reserva y configura tus redes para que los clientes te encuentren.
                </p>
            </div>

            {/* Enlace Compartible */}
            <div className="border border-default p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-primary mb-3">Enlace de Reservas</h4>
                {/* Configuración de expiración */}
            {(!hasToken || derivedStatus === 'revoked' || derivedStatus === 'expired') && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-primary">
                        Duración del enlace
                    </label>
                    <select
                        value={expirationOption}
                        onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                        className="w-full p-2 border border-default rounded-lg bg-surface text-primary"
                    >
                        {Object.entries(ExpirationLabel).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleGenerateLink}
                        className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:opacity-90 transition"
                    >
                        {hasToken ? 'Regenerar Enlace' : 'Generar Enlace'}
                    </button>
                </div>
            )}

            {/* Estado y enlace activo */}
            {hasToken && derivedStatus && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary">Estado:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${StatusInfo[derivedStatus].className}`}>
                            {StatusInfo[derivedStatus].text}
                        </span>
                    </div>

                    {tokenExpiry && (
                        <p className="text-sm text-secondary">
                            Expira: {new Date(tokenExpiry).toLocaleDateString('es-AR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                            })}
                        </p>
                    )}

                    {shareableLink && derivedStatus === 'active' && (
                        <>
                            <div className="p-4 bg-surface border border-default rounded-lg">
                                <p className="text-sm font-medium text-primary mb-2">Tu enlace compartible:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareableLink}
                                        readOnly
                                        className="flex-1 p-2 border border-default rounded bg-background text-primary text-sm"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>

                            {qrCodeUrl && (
                                <div className="flex flex-col items-center gap-3">
                                    <img src={qrCodeUrl} alt="Código QR" className="w-64 h-64 border border-default rounded-lg" />
                                    <button
                                        onClick={handleDownloadQR}
                                        className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition"
                                    >
                                        Descargar QR
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Controles */}
                    {derivedStatus !== 'revoked' && derivedStatus !== 'expired' && (
                        <div className="flex gap-3">
                            <button
                                onClick={handleTogglePause}
                                className="flex-1 px-4 py-2 border border-default rounded-lg hover:bg-surface transition"
                            >
                                {tokenStatus === 'active' ? 'Pausar Enlace' : 'Reactivar Enlace'}
                            </button>
                            <button
                                onClick={handleRevoke}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            >
                                Revocar Enlace
                            </button>
                        </div>
                    )}

                    {(derivedStatus === 'revoked' || derivedStatus === 'expired') && (
                        <button
                            onClick={handleGenerateLink}
                            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:opacity-90 transition"
                        >
                            Generar Nuevo Enlace
                        </button>
                    )}
                </div>
            )}
            </div>

            {/* Redes Sociales */}
            <div className="border border-default p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-primary mb-3">Redes Sociales</h4>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="businessWhatsapp" className="block text-sm font-medium text-secondary">WhatsApp del Negocio</label>
                        <input type="text" id="businessWhatsapp" value={localWhatsapp} onChange={(e) => handleSocialMediaChange('whatsapp', e.target.value)} placeholder="+54911234567890" className="mt-1 block w-full px-3 py-2 border border-default rounded-md bg-surface text-primary"/>
                    </div>
                    <div>
                        <label htmlFor="instagram" className="block text-sm font-medium text-secondary">Instagram</label>
                        <div className="mt-1 flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-default bg-surface text-secondary text-sm">@</span>
                            <input type="text" id="instagram" value={localInstagram} onChange={(e) => handleSocialMediaChange('instagram', e.target.value)} placeholder="mi_negocio" className="flex-1 px-3 py-2 border border-default rounded-r-md bg-surface text-primary"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="facebook" className="block text-sm font-medium text-secondary">Facebook</label>
                        <input type="text" id="facebook" value={localFacebook} onChange={(e) => handleSocialMediaChange('facebook', e.target.value)} placeholder="mi.negocio" className="mt-1 block w-full px-3 py-2 border border-default rounded-md bg-surface text-primary"/>
                    </div>
                </div>
                <div className="mt-6">
                    <button onClick={handleSaveSocialMedia} disabled={!hasUnsavedSocialChanges || isSavingSocial} className={`px-6 py-2.5 rounded-md font-medium transition-colors ${hasUnsavedSocialChanges && !isSavingSocial ? 'bg-primary text-brand-text' : 'bg-surface text-secondary cursor-not-allowed'}`}>
                        {isSavingSocial ? 'Guardando...' : 'Guardar Redes Sociales'}
                    </button>
                </div>
            </div>

            {/* Mensajes de éxito/error */}
            {(success || error) && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
                    {success && (
                        <div className="px-4 py-2 rounded-md bg-green-100 text-green-800 text-sm shadow border border-green-300">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="px-4 py-2 rounded-md bg-red-100 text-red-700 text-sm shadow border border-red-300">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
