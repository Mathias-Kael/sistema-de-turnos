import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';

type ExpirationOption = 'permanent' | '7d' | '30d' | '1y';
type LinkStatus = 'active' | 'paused' | 'revoked';
type DerivedStatus = LinkStatus | 'expired';

interface ShareLink {
    token: string;
    status: LinkStatus;
    createdAt: number;
    expiresAt: number | null;
}

const ExpirationLabel: Record<ExpirationOption, string> = {
    permanent: 'Permanente (sin caducidad)',
    '7d': '7 días',
    '30d': '30 días',
    '1y': '1 año',
};

const StatusInfo: Record<DerivedStatus, { text: string; color: string }> = {
    active: { text: 'Activo', color: 'bg-green-100 text-green-800' },
    paused: { text: 'Pausado', color: 'bg-yellow-100 text-yellow-800' },
    revoked: { text: 'Revocado', color: 'bg-red-100 text-red-800' },
    expired: { text: 'Expirado', color: 'bg-gray-100 text-gray-800' },
};

export const SharePanel: React.FC = () => {
    const [link, setLink] = useState<ShareLink | null>(() => {
        const storedLinkData = localStorage.getItem('shareToken');
        if (storedLinkData) {
            try {
                if (storedLinkData === 'null') return null;
                return JSON.parse(storedLinkData);
            } catch (e) {
                console.error("Error parsing shareToken from localStorage", e);
                return null;
            }
        }
        return null;
    });

    const [expirationOption, setExpirationOption] = useState<ExpirationOption>('permanent');
    
    useEffect(() => {
        if (link) {
            localStorage.setItem('shareToken', JSON.stringify(link));
        } else {
            localStorage.removeItem('shareToken');
        }
    }, [link]);

    const derivedStatus: DerivedStatus | null = useMemo(() => {
        if (!link) return null;
        if (link.status === 'revoked') return 'revoked';
        const isExpired = link.expiresAt !== null && new Date().getTime() > link.expiresAt;
        if (isExpired) return 'expired';
        return link.status;
    }, [link]);

    const shareableLink = link && link.token ? `${window.location.origin}/?token=${link.token}` : null;

    const handleGenerateLink = () => {
        setLink(prevLink => {
            const derivedPrevStatus = !prevLink ? null :
                (prevLink.expiresAt && Date.now() > prevLink.expiresAt ? 'expired' : prevLink.status);

            const generate = () => {
                const newToken = Math.random().toString(36).substring(2, 15);
                let expiresAt: number | null = null;
                const now = Date.now();
                switch (expirationOption) {
                    case '7d': expiresAt = now + 7 * 24 * 60 * 60 * 1000; break;
                    case '30d': expiresAt = now + 30 * 24 * 60 * 60 * 1000; break;
                    case '1y': expiresAt = now + 365 * 24 * 60 * 60 * 1000; break;
                }
                return { token: newToken, status: 'active' as LinkStatus, createdAt: now, expiresAt };
            };

            if (prevLink && derivedPrevStatus !== 'revoked' && derivedPrevStatus !== 'expired') {
                if (window.confirm('¿Seguro que quieres regenerar el enlace? El enlace anterior será invalidado permanentemente.')) {
                    return generate();
                }
                return prevLink; // User cancelled
            }
            return generate(); // No previous link or it was revoked/expired, just generate.
        });
    };
    
    const handleTogglePause = () => {
        setLink(prevLink => {
            if (!prevLink) return prevLink;

            const isCurrentlyActive = prevLink.status === 'active';
            const confirmMessage = isCurrentlyActive
                ? '¿Seguro que quieres pausar el enlace?'
                : '¿Seguro que quieres reactivar el enlace?';

            if (window.confirm(confirmMessage)) {
                const newStatus = isCurrentlyActive ? 'paused' : 'active';
                return { ...prevLink, status: newStatus };
            }
            
            return prevLink; // User cancelled
        });
    };
    
    const handleRevoke = () => {
        setLink(prevLink => {
            if (!prevLink) return prevLink;
            if (window.confirm('¿Seguro que quieres revocar este enlace? Esta acción es irreversible y los clientes no podrán usarlo más.')) {
                return { ...prevLink, status: 'revoked' };
            }
            return prevLink; // User cancelled
        });
    };

    const handleCopyLink = () => {
        if (shareableLink) {
            navigator.clipboard.writeText(shareableLink).then(() => alert('¡Enlace copiado!'));
        }
    };

    const handleDownloadQR = () => {
        if (shareableLink) {
            QRCode.toDataURL(shareableLink, { width: 300, margin: 2 })
                .then(url => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'codigo-qr-reserva.png';
                    a.click();
                });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-primary">Compartir con clientes</h3>
                <p className="mt-1 text-sm text-secondary">
                    Gestiona el enlace único para que tus clientes puedan ver tu disponibilidad y reservar turnos.
                </p>
            </div>

            {link && derivedStatus && (
                <div className="p-4 border border-default rounded-md bg-surface space-y-4">
                    <h4 className="font-semibold text-primary">Estado del Enlace</h4>
                    <div className="flex items-center justify-between">
                         <span className={`px-3 py-1 text-sm font-semibold rounded-full ${StatusInfo[derivedStatus].color}`}>
                            {StatusInfo[derivedStatus].text}
                        </span>
                        <div className="text-right text-xs text-secondary">
                            <p>Creado: {new Date(link.createdAt).toLocaleDateString()}</p>
                            <p>Expira: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Nunca'}</p>
                        </div>
                    </div>
                    {shareableLink && (derivedStatus === 'active' || derivedStatus === 'paused') && (
                         <div>
                            <input type="text" readOnly value={shareableLink} className="w-full p-2 border border-default rounded bg-background text-primary" />
                            <div className="flex gap-2 mt-2">
                                <button type="button" onClick={handleCopyLink} className="flex-1 px-4 py-2 border border-default rounded-md hover:bg-surface-hover text-primary">Copiar Link</button>
                                <button type="button" onClick={handleDownloadQR} className="flex-1 px-4 py-2 border border-default rounded-md hover:bg-surface-hover text-primary">Descargar QR</button>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-default mt-2">
                        {(derivedStatus === 'active' || derivedStatus === 'paused') && (
                             <button type="button" onClick={handleTogglePause} className="text-sm font-medium text-primary hover:text-primary-dark">
                                {derivedStatus === 'active' ? 'Pausar Enlace' : 'Reactivar Enlace'}
                            </button>
                        )}
                        {derivedStatus !== 'revoked' && derivedStatus !== 'expired' && (
                             <button type="button" onClick={handleRevoke} className="text-sm font-medium text-red-600 hover:text-red-800">
                                Revocar Ahora
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="p-4 border border-default rounded-md bg-surface space-y-3">
                <h4 className="font-semibold text-primary">{link && derivedStatus !== 'revoked' && derivedStatus !== 'expired' ? 'Regenerar Enlace' : 'Generar Nuevo Enlace'}</h4>
                 <p className="text-xs text-secondary">
                    {link && derivedStatus !== 'revoked' && derivedStatus !== 'expired' ? 'Esto creará un nuevo enlace e invalidará el actual.' : 'Define la duración del enlace que compartirás.'}
                </p>
                <div>
                    <label htmlFor="expiration" className="block text-sm font-medium text-secondary">Duración</label>
                    <select
                        id="expiration"
                        value={expirationOption}
                        onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                        className="mt-1 block w-full px-3 py-2 border border-default bg-surface rounded-md text-primary"
                    >
                        {Object.entries(ExpirationLabel).map(([key, label]) => (
                             <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                 <button type="button" onClick={handleGenerateLink} className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark">
                    {link && derivedStatus !== 'revoked' && derivedStatus !== 'expired' ? 'Regenerar Enlace' : 'Generar Enlace'}
                </button>
            </div>
        </div>
    );
};