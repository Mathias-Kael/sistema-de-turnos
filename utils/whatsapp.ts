// Utilidades relacionadas con generación de links de WhatsApp
// Mantener simple y sin dependencias externas.

/** Elimina todos los caracteres que no sean dígitos. */
export const sanitizeWhatsappNumber = (value: string): string => (value || '').replace(/[^\d]/g, '');

/**
 * Construye una URL de wa.me válida con mensaje codificado.
 * Si el número no es utilizable (muy corto o vacío) retorna el formato genérico con sólo el texto.
 * Esto evita abrir WhatsApp sin mensaje (regresión detectada al devolver string vacío).
 */
export const buildWhatsappUrl = (rawNumber: string, message: string): string => {
  const cleaned = sanitizeWhatsappNumber(rawNumber);
  if (!cleaned || cleaned.length < 6) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
};

/** Determina si se debe usar el whatsapp del empleado. */
export const canUseEmployeeWhatsapp = (raw?: string | null): boolean => {
  if (!raw) return false;
  return sanitizeWhatsappNumber(raw).length >= 8; // Umbral simple para evitar basura
};
