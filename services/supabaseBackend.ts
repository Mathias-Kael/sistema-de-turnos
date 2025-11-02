import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Business, Booking, Service, Employee, Hours, Client } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { withRetryOrThrow } from '../utils/supabaseWrapper';
import {
  sanitizeWhatsappNumber,
  sanitizeInstagramUsername,
  sanitizeFacebookPage,
} from '../utils/socialMedia';

// Cache por sesión de usuario
const businessCacheByUser = new Map<string, { businessId: string }>();

/**
 * SUPABASE BACKEND
 * 
 * Este archivo reemplaza mockBackend.ts pero mantiene la misma interfaz.
 * Migra de localStorage a base de datos real en Supabase.
 */

/**
 * Dictionary for translating common Supabase booking errors to Spanish
 */
const ERROR_TRANSLATIONS: Record<string, string> = {
  'Employee already has booking at this time': 'El empleado ya tiene una reserva en este horario',
  'Slot overlaps': 'Este horario se superpone con otra reserva existente',
  'Employee already has booking': 'El empleado ya tiene una reserva en este horario',
  'Invalid booking time': 'Horario de reserva inválido',
  'Business not found': 'Negocio no encontrado',
  'Employee not found': 'Empleado no encontrado',
  'Service not found': 'Servicio no encontrado',
  'Booking overlaps with existing booking': 'La reserva se superpone con una reserva existente',
  'Employee not available at this time': 'El empleado no está disponible en este horario',
};

// =====================================================
// HELPER: Construir objeto Business desde tablas
// =====================================================

