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

// Validación de CBU/CVU argentino (22 dígitos con checksum)
export function validateCBU(cbu: string): boolean {
  const cleaned = (cbu || '').replace(/\s/g, '');
  if (!/^\d{22}$/.test(cleaned)) return false;

  // Detección automática de tipo (CBU vs CVU)
  // Los CVU de PSPs (como Mercado Pago) suelen comenzar con 0000003
  const isCVU = cleaned.startsWith('0000003');

  // Algoritmo de validación de dígitos verificadores
  // El algoritmo matemático de checksum es el mismo para CBU y CVU en el sistema SISCEN/COELSA
  const arr = cleaned.split('').map(Number);
  
  // Validar primer bloque (Banco y Sucursal / ID PSP)
  // Pesos: 7, 1, 3, 9, 7, 1, 3
  const check1 = arr[7];
  const sum1 = arr[0]*7 + arr[1]*1 + arr[2]*3 + arr[3]*9 + arr[4]*7 + arr[5]*1 + arr[6]*3;
  const diff1 = (10 - (sum1 % 10)) % 10;
  
  if (diff1 !== check1) return false;

  // Validar segundo bloque (Cuenta / Usuario)
  // Pesos: 3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3
  const check2 = arr[21];
  const sum2 = arr[8]*3 + arr[9]*9 + arr[10]*7 + arr[11]*1 + arr[12]*3 + arr[13]*9 + arr[14]*7 + arr[15]*1 + arr[16]*3 + arr[17]*9 + arr[18]*7 + arr[19]*1 + arr[20]*3;
  const diff2 = (10 - (sum2 % 10)) % 10;
  
  if (diff2 !== check2) return false;

  return true;
}

// Validación de alias de pago (6-20 caracteres, alfanuméricos, puntos y guiones)
export function validatePaymentAlias(alias: string): boolean {
  const cleaned = (alias || '').trim();
  return /^[a-zA-Z0-9.-]{6,20}$/.test(cleaned);
}
