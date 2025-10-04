import { ImageConstraints, ImageValidationResult, ProcessedImage } from '../types';
import { SUPPORTED_IMAGE_FORMATS, IMAGE_ERROR_MESSAGES } from '../constants';

/**
 * Clase utilitaria para procesamiento de imágenes.
 * Usa Canvas API nativa del navegador, sin dependencias externas.
 */
export class ImageProcessor {
  
  /**
   * Valida que un archivo sea una imagen válida.
   * 
   * Verifica:
   * - Tipo MIME soportado
   * - Tamaño no excede 10MB (límite previo a optimización)
   * 
   * @param file - Archivo a validar
   * @returns Resultado de validación con mensaje de error si aplica
   */
  static validateFile(file: File): ImageValidationResult {
    const errors: string[] = [];

    // Verificar tipo MIME
    if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
      errors.push(IMAGE_ERROR_MESSAGES.INVALID_FORMAT);
    }

    // Verificar tamaño máximo previo a optimización (10MB)
    const maxPreProcessSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxPreProcessSize) {
      errors.push(`El archivo es demasiado grande (máx. 10MB antes de optimización).`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      file: errors.length === 0 ? file : undefined,
    };
  }

  /**
   * Redimensiona y comprime una imagen según las restricciones dadas.
   * 
   * Proceso:
   * 1. Cargar imagen en elemento Image
   * 2. Calcular dimensiones optimizadas (mantener aspect ratio)
   * 3. Dibujar en canvas con nuevas dimensiones
   * 4. Convertir a Blob con compresión
   * 
   * @param file - Archivo de imagen original
   * @param constraints - Restricciones de tamaño y calidad
   * @returns Promise con Blob optimizado
   */
  static async resizeAndCompress(
    file: File,
    constraints: ImageConstraints
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            // Calcular dimensiones optimizadas
            const { width, height } = this.getOptimizedDimensions(
              img.width,
              img.height,
              constraints.maxWidth,
              constraints.maxHeight
            );

            // Crear canvas para redimensionar
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('No se pudo crear contexto de canvas'));
              return;
            }

            canvas.width = width;
            canvas.height = height;

            // Dibujar imagen redimensionada con alta calidad
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Determinar formato de salida y tipo MIME
            const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            
            // Convertir a Blob con compresión
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error(IMAGE_ERROR_MESSAGES.PROCESSING_FAILED));
                }
              },
              outputFormat,
              constraints.quality
            );
          } catch (error) {
            reject(new Error(`Error al procesar imagen: ${error}`));
          }
        };

        img.onerror = () => {
          reject(new Error('Error al cargar la imagen'));
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Convierte un Blob a string Base64.
   * 
   * @param blob - Blob a convertir
   * @returns Promise con string Base64 (incluye data URI)
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };

      reader.onerror = () => {
        reject(new Error('Error al convertir blob a Base64'));
      };

      reader.readAsDataURL(blob);
    });
  }

  /**
   * Calcula dimensiones optimizadas manteniendo aspect ratio.
   * 
   * Lógica:
   * - Si width > maxWidth: escalar proporcionalmente
   * - Si height > maxHeight: escalar proporcionalmente
   * - Siempre mantener la proporción original
   * 
   * @param originalWidth - Ancho original
   * @param originalHeight - Alto original
   * @param maxWidth - Ancho máximo permitido
   * @param maxHeight - Alto máximo permitido
   * @returns Dimensiones optimizadas { width, height }
   */
  static getOptimizedDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // Si la imagen ya está dentro de los límites, no cambiar
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calcular ratios de escalado
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;

    // Usar el ratio más restrictivo para mantener proporción
    const scalingRatio = Math.min(widthRatio, heightRatio);

    // Calcular nuevas dimensiones
    const newWidth = Math.round(originalWidth * scalingRatio);
    const newHeight = Math.round(originalHeight * scalingRatio);

    return { width: newWidth, height: newHeight };
  }

  /**
   * Procesa completamente un archivo de imagen.
   * 
   * Flujo completo:
   * 1. Validar archivo
   * 2. Redimensionar y comprimir
   * 3. Validar tamaño final
   * 4. Convertir a Base64
   * 
   * @param file - Archivo a procesar
   * @param constraints - Restricciones aplicables
   * @returns Promise con ProcessedImage (base64, size, dimensions)
   * @throws Error si validación falla o tamaño final excede límite
   */
  static async processImage(
    file: File,
    constraints: ImageConstraints
  ): Promise<ProcessedImage> {
    // 1. Validar archivo
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // 2. Redimensionar y comprimir
    const optimizedBlob = await this.resizeAndCompress(file, constraints);

    // 3. Verificar que el tamaño final no exceda el límite
    if (optimizedBlob.size > constraints.maxSizeBytes) {
      throw new Error(
        `La imagen optimizada (${Math.round(optimizedBlob.size / 1024)}KB) aún excede el límite permitido (${Math.round(constraints.maxSizeBytes / 1024)}KB). Intenta con una imagen más pequeña.`
      );
    }

    // 4. Convertir a Base64
    const dataUrl = await this.blobToBase64(optimizedBlob);

    // 5. Calcular dimensiones finales (necesitamos cargar la imagen nuevamente)
    const finalDimensions = await this.getImageDimensions(dataUrl);

    // 6. Determinar si hubo compresión significativa
    const wasCompressed = optimizedBlob.size < file.size * 0.9; // 90% del tamaño original

    return {
      dataUrl,
      originalSize: file.size,
      finalSize: optimizedBlob.size,
      width: finalDimensions.width,
      height: finalDimensions.height,
      wasCompressed,
    };
  }

  /**
   * Obtiene las dimensiones de una imagen desde su data URL.
   * Método auxiliar para processImage().
   * 
   * @param dataUrl - Data URL de la imagen
   * @returns Promise con dimensiones { width, height }
   */
  private static async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Error al obtener dimensiones de la imagen procesada'));
      };

      img.src = dataUrl;
    });
  }
}