async function buildBusinessObject(businessId: string): Promise<Business> {
  // 1. Obtener business (retry)
  const bizData = await withRetryOrThrow(async () => {
    const res = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    return { data: res.data, error: res.error };
  }, { operationName: 'get-business', userMessage: 'No se pudo cargar el negocio.' });

  if (!bizData) throw new Error('Business not found');

  // 2. Obtener employees
  const employeesData = (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .eq('archived', false);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-employees', userMessage: 'No se pudieron cargar empleados.' })) || [];

  // 3. Obtener services con sus employee_ids
  const servicesData = (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('services')
      .select(`
        *,
        service_employees!inner(employee_id)
      `)
      .eq('business_id', businessId)
      .eq('archived', false);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-services', userMessage: 'No se pudieron cargar servicios.' })) || [];

  // 3.5. Obtener categorías y relaciones service_categories
  const categoriesData = (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', businessId);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-categories', userMessage: 'No se pudieron cargar categorías.' })) || [];

  // Obtener solo service_categories de servicios de este negocio
  const serviceIds = (servicesData || []).map((s: any) => s.id);
  const serviceCategoriesData = serviceIds.length > 0 ? (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('service_categories')
      .select('*')
      .in('service_id', serviceIds);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-service-categories', userMessage: 'No se pudieron cargar relaciones de categorías.' })) || [] : [];

  // 4. Obtener bookings con sus services
  // IMPORTANTE: Usar LEFT JOIN (!left) para incluir breaks sin servicios
  const bookingsData = (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services!left(service_id, service_name, service_price)
      `)
      .eq('business_id', businessId)
      .eq('archived', false);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-bookings', userMessage: 'No se pudieron cargar reservas.' })) || [];

  // OPTIMIZACIÓN: Pre-calcular mapa de categorías por servicio para lookup O(1)
  const serviceCategoryMap = new Map<string, string[]>();
  if (serviceCategoriesData.length > 0) {
    serviceCategoriesData.forEach((sc: any) => {
      if (!serviceCategoryMap.has(sc.service_id)) {
        serviceCategoryMap.set(sc.service_id, []);
      }
      serviceCategoryMap.get(sc.service_id)!.push(sc.category_id);
    });
  }

  // Construir objeto Business
  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    description: bizData.description || '',
    phone: bizData.phone,
    whatsapp: bizData.whatsapp || undefined,
    instagram: bizData.instagram || undefined,
    facebook: bizData.facebook || undefined,
    profileImageUrl: bizData.profile_image_url,
    coverImageUrl: bizData.cover_image_url,
    branding: bizData.branding,
    hours: bizData.hours as Hours,
    shareToken: bizData.share_token,
    shareTokenStatus: bizData.share_token_status,
    shareTokenExpiresAt: bizData.share_token_expires_at,
    employees: (employeesData || []).map(e => ({
      id: e.id,
      businessId: e.business_id,
      name: e.name,
      avatarUrl: e.avatar_url || '',
      whatsapp: e.whatsapp,
      hours: e.hours as Hours,
    })),
    services: (servicesData || []).map(s => {
      const categoryIds = serviceCategoryMap.get(s.id);
      return {
        id: s.id,
        businessId: s.business_id,
        name: s.name,
        description: s.description || '',
        duration: s.duration,
        buffer: s.buffer || 0,
        price: parseFloat(s.price),
        requiresDeposit: s.requires_deposit || false,
        employeeIds: s.service_employees.map((se: any) => se.employee_id),
        categoryIds: categoryIds && categoryIds.length > 0 ? categoryIds : undefined,
      };
    }),
    categories: (categoriesData || []).map(c => ({
      id: c.id,
      businessId: c.business_id,
      name: c.name,
      icon: c.icon as import('../types').CategoryIcon | undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    bookings: (bookingsData || []).map(b => ({
      id: b.id,
      businessId: b.business_id,
      client: {
        name: b.client_name,
        email: b.client_email,
        phone: b.client_phone,
      },
      date: b.booking_date,
      start: b.start_time,
      end: b.end_time,
      // Manejar breaks: booking_services puede ser null/undefined o array vacío
      services: (b.booking_services || [])
        .filter((bs: any) => bs !== null) // Filtrar nulls del LEFT JOIN
        .map((bs: any) => {
          // Fallback: si el nombre o precio no están poblados en booking_services, usar catálogo de servicios
          const rawName = (bs.service_name ?? '').toString();
          const hasName = rawName.trim().length > 0;
          const hasPrice = bs.service_price !== null && bs.service_price !== undefined && bs.service_price !== '';
          let name = rawName;
          let price = hasPrice ? parseFloat(bs.service_price) : NaN;
          if (!hasName || !hasPrice || isNaN(price)) {
            const svcRow = (servicesData || []).find((s: any) => s.id === bs.service_id);
            if (svcRow) {
              name = hasName ? name : (svcRow.name ?? '');
              price = !isNaN(price) && hasPrice ? price : parseFloat(svcRow.price);
            }
          }
          return {
            id: bs.service_id,
            businessId: businessId,
            name,
            price: isNaN(price) ? 0 : price,
          };
        }),
      employeeId: b.employee_id,
      status: b.status,
      notes: b.notes,
    })),
  };

  return business;
}

// =====================================================
// MIGRACIÓN INICIAL desde localStorage
// =====================================================

async function migrateFromLocalStorage(ownerId: string): Promise<string | null> {
  const localData = localStorage.getItem('businessData');
  if (!localData) return null;

  try {
    const business: Business = JSON.parse(localData);

    // 1. Crear business en Supabase
    const { data: newBiz, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: business.name,
        description: business.description,
        phone: business.phone,
        profile_image_url: business.profileImageUrl,
        cover_image_url: business.coverImageUrl,
        branding: business.branding,
        hours: business.hours,
        owner_id: ownerId,
      })
      .select()
      .single();

      if (bizError || !newBiz) {
        logger.error('Migration failed:', bizError);
      return null;
    }

    const businessId = newBiz.id;

    // 2. Migrar employees
    for (const emp of business.employees) {
      const { error: empError } = await supabase
        .from('employees')
        .insert({
          id: emp.id,
          business_id: businessId,
          name: emp.name,
          avatar_url: emp.avatarUrl,
          whatsapp: emp.whatsapp,
          hours: emp.hours,
          archived: false,
        });

        if (empError) logger.error('Employee migration error:', empError);
    }

    // 3. Migrar services
    for (const svc of business.services) {
      const { data: newService, error: svcError } = await supabase
        .from('services')
        .insert({
          id: svc.id,
          business_id: businessId,
          name: svc.name,
          description: svc.description,
          duration: svc.duration,
          buffer: svc.buffer,
          archived: false,
          price: svc.price,
          requires_deposit: svc.requiresDeposit,
        })
        .select()
        .single();

        if (svcError) {
          logger.error('Service migration error:', svcError);
        continue;
      }

      // Insertar relaciones service_employees
      for (const empId of svc.employeeIds) {
        await supabase.from('service_employees').insert({
          service_id: newService.id,
          employee_id: empId,
        });
      }
    }

    // 4. Migrar bookings
    for (const booking of business.bookings) {
      const { data: newBooking, error: bookError } = await supabase
        .from('bookings')
        .insert({
          business_id: businessId,
          employee_id: booking.employeeId,
          client_name: booking.client.name,
          client_email: booking.client.email,
          client_phone: booking.client.phone,
          booking_date: booking.date,
          start_time: booking.start,
          end_time: booking.end,
          status: booking.status,
          notes: booking.notes,
        })
        .select()
        .single();

        if (bookError) {
          logger.error('Booking migration error:', bookError);
        continue;
      }

      // Insertar booking_services
      for (const svc of booking.services) {
        await supabase.from('booking_services').insert({
          booking_id: newBooking.id,
          service_id: svc.id,
          service_name: svc.name,
          service_price: svc.price,
        });
      }
    }

  // Limpieza de legacy para no repetir
  try { localStorage.removeItem('businessData'); } catch {}
  try { localStorage.removeItem('supabase_business_id'); } catch {}
  try { localStorage.removeItem('migration_completed'); } catch {}

      logger.debug('Migration completed successfully');
    return businessId;
  } catch (error) {
      logger.error('Migration failed:', error);
    return null;
  }
}

// =====================================================
// API PÚBLICA (mantiene misma interfaz que mockBackend)
// =====================================================

export const supabaseBackend = {
  getBusinessData: async (): Promise<Business> => {
    logger.debug('[getBusinessData] Iniciando...');
    
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    logger.debug('[getBusinessData] auth.getUser() resultado:', { 
      hasUser: !!userData?.user, 
      userId: userData?.user?.id,
      error: userErr?.message 
    });
    
    const userId = userData.user?.id;
    if (!userId) {
      logger.error('[getBusinessData] No userId - usuario no autenticado');
      throw new Error('Usuario no autenticado');
    }

    // Cache por sesión
    const cached = businessCacheByUser.get(userId);
    logger.debug('[getBusinessData] Cache check:', { hasCached: !!cached, businessId: cached?.businessId });
    if (cached?.businessId) {
      logger.debug('[getBusinessData] Usando negocio cacheado:', cached.businessId);
      return buildBusinessObject(cached.businessId);
    }

    // Buscar negocio por owner (toma el más reciente si hay duplicados)
    logger.debug('[getBusinessData] Buscando negocio por owner_id:', userId);
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id, status, owner_id')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    logger.debug('[getBusinessData] Query resultado:', { 
      found: !!biz, 
      businessId: biz?.id,
      status: biz?.status,
      owner_id: biz?.owner_id,
      error: bizErr?.message 
    });

    // Diagnóstico: buscar TODOS los negocios del usuario (incluidos inactivos/duplicados)
    const { data: allBiz, error: allErr } = await supabase
      .from('businesses')
      .select('id, status, owner_id, name, created_at')
      .eq('owner_id', userId);
    
    logger.debug('[getBusinessData] TODOS los negocios del usuario:', { 
      count: allBiz?.length || 0,
      businesses: allBiz,
      error: allErr?.message 
    });

    if (biz?.id) {
      logger.debug('[getBusinessData] Negocio encontrado, guardando en cache:', biz.id);
      businessCacheByUser.set(userId, { businessId: biz.id });
      return buildBusinessObject(biz.id);
    }

    // Migración legacy si hay datos en localStorage
    logger.debug('[getBusinessData] No encontrado, intentando migración legacy...');
    const migrated = await migrateFromLocalStorage(userId);
    if (migrated) {
      logger.debug('[getBusinessData] Migración exitosa, businessId:', migrated);
      businessCacheByUser.set(userId, { businessId: migrated });
      return buildBusinessObject(migrated);
    }

    // Crear negocio básico si no existe
    logger.debug('[getBusinessData] Creando nuevo negocio para userId:', userId);
    const { data: newBiz, error: createErr } = await supabase
      .from('businesses')
      .insert({
        name: INITIAL_BUSINESS_DATA.name || 'Mi Negocio',
        description: INITIAL_BUSINESS_DATA.description || '',
        phone: INITIAL_BUSINESS_DATA.phone || '',
        profile_image_url: INITIAL_BUSINESS_DATA.profileImageUrl || null,
        cover_image_url: INITIAL_BUSINESS_DATA.coverImageUrl || null,
        branding: INITIAL_BUSINESS_DATA.branding || null,
        hours: INITIAL_BUSINESS_DATA.hours,
        owner_id: userId,
        status: 'active',
      })
      .select('id')
      .single();

    logger.debug('[getBusinessData] Creación resultado:', { 
      success: !!newBiz, 
      businessId: newBiz?.id,
      error: createErr?.message 
    });

    if (createErr || !newBiz) {
      logger.error('[getBusinessData] Error al crear negocio:', createErr);
      throw new Error(createErr?.message || 'No se pudo crear negocio');
    }
    
    businessCacheByUser.set(userId, { businessId: newBiz.id });
    logger.debug('[getBusinessData] Negocio creado y cacheado:', newBiz.id);
    return buildBusinessObject(newBiz.id);
  },

  getBusinessByToken: async (token: string): Promise<Business | null> => {
    logger.debug('getBusinessByToken - token recibido:', token);
    try {
      // El tipo genérico debe coincidir con la estructura de la respuesta de la Edge Function,
      // que es { data: { business: Business } }
      type ValidateTokenResponse = {
        data?: {
          business?: Business;
        };
        error?: string;
      };

      const { data, error } = await supabase.functions.invoke<ValidateTokenResponse>('validate-public-token', {
        body: { token },
      });

      if (error) {
        logger.warn('getBusinessByToken - Edge Function error:', error.message);
        return null;
      }
      
      // Acceso corregido según la estructura anidada
      const business = data?.data?.business;

      if (!business) {
        logger.debug('getBusinessByToken - token inválido, expirado o la estructura de la respuesta es incorrecta', { responseData: data });
        return null;
      }

      return business;
    } catch (e) {
      logger.error('getBusinessByToken - error invocando validate-public-token:', e);
      return null;
    }
  },

  updateBusinessData: async (newData: Business): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    let businessId = cached?.businessId;
    if (!businessId) {
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', userId).maybeSingle();
      businessId = biz?.id;
    }
    if (!businessId) throw new Error('No business found for user');
    // Determinar acción: si no existe aún en Supabase, usar 'upsert'
    let action: 'update' | 'upsert' = 'update';
    try {
      const probe = await supabase
        .from('businesses')
        .select('id')
  .eq('id', businessId)
        .maybeSingle();
      if (!probe.data) action = 'upsert';
    } catch {
      action = 'upsert';
    }

    // Sanitizar campos de redes sociales antes de guardar
    const sanitizedWhatsapp = newData.whatsapp ? sanitizeWhatsappNumber(newData.whatsapp) : undefined;
    const sanitizedInstagram = newData.instagram ? sanitizeInstagramUsername(newData.instagram) : undefined;
    const sanitizedFacebook = newData.facebook ? sanitizeFacebookPage(newData.facebook) : undefined;

    // Solo guardar si el valor sanitizado no está vacío
    const finalWhatsapp = sanitizedWhatsapp && sanitizedWhatsapp.length > 0 ? sanitizedWhatsapp : undefined;
    const finalInstagram = sanitizedInstagram && sanitizedInstagram.length > 0 ? sanitizedInstagram : undefined;
    const finalFacebook = sanitizedFacebook && sanitizedFacebook.length > 0 ? sanitizedFacebook : undefined;

    const { data, error } = await supabase.functions.invoke('admin-businesses', {
      body: {
        action,
        data: {
          id: businessId,
          name: newData.name,
          description: newData.description,
          phone: newData.phone,
          whatsapp: finalWhatsapp,
          instagram: finalInstagram,
          facebook: finalFacebook,
          profile_image_url: newData.profileImageUrl,
          cover_image_url: newData.coverImageUrl,
          branding: newData.branding,
          hours: newData.hours,
          share_token: newData.shareToken,
          share_token_status: newData.shareTokenStatus,
          share_token_expires_at: newData.shareTokenExpiresAt,
        },
      },
    });

    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) return [];

    const business = await buildBusinessObject(businessId);
    return business.bookings.filter(b => b.date === dateString);
  },

  createBooking: async (newBookingData: Omit<Booking, 'id'>): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Crear booking
    const { data: newBooking, error: bookError } = await supabase
      .from('bookings')
      .insert({
        business_id: businessId,
        employee_id: newBookingData.employeeId,
        client_name: newBookingData.client.name,
        client_email: newBookingData.client.email,
        client_phone: newBookingData.client.phone,
        booking_date: newBookingData.date,
        start_time: newBookingData.start,
        end_time: newBookingData.end,
        status: newBookingData.status,
        notes: newBookingData.notes,
      })
      .select()
      .single();

    if (bookError || !newBooking) throw new Error(bookError?.message);

    // Insertar booking_services
    for (const svc of newBookingData.services) {
      await supabase.from('booking_services').insert({
        booking_id: newBooking.id,
        service_id: svc.id,
        service_name: svc.name,
        service_price: svc.price,
      });
    }

    return buildBusinessObject(businessId);
  },

  createBookingSafe: async (bookingData: {
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    business_id: string;
    service_ids: string[];
    client_id?: string; // ← NEW: Optional client_id for registered clients
  }) => {
    const { data, error } = await supabase.rpc('create_booking_safe', {
      p_employee_id: bookingData.employee_id,
      p_date: bookingData.date,
      p_start: bookingData.start_time,
      p_end: bookingData.end_time,
      p_client_name: bookingData.client_name,
      p_client_phone: bookingData.client_phone,
      p_client_email: bookingData.client_email || null,
      p_business_id: bookingData.business_id,
      p_service_ids: bookingData.service_ids,
      p_client_id: bookingData.client_id || null, // ← Pass client_id if provided
    });
    
    if (error) {
      const translatedMessage = ERROR_TRANSLATIONS[error.message] || error.message;
      const enrichedError = new Error(translatedMessage);
      enrichedError.name = 'BookingCreationError';
      (enrichedError as any).code = error.code;
      (enrichedError as any).details = error.details;
      (enrichedError as any).hint = error.hint;
      throw enrichedError;
    }
    return data;
  },

  updateBooking: async (updatedBooking: Booking): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    const { error } = await supabase
      .from('bookings')
      .update({
        employee_id: updatedBooking.employeeId,
        client_name: updatedBooking.client.name,
        client_email: updatedBooking.client.email,
        client_phone: updatedBooking.client.phone,
        booking_date: updatedBooking.date,
        start_time: updatedBooking.start,
        end_time: updatedBooking.end,
        status: updatedBooking.status,
        notes: updatedBooking.notes,
      })
      .eq('id', updatedBooking.id);

    if (error) throw new Error(error.message);

    return buildBusinessObject(businessId);
  },

  /**
   * Actualiza solo el status (y opcionalmente notes) de una reserva usando Edge Function (privilegios service_role)
   */
  updateBookingStatus: async (bookingId: string, status: string, _businessId: string, notes?: string): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');
    const { data, error } = await supabase.functions.invoke('admin-bookings', {
      body: {
        action: 'update',
        data: {
          id: bookingId,
          updates: {
            status,
            ...(typeof notes === 'string' ? { notes } : {}),
          },
        },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);
    return buildBusinessObject(businessId);
  },

  deleteBooking: async (bookingId: string): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');
    // Elimina físicamente usando Edge Function (borra booking_services por cascada)
    const { data, error } = await supabase.functions.invoke('admin-bookings', {
      body: {
        action: 'delete',
        data: { id: bookingId },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);
    return buildBusinessObject(businessId);
  },

  addEmployee: async (employee: Employee): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Verificar si ya existe un empleado con el mismo nombre
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id, name, archived')
      .eq('business_id', businessId)
      .ilike('name', employee.name)
      .limit(1);

    if (existingEmployees && existingEmployees.length > 0) {
      const existing = existingEmployees[0];
      
      if (existing.archived) {
        // Si está archivado, desarchivarlo y actualizar datos
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            archived: false,
            avatar_url: employee.avatarUrl,
            whatsapp: employee.whatsapp,
            hours: employee.hours,
          })
          .eq('id', existing.id);

        if (updateError) throw new Error('Error al restaurar el empleado archivado');
        return buildBusinessObject(businessId);
      } else {
        // Si ya existe y no está archivado, error
        throw new Error(`Ya existe un empleado con el nombre "${employee.name}"`);
      }
    }

    // Si no existe, crear nuevo
    const { data, error } = await supabase.functions.invoke('admin-employees', {
      body: {
        action: 'create',
        data: {
          business_id: businessId,
          name: employee.name,
          avatar_url: employee.avatarUrl,
          whatsapp: employee.whatsapp,
          hours: employee.hours,
        },
      },
    });
    
    if (error || data?.error) {
      const errorMsg = error?.message || data?.error;
      // Detectar unique constraint violation (código 23505)
      if (errorMsg.includes('23505') || errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('unique')) {
        throw new Error(`Ya existe un empleado con el nombre "${employee.name}"`);
      }
      throw new Error(errorMsg);
    }

    return buildBusinessObject(businessId);
  },

  updateEmployee: async (updatedEmployee: Employee): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');
    const { data, error } = await supabase.functions.invoke('admin-employees', {
      body: {
        action: 'update',
        data: {
          id: updatedEmployee.id,
          updates: {
            name: updatedEmployee.name,
            avatar_url: updatedEmployee.avatarUrl,
            whatsapp: updatedEmployee.whatsapp,
            hours: updatedEmployee.hours,
          },
        },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  deleteEmployee: async (employeeId: string): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Validar que no tenga reservas futuras confirmadas o pendientes
    const today = new Date().toISOString().split('T')[0];
    const { data: futureBookings } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('employee_id', employeeId)
      .gte('booking_date', today)
      .in('status', ['confirmed', 'pending'])
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      throw new Error('No se puede eliminar el empleado porque tiene reservas futuras confirmadas o pendientes.');
    }

    // Soft delete: marcar como archived
    const { error } = await supabase
      .from('employees')
      .update({ archived: true })
      .eq('id', employeeId);

    if (error) {
      throw new Error('Error al eliminar el empleado');
    }

    return buildBusinessObject(businessId);
  },

  addService: async (service: Service): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Validar que el servicio tenga al menos un empleado asignado
    if (!service.employeeIds || service.employeeIds.length === 0) {
      throw new Error('El servicio debe tener al menos un empleado asignado');
    }

    // Verificar si ya existe un servicio con el mismo nombre
    const { data: existingServices } = await supabase
      .from('services')
      .select('id, name, archived')
      .eq('business_id', businessId)
      .ilike('name', service.name)
      .limit(1);

    if (existingServices && existingServices.length > 0) {
      const existing = existingServices[0];
      
      if (existing.archived) {
        // Si está archivado, desarchivarlo y actualizar datos
        const { error: updateError } = await supabase
          .from('services')
          .update({
            archived: false,
            description: service.description,
            duration: service.duration,
            buffer: service.buffer,
            price: service.price,
            requires_deposit: service.requiresDeposit,
          })
          .eq('id', existing.id);

        if (updateError) throw new Error('Error al restaurar el servicio archivado');

        try {
          // Actualizar las relaciones con empleados
          // Primero eliminar relaciones existentes
          const { error: deleteError } = await supabase
            .from('service_employees')
            .delete()
            .eq('service_id', existing.id);

          if (deleteError) throw deleteError;

          // Luego insertar las nuevas
          if (service.employeeIds && service.employeeIds.length > 0) {
            const serviceEmployeeInserts = service.employeeIds.map(empId => ({
              service_id: existing.id,
              employee_id: empId,
            }));
            const { error: insertError } = await supabase
              .from('service_employees')
              .insert(serviceEmployeeInserts);

            if (insertError) throw insertError;
          }
        } catch (relationError) {
          // Rollback: volver a archivar el servicio
          await supabase
            .from('services')
            .update({ archived: true })
            .eq('id', existing.id);
          
          throw new Error('Error al actualizar relaciones de empleados del servicio');
        }

        return buildBusinessObject(businessId);
      } else {
        // Si ya existe y no está archivado, error
        throw new Error(`Ya existe un servicio con el nombre "${service.name}"`);
      }
    }

    // Si no existe, crear nuevo
    const { data, error } = await supabase.functions.invoke('admin-services', {
      body: {
        action: 'create',
        data: {
          business_id: businessId,
          name: service.name,
          description: service.description,
          duration: service.duration,
          buffer: service.buffer,
          price: service.price,
          requires_deposit: service.requiresDeposit,
          employee_ids: service.employeeIds,
        },
      },
    });
    
    if (error || data?.error) {
      const errorMsg = error?.message || data?.error;
      // Detectar unique constraint violation (código 23505)
      if (errorMsg.includes('23505') || errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('unique')) {
        throw new Error(`Ya existe un servicio con el nombre "${service.name}"`);
      }
      throw new Error(errorMsg);
    }

    return buildBusinessObject(businessId);
  },

  updateService: async (updatedService: Service): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');
    const { data, error } = await supabase.functions.invoke('admin-services', {
      body: {
        action: 'update',
        data: {
          id: updatedService.id,
          updates: {
            name: updatedService.name,
            description: updatedService.description,
            duration: updatedService.duration,
            buffer: updatedService.buffer,
            price: updatedService.price,
            requires_deposit: updatedService.requiresDeposit,
            employee_ids: updatedService.employeeIds,
          },
        },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  deleteService: async (serviceId: string): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Validar que no tenga reservas futuras confirmadas o pendientes
    const today = new Date().toISOString().split('T')[0];
    const { data: futureBookings } = await supabase
      .from('booking_services')
      .select('booking_id, bookings!inner(booking_date, status)')
      .eq('service_id', serviceId)
      .gte('bookings.booking_date', today)
      .in('bookings.status', ['confirmed', 'pending'])
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      throw new Error('No se puede eliminar el servicio porque tiene reservas futuras confirmadas o pendientes.');
    }

    // Soft delete: marcar como archived
    const { error } = await supabase
      .from('services')
      .update({ archived: true })
      .eq('id', serviceId);

    if (error) {
      throw new Error('Error al eliminar el servicio');
    }

    return buildBusinessObject(businessId);
  },

  // =====================================================
  // CLIENTS API - Clientes Recurrentes (Fase 2)
  // =====================================================

  /**
   * Crear un nuevo cliente
   * Validaciones:
   * - Teléfono único por business (constraint en DB)
   * - Nombre y teléfono obligatorios
   */
  createClient: async (clientData: {
    business_id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    tags?: string[];
  }) => {
    // Validaciones básicas
    if (!clientData.name?.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }
    if (!clientData.phone?.trim()) {
      throw new Error('El teléfono del cliente es obligatorio');
    }

    // Sanitizar datos
    const sanitizedData = {
      business_id: clientData.business_id,
      name: clientData.name.trim(),
      phone: clientData.phone.trim(),
      email: clientData.email?.trim() || null,
      notes: clientData.notes?.trim() || null,
      tags: clientData.tags || null,
    };

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        // Traducir errores comunes
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Ya existe un cliente con este teléfono en tu negocio');
        }
        throw new Error(error.message);
      }

      // Mapear a interfaz Client
      return {
        id: data.id,
        businessId: data.business_id,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        notes: data.notes || undefined,
        tags: data.tags || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      logger.error('Error creating client:', error);
      throw error;
    }
  },

  /**
   * Buscar clientes por nombre o teléfono
   * Usa full-text search para nombre y LIKE para teléfono
   * Target: < 500ms
   */
  searchClients: async (businessId: string, query: string) => {
    if (!query?.trim()) {
      // Si no hay query, retornar lista limitada de clientes recientes
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Error searching clients:', error);
        throw new Error('Error al buscar clientes');
      }

      return (data || []).map(client => ({
        id: client.id,
        businessId: client.business_id,
        name: client.name,
        phone: client.phone,
        email: client.email || undefined,
        notes: client.notes || undefined,
        tags: client.tags || undefined,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      }));
    }

    const searchTerm = query.trim();

    try {
      // Buscar por nombre (full-text) o teléfono (LIKE)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error searching clients:', error);
        throw new Error('Error al buscar clientes');
      }

      return (data || []).map(client => ({
        id: client.id,
        businessId: client.business_id,
        name: client.name,
        phone: client.phone,
        email: client.email || undefined,
        notes: client.notes || undefined,
        tags: client.tags || undefined,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      }));
    } catch (error: any) {
      logger.error('Error searching clients:', error);
      throw new Error('Error al buscar clientes');
    }
  },

  /**
   * Actualizar un cliente existente
   * Validaciones:
   * - Cliente pertenece al business (RLS policy)
   * - Teléfono único si se modifica
   */
  updateClient: async (clientId: string, updates: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    tags?: string[];
  }) => {
    // Sanitizar updates
    const sanitizedUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      sanitizedUpdates.name = updates.name.trim();
      if (!sanitizedUpdates.name) {
        throw new Error('El nombre del cliente no puede estar vacío');
      }
    }

    if (updates.phone !== undefined) {
      sanitizedUpdates.phone = updates.phone.trim();
      if (!sanitizedUpdates.phone) {
        throw new Error('El teléfono del cliente no puede estar vacío');
      }
    }

    if (updates.email !== undefined) {
      sanitizedUpdates.email = updates.email?.trim() || null;
    }

    if (updates.notes !== undefined) {
      sanitizedUpdates.notes = updates.notes?.trim() || null;
    }

    if (updates.tags !== undefined) {
      sanitizedUpdates.tags = updates.tags || null;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .update(sanitizedUpdates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        // Traducir errores comunes
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Ya existe un cliente con este teléfono en tu negocio');
        }
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Cliente no encontrado');
      }

      return {
        id: data.id,
        businessId: data.business_id,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        notes: data.notes || undefined,
        tags: data.tags || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      logger.error('Error updating client:', error);
      throw error;
    }
  },

  /**
   * Eliminar un cliente
   * Protección: No permite eliminar si tiene reservas futuras
   */
  deleteClient: async (clientId: string) => {
    try {
      // Validar que no tenga reservas futuras
      const today = new Date().toISOString().split('T')[0];
      const { data: futureBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', clientId)
        .gte('booking_date', today)
        .limit(1);

      if (bookingError) {
        logger.error('Error checking future bookings:', bookingError);
        throw new Error('Error al verificar reservas del cliente');
      }

      if (futureBookings && futureBookings.length > 0) {
        throw new Error('No se puede eliminar el cliente porque tiene reservas futuras');
      }

      // Eliminar cliente
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        logger.error('Error deleting client:', error);
        throw new Error('Error al eliminar el cliente');
      }
    } catch (error: any) {
      logger.error('Error in deleteClient:', error);
      throw error;
    }
  },

  loadDataForTests: () => {
    // No-op para compatibilidad con tests
  logger.debug('loadDataForTests: Not needed with Supabase');
  },

  // ===== CATEGORIES CRUD =====

  /**
   * Crear una nueva categoría
   */
  createCategory: async (payload: { name: string; icon: import('../types').CategoryIcon }): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Validar que no exista una categoría con el mismo nombre
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('business_id', businessId)
      .ilike('name', payload.name)
      .limit(1);

    if (existingCategories && existingCategories.length > 0) {
      throw new Error(`Ya existe una categoría con el nombre "${payload.name}"`);
    }

    // Crear categoría
    const { error } = await supabase
      .from('categories')
      .insert({
        business_id: businessId,
        name: payload.name.trim(),
        icon: payload.icon,
      });

    if (error) {
      logger.error('Error creating category:', error);
      throw new Error('Error al crear la categoría');
    }

    return buildBusinessObject(businessId);
  },

  /**
   * Actualizar una categoría
   */
  updateCategory: async (payload: { categoryId: string; name: string; icon: import('../types').CategoryIcon }): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Validar que no exista otra categoría con el mismo nombre
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('business_id', businessId)
      .ilike('name', payload.name)
      .neq('id', payload.categoryId)
      .limit(1);

    if (existingCategories && existingCategories.length > 0) {
      throw new Error(`Ya existe una categoría con el nombre "${payload.name}"`);
    }

    // Actualizar categoría
    const { error } = await supabase
      .from('categories')
      .update({
        name: payload.name.trim(),
        icon: payload.icon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.categoryId);

    if (error) {
      logger.error('Error updating category:', error);
      throw new Error('Error al actualizar la categoría');
    }

    return buildBusinessObject(businessId);
  },

  /**
   * Eliminar una categoría
   * Las relaciones en service_categories se eliminan automáticamente por cascada
   */
  deleteCategory: async (categoryId: string): Promise<Business> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Usuario no autenticado');
    const cached = businessCacheByUser.get(userId);
    const businessId = cached?.businessId;
    if (!businessId) throw new Error('No business ID found');

    // Eliminar categoría (las relaciones se eliminan por cascada)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      logger.error('Error deleting category:', error);
      throw new Error('Error al eliminar la categoría');
    }

    return buildBusinessObject(businessId);
  },

  /**
   * Actualiza en lote las categorías de un servicio específico.
   * Elimina todas las relaciones existentes y crea las nuevas.
   * Retorna los categoryIds actualizados para ese servicio.
   */
  updateServiceCategories: async (serviceId: string, categoryIds: string[]): Promise<string[]> => {
    // 1. Eliminar todas las categorías existentes para este servicio
    const { error: deleteError } = await supabase
      .from('service_categories')
      .delete()
      .eq('service_id', serviceId);

    if (deleteError) {
      logger.error('Error deleting existing service categories:', deleteError);
      throw new Error('Error al actualizar las categorías del servicio.');
    }

    // 2. Insertar las nuevas relaciones si hay alguna
    if (categoryIds.length > 0) {
      const newRelations = categoryIds.map(categoryId => ({
        service_id: serviceId,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from('service_categories')
        .insert(newRelations);

      if (insertError) {
        logger.error('Error inserting new service categories:', insertError);
        // NOTA: En un escenario real, aquí se debería implementar un rollback de la eliminación.
        // Por simplicidad, lanzamos el error. El servicio quedará sin categorías.
        throw new Error('Error al asignar las nuevas categorías al servicio.');
      }
    }

    // 3. Retornar el nuevo array de IDs para la actualización de estado local
    return categoryIds;
  },
};