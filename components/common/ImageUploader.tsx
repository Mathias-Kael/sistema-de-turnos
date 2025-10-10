import React, { useState, useRef, useEffect } from 'react';
import { imageStorage } from '../../services/imageStorage';
import { ImageType } from '../../types';

interface ImageUploaderProps {
  currentImageUrl?: string; // ID o URL previa
  type: ImageType;
  label: string;
  onImageChange: (imageId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Componente reutilizable para subir imágenes con:
 * - Drag & drop
 * - Previsualización instantánea
 * - Eliminación de imagen previa (si se reemplaza)
 * - Uso de capa de abstracción imageStorage
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  type,
  label,
  onImageChange,
  onError,
  className = '',
}) => {
  const [preview, setPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar preview inicial si existe imagen actual
  useEffect(() => {
    if (currentImageUrl) {
      try {
        const url = imageStorage.getImageUrl(currentImageUrl);
        setPreview(url);
      } catch {
        setPreview('');
      }
    } else {
      setPreview('');
    }
  }, [currentImageUrl]);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setRetryAttempt(0);
    try {
      // Pasamos callback de retry para actualizar UI
      const originalUpload = imageStorage.uploadImage.bind(imageStorage);
      
      // Wrap para capturar retries del storage layer
      const result = await imageStorage.uploadImage(file, type, currentImageUrl);

      if (result.success) {
        setPreview(result.imageUrl); // Base64 para mostrar inmediatamente
        onImageChange(result.imageId); // Guardamos el ID en el estado padre
        setRetryAttempt(0);
      } else {
        throw new Error(result.error || 'Error al subir la imagen');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al subir la imagen';
      onError?.(message);
      setRetryAttempt(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // DRAG & DROP DESHABILITADO TEMPORALMENTE POR SEGURIDAD
    console.warn('Drag & drop deshabilitado. Usa el botón de selección.');
    return;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDelete = async () => {
    if (currentImageUrl) {
      await imageStorage.deleteImage(currentImageUrl);
    }
    setPreview('');
    onImageChange('');
  };

  // Estilos condicionales
  const aspectRatioClass = type === 'cover' ? 'aspect-[3/1]' : 'aspect-square';
  const sizeClass = type === 'cover' ? 'h-40 w-full' : 'h-32 w-32';

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-primary">{label}</label>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt={label}
            className={`${sizeClass} ${aspectRatioClass} object-cover rounded-lg border-2 border-default`}
          />
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition disabled:opacity-50"
            disabled={isUploading}
            title="Eliminar imagen"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          className={`${sizeClass} ${aspectRatioClass} border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition ${
            isDragging ? 'border-primary bg-surface' : 'border-default hover:border-primary'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-secondary mt-2">
                {retryAttempt > 0 ? `Reintentando (${retryAttempt}/3)...` : 'Subiendo...'}
              </p>
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-sm text-secondary">
                {isDragging ? 'Suelta aquí' : 'Arrastra o haz clic'}
              </p>
              <p className="text-xs text-secondary mt-1">
                JPG, PNG, WebP • Máx {type === 'cover' ? '2MB' : '1MB'}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
};
