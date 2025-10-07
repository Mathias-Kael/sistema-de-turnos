export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];

function resolveEnv(): any {
  // Intentar obtener import.meta.env sin que el parser de Jest falle (eval dinámico)
  try {
    // eslint-disable-next-line no-new-func
    const env = (Function('try { return import.meta && import.meta.env } catch { return undefined }')());
    if (env) return env;
  } catch (_) {}
  // Fallback a process.env (Jest / Node / otras herramientas)
  if (typeof process !== 'undefined' && (process as any).env) return (process as any).env;
  return {};
}

const env = resolveEnv();

const resolvedLevel: LogLevel = (env.VITE_LOG_LEVEL as LogLevel)
  || (env.LOG_LEVEL as LogLevel)
  || ((env.MODE || env.NODE_ENV) === 'production' ? 'none' : 'debug');

const shouldLog = (level: LogLevel): boolean => {
  return levelOrder.indexOf(level) >= levelOrder.indexOf(resolvedLevel);
};

// Evitar evaluar console en entornos muy restringidos
const safeConsole = typeof console !== 'undefined' ? console : ({ log: () => {}, warn: () => {}, error: () => {} } as Console);

export const logger = {
  debug: (...args: any[]) => shouldLog('debug') && safeConsole.log('[DEBUG]', ...args),
  info:  (...args: any[]) => shouldLog('info')  && safeConsole.log('[INFO]', ...args),
  warn:  (...args: any[]) => shouldLog('warn')  && safeConsole.warn('[WARN]', ...args),
  error: (...args: any[]) => shouldLog('error') && safeConsole.error('[ERROR]', ...args),
  level: resolvedLevel,
};
