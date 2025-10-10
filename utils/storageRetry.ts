import { logger } from './logger';

/**
 * Tipos de errores que justifican retry automático
 */
const RETRYABLE_ERRORS = [
  'ERR_CONNECTION_CLOSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'fetch failed',
  'network',
  'timeout',
];

/**
 * Verifica si un error debe reintentar
 */
function isRetryableError(error: any): boolean {
  const message = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toLowerCase();
  
  return RETRYABLE_ERRORS.some(retryable => 
    message.includes(retryable.toLowerCase()) || code.includes(retryable.toLowerCase())
  );
}

/**
 * Sleep con backoff exponencial
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Configuración de retry
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  onRetry?: (attempt: number, maxAttempts: number, error: any) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1s
  maxDelay: 4000, // 4s
};

/**
 * Wrapper genérico con retry y backoff exponencial
 */
export async function withStorageRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, onRetry } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[storageRetry] Intento ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // No reintentar si no es error de red
      if (!isRetryableError(error)) {
        logger.debug('[storageRetry] Error no retriable, abortando:', error?.message);
        throw error;
      }
      
      // Si es el último intento, lanzar error
      if (attempt === maxAttempts) {
        logger.error('[storageRetry] Máximo de intentos alcanzado');
        break;
      }
      
      // Calcular delay con backoff exponencial
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      logger.warn(`[storageRetry] Intento ${attempt} falló, reintentando en ${delay}ms:`, error?.message);
      
      // Callback para UI feedback
      if (onRetry) {
        onRetry(attempt, maxAttempts, error);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Helper específico para upload de Storage
 */
export interface StorageUploadOptions {
  bucket: string;
  path: string;
  file: File | Blob;
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  };
  onRetry?: (attempt: number, maxAttempts: number, error: any) => void;
}

export async function uploadWithRetry(
  supabaseStorage: any,
  { bucket, path, file, options, onRetry }: StorageUploadOptions
): Promise<{ data: any; error: any }> {
  try {
    return await withStorageRetry(
      async () => {
        const result = await supabaseStorage
          .from(bucket)
          .upload(path, file, options);
        
        // Si hay error, lanzarlo para que el retry lo capture
        if (result.error) {
          throw result.error;
        }
        
        return result;
      },
      { onRetry }
    );
  } catch (error) {
    // Si agotamos reintentos, retornar objeto con error en formato Supabase
    return { data: null, error };
  }
}

/**
 * Helper para delete con retry
 */
export async function deleteWithRetry(
  supabaseStorage: any,
  bucket: string,
  path: string,
  onRetry?: (attempt: number, maxAttempts: number, error: any) => void
): Promise<{ data: any; error: any }> {
  try {
    return await withStorageRetry(
      async () => {
        const result = await supabaseStorage
          .from(bucket)
          .remove([path]);
        
        if (result.error) {
          throw result.error;
        }
        
        return result;
      },
      { onRetry }
    );
  } catch (error) {
    // Si agotamos reintentos, retornar objeto con error en formato Supabase
    return { data: null, error };
  }
}
