import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Business, Booking, Service, Employee, Hours } from '../types';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { withRetryOrThrow } from '../utils/supabaseWrapper';

/**
 * SUPABASE BACKEND
 * 
 * Este archivo reemplaza mockBackend.ts pero mantiene la misma interfaz.
 * Migra de localStorage a base de datos real en Supabase.
 */

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
      .eq('business_id', businessId);
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
      .eq('business_id', businessId);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-services', userMessage: 'No se pudieron cargar servicios.' })) || [];

  // 4. Obtener bookings con sus services
  const bookingsData = (await withRetryOrThrow(async () => {
    const res = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services!inner(service_id, service_name, service_price)
      `)
      .eq('business_id', businessId)
      .eq('archived', false);
    return { data: res.data, error: res.error };
  }, { operationName: 'get-bookings', userMessage: 'No se pudieron cargar reservas.' })) || [];

  // Construir objeto Business
  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    description: bizData.description || '',
    phone: bizData.phone,
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
    services: (servicesData || []).map(s => ({
      id: s.id,
      businessId: s.business_id,
      name: s.name,
      description: s.description || '',
      duration: s.duration,
      buffer: s.buffer || 0,
      price: parseFloat(s.price),
      requiresDeposit: s.requires_deposit || false,
      employeeIds: s.service_employees.map((se: any) => se.employee_id),
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
      services: b.booking_services.map((bs: any) => ({
        id: bs.service_id,
        businessId: businessId,
        name: bs.service_name,
        price: parseFloat(bs.service_price),
      })),
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

async function migrateFromLocalStorage(): Promise<string | null> {
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

    // Guardar businessId en localStorage para futuras sesiones
    localStorage.setItem('supabase_business_id', businessId);
    
    // Marcar migración como completada
    localStorage.setItem('migration_completed', 'true');

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
    // Verificar si ya tenemos businessId
    let businessId = localStorage.getItem('supabase_business_id');

    // Si no existe, intentar migrar desde localStorage
    if (!businessId) {
      const migrationCompleted = localStorage.getItem('migration_completed');
      
      if (!migrationCompleted) {
        businessId = await migrateFromLocalStorage();
      }

      // Si aún no hay businessId, usar datos iniciales
      if (!businessId) {
        return INITIAL_BUSINESS_DATA;
      }
    }

    return buildBusinessObject(businessId);
  },

  getBusinessByToken: async (token: string): Promise<Business | null> => {
    logger.debug('getBusinessByToken - token recibido:', token);
    try {
      const data = await withRetryOrThrow(async () => {
        const res = await supabase
          .from('businesses')
          .select('id, share_token_status, share_token_expires_at')
          .eq('share_token', token)
          .eq('share_token_status', 'active')
          .eq('status', 'active')
          .single();
        return { data: res.data, error: res.error };
      }, { operationName: 'get-business-by-token', userMessage: 'No se pudo validar el enlace.' });

      if (!data) return null;
      if (data.share_token_status !== 'active') return null;
      if (data.share_token_expires_at) {
        const expiryDate = new Date(data.share_token_expires_at);
        if (expiryDate.getTime() < Date.now()) return null;
      }
      return buildBusinessObject(data.id);
    } catch (e) {
      logger.debug('getBusinessByToken - error tras retries:', e);
      return null;
    }
  },

  updateBusinessData: async (newData: Business): Promise<Business> => {
    // Determinar acción: si no existe aún en Supabase, usar 'upsert'
    let action: 'update' | 'upsert' = 'update';
    try {
      const probe = await supabase
        .from('businesses')
        .select('id')
        .eq('id', newData.id)
        .maybeSingle();
      if (!probe.data) action = 'upsert';
    } catch {
      action = 'upsert';
    }

    const { data, error } = await supabase.functions.invoke('admin-businesses', {
      body: {
        action,
        data: {
          id: newData.id,
          name: newData.name,
          description: newData.description,
          phone: newData.phone,
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

    // Guardar businessId si se creó
    if (action === 'upsert' && !localStorage.getItem('supabase_business_id')) {
      localStorage.setItem('supabase_business_id', newData.id);
    }

    return buildBusinessObject(newData.id);
  },

  getBookingsForDate: async (dateString: string): Promise<Booking[]> => {
    const businessId = localStorage.getItem('supabase_business_id');
    if (!businessId) return [];

    const business = await buildBusinessObject(businessId);
    return business.bookings.filter(b => b.date === dateString);
  },

  createBooking: async (newBookingData: Omit<Booking, 'id'>): Promise<Business> => {
    const businessId = localStorage.getItem('supabase_business_id');
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

  updateBooking: async (updatedBooking: Booking): Promise<Business> => {
    const businessId = localStorage.getItem('supabase_business_id');
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
  updateBookingStatus: async (bookingId: string, status: string, businessId: string, notes?: string): Promise<Business> => {
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
    const businessId = localStorage.getItem('supabase_business_id');
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
    const businessId = localStorage.getItem('supabase_business_id');
    if (!businessId) throw new Error('No business ID found');
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
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  updateEmployee: async (updatedEmployee: Employee): Promise<Business> => {
    const businessId = localStorage.getItem('supabase_business_id');
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
    const businessId = localStorage.getItem('supabase_business_id');
    if (!businessId) throw new Error('No business ID found');

    // Validar que no tenga reservas futuras
    const today = new Date().toISOString().split('T')[0];
    const { data: futureBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('employee_id', employeeId)
      .gte('booking_date', today)
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      throw new Error('No se puede eliminar el empleado porque tiene reservas futuras.');
    }

    // Eliminar employee (CASCADE eliminará service_employees)
    const { data, error } = await supabase.functions.invoke('admin-employees', {
      body: {
        action: 'delete',
        data: { id: employeeId },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  addService: async (service: Service): Promise<Business> => {
    const businessId = localStorage.getItem('supabase_business_id');
    if (!businessId) throw new Error('No business ID found');
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
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  updateService: async (updatedService: Service): Promise<Business> => {
    const businessId = localStorage.getItem('supabase_business_id');
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
    const businessId = localStorage.getItem('supabase_business_id');
    if (!businessId) throw new Error('No business ID found');

    // Validar que no tenga reservas futuras
    const today = new Date().toISOString().split('T')[0];
    const { data: futureBookings } = await supabase
      .from('booking_services')
      .select('booking_id, bookings!inner(booking_date)')
      .eq('service_id', serviceId)
      .gte('bookings.booking_date', today)
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      throw new Error('No se puede eliminar el servicio porque tiene reservas futuras.');
    }

    // Eliminar service (CASCADE eliminará service_employees)
    const { data, error } = await supabase.functions.invoke('admin-services', {
      body: {
        action: 'delete',
        data: { id: serviceId },
      },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);

    return buildBusinessObject(businessId);
  },

  loadDataForTests: () => {
    // No-op para compatibilidad con tests
  logger.debug('loadDataForTests: Not needed with Supabase');
  },
};