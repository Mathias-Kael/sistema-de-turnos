import { ImageStorageService, ImageType, ImageUploadResult } from '../types';
import { ImageProcessor } from '../utils/imageProcessing';
import { IMAGE_CONSTRAINTS } from '../constants';

/**
 * Implementación de ImageStorageService usando localStorage.
 * 
 * Estrategia de storage:
 * - Guarda Base64 directamente en localStorage
 * - Key format: "img_{type}_{timestamp}_{random}"
 * - Retorna el key como "imageId" en ImageUploadResult
 * 
 * Preparado para migración:
 * - En futuro, cambiar implementación a ApiImageStorage
 * - Los consumidores no necesitan cambios
 */
class LocalStorageImageService implements ImageStorageService {
  private readonly STORAGE_KEY_PREFIX = 'img_';
  private readonly STORAGE_LIMIT_WARNING = 1 * 1024 * 1024; // 1MB warning threshold

  /**
   * Sube una imagen a localStorage.
   * 
   * Flujo:
   * 1. Validar y obtener constraints según type
   * 2. Procesar imagen con ImageProcessor
   * 3. Generar ID único
   * 4. Intentar guardar en localStorage
   * 5. Manejar QuotaExceededError
   * 6. Check de espacio disponible
   * 7. Retornar resultado con imageId
   * 
   * @param file - Archivo de imagen a subir
   * @param type - Tipo de imagen (cover/profile/avatar)
   * @returns Promise con ImageUploadResult
   * @throws Error si falla validación o storage
   */
  async uploadImage(file: File, type: ImageType, oldImageId?: string): Promise<ImageUploadResult> {
    try {
      // 0. Eliminar imagen anterior si se proporciona
      if (oldImageId) {
        await this.deleteImage(oldImageId);
        console.log(`🗑️ Imagen anterior eliminada: ${oldImageId}`);
      }
      // 1. Obtener constraints según el tipo
      const constraints = IMAGE_CONSTRAINTS[type];
      
      // 2. Procesar imagen con optimización
      const processedImage = await ImageProcessor.processImage(file, constraints);
      
      // 3. Verificar que el tamaño final no exceda el límite (validación extra)
      if (processedImage.finalSize > constraints.maxSizeBytes) {
        throw new Error(
          `La imagen optimizada (${Math.round(processedImage.finalSize / 1024)}KB) ` +
          `aún excede el límite de ${Math.round(constraints.maxSizeBytes / 1024)}KB. ` +
          `Intenta con una imagen más pequeña.`
        );
      }
      
      // 4. Generar ID único
      const imageId = this.generateImageId(type);
      
      // 5. Intentar guardar en localStorage
      try {
        localStorage.setItem(imageId, processedImage.dataUrl);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          throw new Error(
            'No hay espacio suficiente en el navegador. ' +
            'Intenta eliminar imágenes antiguas o usar una imagen más pequeña.'
          );
        }
        throw e;
      }
      
      // 6. Verificar espacio disponible y hacer warning si es necesario
      this.checkStorageSpace();
      
      // 7. Retornar resultado exitoso
      return {
        success: true,
        imageId,
        imageUrl: processedImage.dataUrl,
        finalSize: processedImage.finalSize,
        dimensions: { width: processedImage.width, height: processedImage.height },
        wasCompressed: processedImage.wasCompressed,
      };
      
    } catch (error) {
      return {
        success: false,
        imageId: '',
        imageUrl: '',
        error: error instanceof Error ? error.message : 'Error desconocido al procesar imagen',
      };
    }
  }

  /**
   * Elimina una imagen de localStorage.
   * 
   * @param identifier - ID de la imagen a eliminar
   * @returns Promise<void>
   */
  async deleteImage(identifier: string): Promise<void> {
    // Solo eliminar si es ID local
    if (identifier.startsWith(this.STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(identifier);
    }
    // Si es URL externa, no hacer nada (backward compatibility)
  }

  /**
   * Obtiene la URL de una imagen.
   * 
   * Para imágenes locales: retorna el Base64 completo desde localStorage
   * Para URLs externas: retorna la URL tal cual (backward compatibility)
   * 
   * @param identifier - ID o URL de la imagen
   * @returns URL o Base64 string
   */
  getImageUrl(identifier: string): string {
    // Si es un ID local (empieza con "img_")
    if (identifier.startsWith(this.STORAGE_KEY_PREFIX)) {
      const base64 = localStorage.getItem(identifier);
      return base64 || '';
    }
    
    // Si no, asumir que es una URL externa (backward compatibility)
    return identifier;
  }

  /**
   * Genera un ID único para una imagen.
   * 
   * Format: img_{type}_{timestamp}_{random}
   * Ejemplo: img_cover_1234567890_abc123
   * 
   * @param type - Tipo de imagen
   * @returns ID único
   */
  private generateImageId(type: ImageType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${this.STORAGE_KEY_PREFIX}${type}_${timestamp}_${random}`;
  }

  /**
   * Verifica espacio disponible en localStorage.
   * 
   * Lógica:
   * - Calcular tamaño total usado
   * - Estimar límite (~5MB en la mayoría de browsers)
   * - Si queda < STORAGE_LIMIT_WARNING: console.warn
   * 
   * @private
   */
  private checkStorageSpace(): void {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        totalSize += (value?.length || 0);
      }
    }
    
    const ESTIMATED_LIMIT = 5 * 1024 * 1024; // ~5MB
    const remaining = ESTIMATED_LIMIT - totalSize;
    
    if (remaining < this.STORAGE_LIMIT_WARNING) {
      console.warn(
        `⚠️ Espacio bajo en localStorage: ~${Math.round(remaining / 1024)}KB restantes`
      );
    }
  }
}

/**
 * Instancia singleton del servicio de storage.
 * Usar esta instancia en toda la aplicación.
 * 
 * Ejemplo:
 * ```typescript
 * import { imageStorage } from '../services/imageStorage';
 * 
 * const result = await imageStorage.uploadImage(file, 'cover', businessId);
 * const url = await imageStorage.getImageUrl('cover', businessId);
 * ```
 */
export const imageStorage: ImageStorageService = new LocalStorageImageService();

// Re-exportar para conveniencia
export { IMAGE_CONSTRAINTS } from '../constants';
export type { ImageStorageService, ImageType, ImageUploadResult } from '../types';