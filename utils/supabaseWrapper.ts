import { PostgrestError } from '@supabase/supabase-js';
import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number; // intentos totales (incluye el primero)
  baseDelayMs?: number; // delay inicial
  maxDelayMs?: number;  // tope de delay
  factor?: number;      // multiplicador exponencial
  jitter?: boolean;     // agregar jitter aleatorio
  operationName?: string; // nombre para logs
}

const DEFAULT_OPTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  factor: 2,
  jitter: true,
  operationName: 'supabase-op',
};

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function computeDelay(attempt: number, opts: Required<RetryOptions>) {
  const raw = Math.min(opts.baseDelayMs * Math.pow(opts.factor, attempt - 1), opts.maxDelayMs);
  if (!opts.jitter) return raw;
  const jitterPortion = raw * 0.3; // 30% jitter
  return raw - jitterPortion / 2 + Math.random() * jitterPortion; // +-15%
}

// Determinar si un error amerita retry
function isTransient(error: unknown): boolean {
  if (!error) return false;
  const msg = (typeof error === 'string') ? error : (error as any).message || '';
  const transientPatterns = [
    'timeout',
    'network',
    'fetch failed',
    'Failed to fetch',
    'ECONNRESET',
    'ETIMEDOUT',
    '503',
    '504'
  ];
  return transientPatterns.some(p => msg.toLowerCase().includes(p.toLowerCase()));
}

export interface SupabaseResult<T> { data: T | null; error: PostgrestError | null; }

export async function withRetry<T>(fn: () => Promise<SupabaseResult<T>>, options?: RetryOptions): Promise<SupabaseResult<T>> {
  const opts = { ...DEFAULT_OPTS, ...(options || {}) } as Required<RetryOptions>;
  let lastError: PostgrestError | null = null;
  const start = Date.now();

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const res = await fn();
      if (!res.error) {
        if (attempt > 1) {
          logger.debug(`[${opts.operationName}] success after retry attempt ${attempt}`);
        }
        return res;
      }
      lastError = res.error;
      if (!isTransient(res.error)) {
        // Error no transitorio: abortar
        return { data: res.data, error: res.error };
      }
      if (attempt < opts.maxAttempts) {
        const delay = computeDelay(attempt, opts);
        logger.debug(`[${opts.operationName}] transient error (attempt ${attempt}): ${res.error.message}. Retrying in ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }
    } catch (e: any) {
      // Excepción fuera del contrato supabase (fetch cortado, etc.)
      const wrapperErr: PostgrestError = {
        message: e.message || 'Unknown error',
        details: e.stack || '',
        hint: 'exception',
        code: '000',
        name: 'PostgrestError'
      };
      lastError = wrapperErr;
      if (!isTransient(e) || attempt === opts.maxAttempts) {
        return { data: null, error: wrapperErr };
      }
      const delay = computeDelay(attempt, opts);
      logger.debug(`[${opts.operationName}] exception (attempt ${attempt}): ${wrapperErr.message}. Retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
      continue;
    }
  }

  return { data: null, error: lastError };
}

// Helper para lanzar directamente error con mensaje amigable
export async function withRetryOrThrow<T>(fn: () => Promise<SupabaseResult<T>>, options?: RetryOptions & { userMessage?: string }): Promise<T> {
  const { userMessage, ...rest } = options || {};
  const res = await withRetry(fn, rest);
  if (res.error) {
    const finalMsg = userMessage || 'No se pudo completar la operación. Intenta nuevamente.';
    const err = new Error(finalMsg);
    (err as any).cause = res.error;
    throw err;
  }
  return res.data as T;
}
