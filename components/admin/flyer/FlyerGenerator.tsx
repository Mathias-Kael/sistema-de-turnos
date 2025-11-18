// components/admin/flyer/FlyerGenerator.tsx

import React, { useState } from 'react';
import { useBusinessState } from '../../../context/BusinessContext';
import { FlyerGenerator as Generator } from '../../../utils/flyerGenerator';
import { FlyerData } from '../../../utils/flyerTypes';
import { Button } from '../../ui/Button';
import { imageStorage } from '../../../services/imageStorage';

export const FlyerGenerator: React.FC = () => {
  const business = useBusinessState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const handleGenerateFlyer = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // 1. Generar QR code
      const shareLink = `${window.location.origin}/?token=${business.shareToken}`;
      const qrDataURL = await Generator.generateQRCode(shareLink);

      // 2. Obtener logo URL si existe
      let logoUrl: string | undefined;
      if (business.profileImageUrl) {
        try {
          logoUrl = imageStorage.getImageUrl(business.profileImageUrl);
        } catch (error) {
          console.warn('Error getting logo URL:', error);
          logoUrl = undefined;
        }
      }

      // 3. Preparar datos del flyer
      const flyerData: FlyerData = {
        businessName: business.name,
        logo: logoUrl,
        backgroundColor: business.branding.primaryColor,
        textColor: business.branding.textColor,
        qrCodeDataURL: qrDataURL,
        linkPlaceholder: '________________'
      };

      // 4. Generar flyer
      const result = await Generator.generateFlyer(flyerData);

      if (result.success && result.dataURL) {
        setFlyerPreview(result.dataURL);
        setShowModal(true);
      } else {
        setError(result.error || 'Error al generar flyer');
      }
    } catch (err) {
      console.error('Error generating flyer:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al generar flyer');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!flyerPreview) return;

    try {
      const fileName = Generator.createFileName(business.name);
      Generator.downloadFlyer(flyerPreview, fileName);
    } catch (error) {
      setError('Error al descargar el flyer');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFlyerPreview(null);
  };

  return (
    <div className="mt-6 border border-default p-6 rounded-lg">
      <h4 className="text-lg font-semibold text-primary mb-3">
        🎨 Flyers Promocionales
      </h4>
      <p className="text-sm text-secondary mb-4">
        Genera flyers profesionales para compartir en Instagram y WhatsApp. 
        Incluye tu branding, QR code y mensaje promocional.
      </p>

      <Button
        onClick={handleGenerateFlyer}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Generando...
          </span>
        ) : (
          '🎨 Generar Flyer'
        )}
      </Button>

      {error && (
        <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Modal de preview */}
      {showModal && flyerPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary mb-4">
              Preview del Flyer
            </h3>
            
            <div className="mb-4">
              <img
                src={flyerPreview}
                alt="Flyer preview"
                className="w-full rounded-lg border border-default"
                style={{ maxWidth: '400px', margin: '0 auto' }}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Tip:</strong> En el espacio de link, pegá tu enlace público cuando subas el flyer a WhatsApp/Instagram para que sea clickeable.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                className="flex-1 bg-primary text-white"
              >
                📥 Descargar PNG
              </Button>
              <Button
                onClick={closeModal}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};