// utils/validation.ts
// Validaciones centralizadas para inputs de cliente y reservas.

export interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: string; // valor normalizado cuando aplica
}

// Regla: nombre 2-80 chars, letras, espacios, apóstrofes, guiones y tildes.
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,80}$/;

export function validateClientName(raw: string): ValidationResult {
  const value = (raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return { valid: false, error: 'El nombre es obligatorio.' };
  if (!NAME_REGEX.test(value)) {
    return { valid: false, error: 'Nombre inválido (solo letras, espacios y - \' ).' };
  }
  return { valid: true, value };
}

// Normalización de teléfono: conservar solo dígitos. Longitud mínima configurable (por defecto 8).
export function validateClientPhone(raw: string, minLen = 8): ValidationResult {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return { valid: false, error: 'El teléfono es obligatorio.' };
  if (digits.length < minLen) return { valid: false, error: `El teléfono debe tener al menos ${minLen} dígitos.` };
  // Convención: devolver en formato internacional si parece Argentina (ejemplo simple). No hacemos heurística compleja.
  return { valid: true, value: digits };
}

export interface BookingInput {
  name: string;
  phone: string;
  email?: string;
}

export function validateBookingInput(input: BookingInput): { ok: boolean; errors: Record<string, string>; normalized: { name: string; phone: string; email?: string } | null } {
  const errors: Record<string, string> = {};
  const nameRes = validateClientName(input.name);
  if (!nameRes.valid) errors.name = nameRes.error!;

  const phoneRes = validateClientPhone(input.phone);
  if (!phoneRes.valid) errors.phone = phoneRes.error!;

  let emailNorm = input.email?.trim();
  if (emailNorm) {
    // Validación simple de email (no exhaustiva RFC, suficiente para UI)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(emailNorm)) {
      errors.email = 'Email inválido.';
    }
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    normalized: ok ? { name: nameRes.value!, phone: phoneRes.value!, email: emailNorm } : null
  };
}

// Validación de CBU argentino (22 dígitos)
export function validateCBU(cbu: string): boolean {
  const cleaned = (cbu || '').replace(/\s/g, '');
  return /^\d{22}$/.test(cleaned);
}

// Validación de alias de pago (6-20 caracteres, alfanuméricos, puntos y guiones)
export function validatePaymentAlias(alias: string): boolean {
  const cleaned = (alias || '').trim();
  return /^[a-zA-Z0-9.-]{6,20}$/.test(cleaned);
}
