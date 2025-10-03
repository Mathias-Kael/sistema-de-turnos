import { ImageStorageService, ImageType, ImageUploadResult } from '../types';
import { ImageProcessor } from '../utils/imageProcessing';
import { IMAGE_CONSTRAINTS } from '../constants';

/**
 * Servicio de almacenamiento de imágenes basado en localStorage.
 * Mantiene una interfaz que permitirá migrar a un backend real sin cambios en consumidores.
 */
class LocalStorageImageService implements ImageStorageService {
  private readonly STORAGE_KEY_PREFIX = 'img_';
  private readonly STORAGE_LIMIT_WARNING = 1 * 1024 * 1024; // 1MB restante => warning

  async uploadImage(file: File, type: ImageType): Promise<ImageUploadResult> {
    try {
      // 1. Constraints según tipo
      const constraints = IMAGE_CONSTRAINTS[type];
      // 2. Procesar imagen (resize + compress)
      const processedImage = await ImageProcessor.processImage(file, constraints);
      // 3. Validación extra
      if (processedImage.finalSize > constraints.maxSizeBytes) {
        throw new Error(
          `La imagen optimizada (${Math.round(processedImage.finalSize / 1024)}KB) aún excede el límite de ${Math.round(constraints.maxSizeBytes / 1024)}KB. Intenta con una imagen más pequeña.`
        );
      }
      // 4. Generar ID
      const imageId = this.generateImageId(type);
      // 5. Guardar
      try {
        localStorage.setItem(imageId, processedImage.dataUrl);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          throw new Error('No hay espacio suficiente en el navegador. Libera espacio o usa una imagen más pequeña.');
        }
        throw e;
      }
      // 6. Check espacio restante
      this.checkStorageSpace();
      // 7. Retornar resultado
      return {
        success: true,
        imageUrl: imageId,
        originalSize: processedImage.originalSize,
        finalSize: processedImage.finalSize,
        wasCompressed: processedImage.wasCompressed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al procesar imagen',
      };
    }
  }

  async deleteImage(identifier: string): Promise<void> {
    if (identifier.startsWith(this.STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(identifier);
    }
  }

  getImageUrl(identifier: string): string {
    if (identifier.startsWith(this.STORAGE_KEY_PREFIX)) {
      return localStorage.getItem(identifier) || '';
    }
    return identifier; // URL absoluta ya existente
  }

  private generateImageId(type: ImageType): string {
    return `${this.STORAGE_KEY_PREFIX}${type}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
  }

  private checkStorageSpace(): void {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      total += value?.length || 0;
    }
    const LIMIT = 5 * 1024 * 1024; // ~5MB
    const remaining = LIMIT - total;
    if (remaining < this.STORAGE_LIMIT_WARNING) {
      console.warn(`⚠️ Espacio bajo en localStorage: ~${Math.round(remaining/1024)}KB restantes`);
    }
  }
}

export const imageStorage: ImageStorageService = new LocalStorageImageService();
export { IMAGE_CONSTRAINTS } from '../constants';