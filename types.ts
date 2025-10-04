// types.ts

export interface Branding {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  font: string;
}

export interface Employee {
  id: string;
  businessId: string;
  name: string;
  avatarUrl: string;
  hours: Hours; // Horario individual del empleado
  whatsapp?: string; // Número de WhatsApp (opcional, formato internacional sugerido)
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  duration: number; // in minutes
  buffer: number; // in minutes
  price: number;
  requiresDeposit?: boolean;
  employeeIds: string[];
}

export interface Interval {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface DayHours {
  enabled: boolean;
  intervals: Interval[];
}

export type Hours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export interface Business {
  id: string;
  name: string;
  description: string;
  profileImageUrl?: string; // Nueva: imagen local del perfil/logo
  coverImageUrl?: string; // Nueva: imagen de portada
  phone: string;
  branding: Branding;
  employees: Employee[];
  services: Service[];
  hours: Hours;
  bookings: Booking[]; // Añadido para gestionar reservas en el contexto
}

// Types related to bookings/reservations
export interface Client {
  name: string;
  email?: string;
  phone: string;
}

export interface BookingService {
  id: string;
  businessId: string; // mantener trazabilidad multi-tenant
  name: string;
  price: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  businessId: string;
  client: Client;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  services: BookingService[];
  employeeId: string;
  status: BookingStatus;
  notes?: string;
}
// ===== IMAGE SYSTEM TYPES =====
// ===== IMAGE SYSTEM TYPES =====

export type ImageType = 'cover' | 'profile' | 'avatar';

export interface ImageConstraints {
  maxSizeBytes: number;
  maxWidth: number;
  maxHeight: number;
  aspectRatio?: number; // width/height ratio (optional)
  quality: number; // 0.0 - 1.0 compression quality
}

export interface ImageUploadResult {
  success: boolean;
  imageId: string;        // ID único (clave en storage) para guardar en Business/Employee
  imageUrl: string;       // Data URL Base64 para previsualización inmediata
  finalSize?: number;     // Tamaño final optimizado en bytes
  dimensions?: { width: number; height: number }; // Dimensiones finales
  wasCompressed?: boolean; // Indicador si se aplicó compresión significativa
  error?: string;          // Mensaje de error cuando success = false
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  file?: File;
}

// Interfaz abstracta para storage (localStorage en MVP, backend en futuro)
export interface ImageStorageService {
  uploadImage(
    file: File,
    type: ImageType,
    oldImageId?: string // Imagen previa a eliminar (limpieza automática)
  ): Promise<ImageUploadResult>;
  deleteImage(identifier: string): Promise<void>;
  getImageUrl(identifier: string): string;
}

export interface ProcessedImage {
  dataUrl: string; // Base64 data URL
  originalSize: number;
  finalSize: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}

// ===== SHARE LINK / PUBLIC TOKEN ACCESS =====
export interface ShareLink {
  token: string;
  status: 'active' | 'paused' | 'revoked';
  createdAt: number;
  expiresAt: number | null;
}
