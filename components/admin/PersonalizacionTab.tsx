import React, { useState } from 'react';
import { useBusinessState, useBusinessDispatch } from '../../context/BusinessContext';
import { ImageUploader } from '../common/ImageUploader';

export const PersonalizacionTab: React.FC = () => {
  const business = useBusinessState();
  const dispatch = useBusinessDispatch();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleCoverChange = async (imageId: string) => {
    try {
      setError('');
      setSuccess('');
      await dispatch({ type: 'SET_COVER_IMAGE', payload: imageId });
      if (imageId) {
        setSuccess('Portada actualizada correctamente');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar la portada');
    }
  };

  const handleProfileChange = async (imageId: string) => {
    try {
      setError('');
      setSuccess('');
      await dispatch({ type: 'SET_PROFILE_IMAGE', payload: imageId });
      if (imageId) {
        setSuccess('Imagen de perfil actualizada correctamente');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar la imagen de perfil');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">Personalización Visual</h2>
        <p className="text-secondary text-sm">
          Personaliza cómo se ve tu negocio para tus clientes. Las imágenes se optimizan automáticamente.
        </p>
      </div>

      <div className="space-y-6">
        <ImageUploader
          currentImageUrl={business.coverImageUrl}
          type="cover"
          label="Imagen de Portada"
          onImageChange={handleCoverChange}
          onError={setError}
        />

        <ImageUploader
          currentImageUrl={business.profileImageUrl}
          type="profile"
          label="Imagen de Perfil"
          onImageChange={handleProfileChange}
          onError={setError}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="text-xs text-secondary space-y-1">
        <p>• Portada: Máximo 2MB, se redimensiona a 1200×400px</p>
        <p>• Perfil: Máximo 1MB, se redimensiona a 400×400px</p>
        <p>• Formatos soportados: JPG, PNG, WebP</p>
      </div>
    </div>
  );
};
