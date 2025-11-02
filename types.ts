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
  archived?: boolean; // Soft delete flag
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
  categoryIds?: string[]; // Categorías a las que pertenece este servicio
  archived?: boolean; // Soft delete flag
}

// Category Icons - Iconos que se ven bien en SVG
export type CategoryIcon = 
  | 'none'            // Sin ícono (por defecto)
  | 'star'            // ⭐ Premium/Destacado
  | 'trophy'          // 🏆 Deportes/Competencias
  | 'heart'           // 💆 Spa/Masajes/Favoritos
  | 'home'            // � Salones/Espacios
  | 'cake'            // 🎂 Eventos/Celebraciones
  | 'calendar'        // 📅 Reservas/Agendamiento
  | 'eye'             // 👁️ Pestañas/Cejas
  | 'brush'           // � Maquillaje/Belleza
  | 'academic'        // � Educación/Cursos
  | 'briefcase'       // 💼 Profesional/Negocios
  | 'music';          // � Música/Entretenimiento

export interface Category {
  id: string;
  businessId: string;
  name: string;
  icon?: CategoryIcon; // Ícono visual para la categoría
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCategory {
  serviceId: string;
  categoryId: string;
  createdAt?: string;
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
  // Redes sociales (opcional)
  whatsapp?: string; // Número de WhatsApp del negocio (formato internacional)
  instagram?: string; // Username de Instagram (sin @)
  facebook?: string; // Username o ID de página de Facebook
  branding: Branding;
  employees: Employee[];
  services: Service[];
  categories: Category[]; // Categorías del negocio
  hours: Hours;
  bookings: Booking[]; // Añadido para gestionar reservas en el contexto
  // Public share link fields (multi-tenant public access)
  shareToken?: string;
  shareTokenStatus?: 'active' | 'paused' | 'revoked';
  shareTokenExpiresAt?: string | null;
}

// Types related to bookings/reservations

/**
 * Client - Clientes Recurrentes (Fase 1 implementada 31 Oct 2025)
 * Representa un cliente registrado en la base de datos.
 * Separado de Booking para normalización y reutilización.
 */
export interface Client {
  id: string; // UUID del cliente
  businessId: string; // Relación con el negocio
  name: string; // Nombre del cliente
  phone: string; // Teléfono (único por business)
  email?: string; // Email opcional
  notes?: string; // Notas internas sobre el cliente
  tags?: string[]; // Tags para categorización (ej: ["VIP", "Frecuente"])
  createdAt: string; // Timestamp ISO de creación
  updatedAt: string; // Timestamp ISO de última actualización
}

/**
 * ClientInput - Datos mínimos para crear/actualizar un cliente
 * Usado en formularios y operaciones CRUD
 */
export interface ClientInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
}

export interface BookingService {
  id: string;
  businessId: string; // mantener trazabilidad multi-tenant
  name: string;
  price: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

/**
 * BookingClient - Datos del cliente en una reserva
 * Puede ser un cliente anónimo (sin ID) o vinculado a un Client registrado
 */
export interface BookingClient {
  id?: string; // ID del cliente registrado (opcional para backward compatibility)
  name: string;
  phone: string;
  email?: string;
}

export interface Booking {
  id: string;
  businessId: string;
  client: BookingClient; // Ahora usa BookingClient en lugar de Client
  clientId?: string; // Relación opcional con tabla clients
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
