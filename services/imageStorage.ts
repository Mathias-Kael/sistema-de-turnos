import { ImageStorageService, ImageType, ImageUploadResult } from '../types';
import { ImageProcessor } from '../utils/imageProcessing';
import { IMAGE_CONSTRAINTS } from '../constants';

/**
 * Servicio de almacenamiento de imágenes (localStorage) preparado para migrar a backend.
 * - Genera IDs únicos img_{tipo}_{timestamp}_{rand}
 * - Procesa (resize/compress) antes de guardar
 * - Sólo elimina la imagen anterior tras éxito del guardado nuevo
 */
class LocalStorageImageService implements ImageStorageService {
  private readonly STORAGE_KEY_PREFIX = 'img_';
  private readonly STORAGE_LIMIT_WARNING = 1 * 1024 * 1024; // 1MB restante -> warning

  async uploadImage(file: File, type: ImageType, oldImageId?: string): Promise<ImageUploadResult> {
    try {
      const constraints = IMAGE_CONSTRAINTS[type];
      const processed = await ImageProcessor.processImage(file, constraints);
      if (processed.finalSize > constraints.maxSizeBytes) {
        throw new Error(
          `La imagen optimizada (${Math.round(processed.finalSize / 1024)}KB) excede el límite de ${Math.round(constraints.maxSizeBytes / 1024)}KB.`
        );
      }
      const imageId = this.generateImageId(type);
      try {
        localStorage.setItem(imageId, processed.dataUrl);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          throw new Error('No hay espacio suficiente en el navegador. Elimina imágenes viejas o usa una más pequeña.');
        }
        throw e;
      }
      if (oldImageId) {
        await this.deleteImage(oldImageId);
      }
      this.checkStorageSpace();
      return {
        success: true,
        imageId,
        imageUrl: processed.dataUrl,
        finalSize: processed.finalSize,
        dimensions: { width: processed.width, height: processed.height },
        wasCompressed: processed.wasCompressed,
      };
    } catch (error) {
      return {
        success: false,
        imageId: '',
        imageUrl: '',
        error: error instanceof Error ? error.message : 'Error desconocido al procesar imagen'
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
    return identifier; // URL externa/legacy
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
    const LIMIT = 5 * 1024 * 1024; // ~5MB heurístico
    const remaining = LIMIT - total;
    if (remaining < this.STORAGE_LIMIT_WARNING) {
      console.warn(`⚠️ Espacio bajo en localStorage: ~${Math.round(remaining/1024)}KB restantes`);
    }
  }
}

export const imageStorage: ImageStorageService = new LocalStorageImageService();
export { IMAGE_CONSTRAINTS } from '../constants';
export type { ImageStorageService, ImageType, ImageUploadResult } from '../types';
