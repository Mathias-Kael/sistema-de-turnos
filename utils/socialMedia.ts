// utils/socialMedia.ts - Utilidades para redes sociales

/**
 * Sanitiza un número de WhatsApp removiendo caracteres no numéricos
 * pero manteniendo el signo + inicial si existe
 */
export function sanitizeWhatsappNumber(value: string): string {
  if (!value) return '';
  
  // Preservar el + inicial si existe
  const hasPlus = value.trim().startsWith('+');
  const digitsOnly = value.replace(/\D/g, '');
  
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Valida si un número de WhatsApp tiene formato válido
 * Debe tener al menos 8 dígitos (sin contar el +)
 */
export function isValidWhatsappNumber(value: string): boolean {
  if (!value) return true; // Opcional, vacío es válido
  const sanitized = sanitizeWhatsappNumber(value);
  const digitsOnly = sanitized.replace(/\+/g, '');
  return digitsOnly.length >= 8;
}

/**
 * Sanitiza un username de Instagram removiendo @ y espacios
 */
export function sanitizeInstagramUsername(value: string): string {
  if (!value) return '';
  return value.trim().replace(/^@+/, '').replace(/\s/g, '');
}

/**
 * Valida un username de Instagram
 * Debe ser alfanumérico con puntos y guiones bajos permitidos
 */
export function isValidInstagramUsername(value: string): boolean {
  if (!value) return true; // Opcional
  const sanitized = sanitizeInstagramUsername(value);
  // Instagram usernames: 1-30 caracteres, solo letras, números, puntos y guiones bajos
  const regex = /^[a-zA-Z0-9._]{1,30}$/;
  return regex.test(sanitized);
}

/**
 * Sanitiza un username/página de Facebook
 */
export function sanitizeFacebookPage(value: string): string {
  if (!value) return '';
  // Remover espacios y URL completas, quedarnos solo con el identificador
  let cleaned = value.trim();
  
  // Si viene una URL completa, extraer el username/ID
  const patterns = [
    /facebook\.com\/(.+?)(?:\/|$)/,
    /fb\.com\/(.+?)(?:\/|$)/,
    /fb\.me\/(.+?)(?:\/|$)/
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = match[1];
      break;
    }
  }
  
  return cleaned.replace(/\s/g, '');
}

/**
 * Valida un identificador de página de Facebook
 */
export function isValidFacebookPage(value: string): boolean {
  if (!value) return true; // Opcional
  const sanitized = sanitizeFacebookPage(value);
  // Facebook usernames/IDs: 5+ caracteres alfanuméricos con puntos permitidos
  const regex = /^[a-zA-Z0-9.]{5,}$/;
  return regex.test(sanitized);
}

/**
 * Construye URL de WhatsApp con mensaje opcional
 */
export function buildWhatsappBusinessUrl(phoneNumber: string, message?: string): string {
  const sanitized = sanitizeWhatsappNumber(phoneNumber);
  const digitsOnly = sanitized.replace(/\+/g, '');
  
  if (!digitsOnly) return '';
  
  const baseUrl = `https://wa.me/${digitsOnly}`;
  
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  
  return baseUrl;
}

/**
 * Construye URL de Instagram
 */
export function buildInstagramUrl(username: string): string {
  const sanitized = sanitizeInstagramUsername(username);
  return sanitized ? `https://instagram.com/${sanitized}` : '';
}

/**
 * Construye URL de Facebook
 */
export function buildFacebookUrl(pageId: string): string {
  const sanitized = sanitizeFacebookPage(pageId);
  return sanitized ? `https://facebook.com/${sanitized}` : '';
}
