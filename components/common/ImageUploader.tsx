import React, { useState, useRef, useEffect } from 'react';
import { imageStorage } from '../../services/imageStorage';
import { ImageType } from '../../types';
import ImageCropModal from './ImageCropModal';
import { Button } from '../ui/Button';

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
 * - Recorte y ajuste (cropping)
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
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
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

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setRetryAttempt(0);
    try {
      const result = await imageStorage.uploadImage(file, type, currentImageUrl);

      if (result.success) {
        setPreview(result.imageUrl);
        onImageChange(result.imageId);
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
    console.warn('Drag & drop deshabilitado. Usa el botón de selección.');
    return;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onCropComplete = (croppedImage: File) => {
    setCroppingImage(null);
    handleImageUpload(croppedImage);
  };

  const handleDelete = async () => {
    if (currentImageUrl) {
      await imageStorage.deleteImage(currentImageUrl);
    }
    setPreview('');
    onImageChange('');
  };

  const handleEdit = () => {
    if (preview) {
      setCroppingImage(preview);
    }
  };

  // Estilos condicionales
  const aspectRatio = type === 'cover' ? 16 / 9 : 1;
  const aspectRatioClass = type === 'cover' ? 'aspect-[16/9]' : 'aspect-square';
  const sizeClass = type === 'cover' ? 'h-40 w-full' : 'h-32 w-32';

  const isAvatar = type !== 'cover';

  const ActionButtons = () => (
    <div
      className={`flex gap-4 ${
        isAvatar
          ? 'md:flex-col md:justify-center' // Desktop: vertical
          : 'justify-center' // Cover: horizontal
      }`}
    >
      <Button
        onClick={handleEdit}
        disabled={isUploading}
        variant="outline"
        className="flex items-center gap-2"
      >
        ✏️<span>Editar</span>
      </Button>
      <Button
        onClick={handleDelete}
        disabled={isUploading}
        variant="danger"
        className="flex items-center gap-2"
      >
        🗑️<span>Eliminar</span>
      </Button>
    </div>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {croppingImage && (
        <ImageCropModal
          image={croppingImage}
          aspect={aspectRatio}
          onCropComplete={onCropComplete}
          onCancel={() => setCroppingImage(null)}
        />
      )}

      <label className="block text-sm font-medium text-primary">{label}</label>

      {preview ? (
        <div
          className={`flex flex-col gap-4 ${
            isAvatar ? 'md:flex-row' : ''
          }`}
        >
          <img
            src={preview}
            alt={label}
            className={`${sizeClass} ${aspectRatioClass} object-cover rounded-lg border-2 border-default`}
          />
          <ActionButtons />
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
