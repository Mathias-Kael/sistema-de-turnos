import { supabase } from '../lib/supabase';
import { ImageStorageService, ImageType, ImageUploadResult } from '../types';
import { ImageProcessor } from '../utils/imageProcessing';
import { IMAGE_CONSTRAINTS } from '../constants';
import { uploadWithRetry, deleteWithRetry } from '../utils/storageRetry';
import { logger } from '../utils/logger';

/**
 * Servicio de almacenamiento de imágenes usando Supabase Storage
 * - Sube imágenes procesadas a buckets de Supabase
 * - Genera URLs públicas automáticamente
 * - Elimina imágenes viejas tras subida exitosa
 */
class SupabaseImageStorage implements ImageStorageService {
  
  private getBucketName(type: ImageType): string {
    if (type === 'avatar') return 'employee-avatars';
    return 'business-images'; // cover y profile
  }

  async uploadImage(file: File, type: ImageType, oldImageId?: string): Promise<ImageUploadResult> {
    try {
      const constraints = IMAGE_CONSTRAINTS[type];
      
      // 1. Procesar imagen (resize/compress)
      const processed = await ImageProcessor.processImage(file, constraints);
      
      if (processed.finalSize > constraints.maxSizeBytes) {
        throw new Error(
          `La imagen optimizada (${Math.round(processed.finalSize / 1024)}KB) excede el límite de ${Math.round(constraints.maxSizeBytes / 1024)}KB.`
        );
      }

      // 2. Convertir dataURL a Blob
      const blob = await this.dataURLToBlob(processed.dataUrl);
      
      // 3. Generar nombre único
      const fileName = this.generateFileName(type);
      const bucketName = this.getBucketName(type);

      // 4. Subir a Supabase Storage con retry automático
      logger.debug(`[SupabaseImageStorage] Subiendo ${type} a bucket ${bucketName}`);
      
      const { data: uploadData, error: uploadError } = await uploadWithRetry(
        supabase.storage,
        {
          bucket: bucketName,
          path: fileName,
          file: blob,
          options: {
            contentType: file.type,
            upsert: false,
          },
          onRetry: (attempt, maxAttempts, error) => {
            logger.warn(`[SupabaseImageStorage] Reintento ${attempt}/${maxAttempts} tras error:`, error?.message);
          }
        }
      );

      if (uploadError) {
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      // 5. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // 6. Eliminar imagen anterior si existe
      if (oldImageId) {
        await this.deleteImage(oldImageId);
      }

      return {
        success: true,
        imageId: fileName, // Guardamos el fileName como ID
        imageUrl: imageUrl,
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
    if (!identifier) return;

    // Si es una URL completa de Supabase, extraer el fileName
    let fileName = identifier;
    if (identifier.startsWith('http')) {
      // URL format: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/FILENAME
      const parts = identifier.split('/');
      fileName = parts[parts.length - 1]; // Último segmento = fileName
    }

    // Determinar bucket basado en el prefijo del fileName
    let bucketName = 'business-images';
    if (fileName.startsWith('avatar_')) {
      bucketName = 'employee-avatars';
    }

    logger.debug(`[SupabaseImageStorage] Eliminando ${fileName} de bucket ${bucketName}`);

    const { error } = await deleteWithRetry(
      supabase.storage,
      bucketName,
      fileName,
      (attempt, maxAttempts, error) => {
        logger.warn(`[SupabaseImageStorage] Delete retry ${attempt}/${maxAttempts}:`, error?.message);
      }
    );

    if (error) {
      logger.error('Error al eliminar imagen:', error);
    } else {
      logger.info('✅ Imagen anterior eliminada:', fileName);
    }
  }

  getImageUrl(identifier: string): string {
    // Si es una URL completa de Supabase, devolverla tal cual
    if (identifier.startsWith('http')) {
      return identifier;
    }

    // Si es un fileName, construir URL pública
    let bucketName = 'business-images';
    if (identifier.startsWith('avatar_')) {
      bucketName = 'employee-avatars';
    }
    try {
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(identifier);
      if (!data?.publicUrl) {
        console.warn('[imageStorage] No se pudo generar URL pública para', identifier);
        return identifier; // fallback (mantener el fileName)
      }
      return data.publicUrl;
    } catch (e) {
      console.warn('[imageStorage] Excepción obteniendo URL pública', e);
      return identifier;
    }
  }

  private generateFileName(type: ImageType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  private async dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return response.blob();
  }
}

export const imageStorage: ImageStorageService = new SupabaseImageStorage();
export { IMAGE_CONSTRAINTS } from '../constants';
export type { ImageStorageService, ImageType, ImageUploadResult } from '../types';
