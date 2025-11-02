import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

export const config = {
  auth: {
    verifyJwt: false,
  },
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type BusinessRow = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  branding: unknown;
  hours: unknown;
  share_token: string | null;
  share_token_status: string;
  share_token_expires_at: string | null;
  status: string;
};

type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration: number;
  buffer: number | null;
  price: number | string;
  requires_deposit: boolean | null;
};

type EmployeeRow = {
  id: string;
  business_id: string;
  name: string;
  avatar_url: string | null;
  whatsapp: string | null;
  hours: unknown;
};

type BookingRow = {
  id: string;
  business_id: string;
  employee_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  archived: boolean;
};

type BookingServiceRow = {
  booking_id: string;
  service_id: string;
  service_name: string | null;
  service_price: number | string | null;
};

type ServiceEmployeeRow = {
  service_id: string;
  employee_id: string;
};

type CategoryRow = {
  id: string;
  business_id: string;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceCategoryRow = {
  service_id: string;
  category_id: string;
};

interface ValidateTokenRequest {
  token?: string;
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function success(payload: unknown): Response {
  return new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function transformBusiness(
  business: BusinessRow,
  employees: EmployeeRow[] | null,
  services: ServiceRow[] | null,
  serviceEmployees: ServiceEmployeeRow[] | null,
  bookings: BookingRow[] | null,
  bookingServices: BookingServiceRow[] | null,
  categories: CategoryRow[] | null,
  serviceCategories: ServiceCategoryRow[] | null
) {
  const employeesSafe = (employees ?? []).map((emp) => ({
    id: emp.id,
    businessId: emp.business_id,
    name: emp.name,
    avatarUrl: emp.avatar_url ?? '',
    whatsapp: emp.whatsapp,
    hours: emp.hours ?? null,
  }));

  const serviceEmployeeMap = new Map<string, string[]>();
  for (const rel of serviceEmployees ?? []) {
    if (!serviceEmployeeMap.has(rel.service_id)) {
      serviceEmployeeMap.set(rel.service_id, []);
    }
    serviceEmployeeMap.get(rel.service_id)!.push(rel.employee_id);
  }

  // Map de categoryIds por serviceId
  const serviceCategoryMap = new Map<string, string[]>();
  for (const rel of serviceCategories ?? []) {
    if (!serviceCategoryMap.has(rel.service_id)) {
      serviceCategoryMap.set(rel.service_id, []);
    }
    serviceCategoryMap.get(rel.service_id)!.push(rel.category_id);
  }

  const servicesSafe = (services ?? []).map((svc) => {
    const categoryIds = serviceCategoryMap.get(svc.id) ?? [];
    return {
      id: svc.id,
      businessId: svc.business_id,
      name: svc.name,
      description: svc.description ?? '',
      duration: svc.duration,
      buffer: svc.buffer ?? 0,
      price: Number(svc.price ?? 0),
      requiresDeposit: Boolean(svc.requires_deposit ?? false),
      employeeIds: serviceEmployeeMap.get(svc.id) ?? [],
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    };
  });

  const serviceMeta = new Map(
    servicesSafe.map((svc) => [svc.id, { name: svc.name, price: svc.price }])
  );

  const bookingServicesMap = new Map<string, BookingServiceRow[]>();
  for (const bs of bookingServices ?? []) {
    if (!bookingServicesMap.has(bs.booking_id)) {
      bookingServicesMap.set(bs.booking_id, []);
    }
    bookingServicesMap.get(bs.booking_id)!.push(bs);
  }

  const bookingsSafe = (bookings ?? [])
    .filter((booking) => !booking.archived)
    .map((booking) => {
      const relatedServices = bookingServicesMap.get(booking.id) ?? [];
      const servicesForBooking = relatedServices.map((svc) => {
        const meta = serviceMeta.get(svc.service_id);
        const rawPrice = svc.service_price;
        const parsedPrice = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice ?? 0);
        return {
          id: svc.service_id,
          businessId: business.id,
          name: svc.service_name && svc.service_name.trim().length > 0 ? svc.service_name : meta?.name ?? '',
          price: !Number.isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : meta?.price ?? 0,
        };
      });

      return {
        id: booking.id,
        businessId: booking.business_id,
        employeeId: booking.employee_id,
        client: {
          name: booking.client_name,
          email: booking.client_email,
          phone: booking.client_phone,
        },
        date: booking.booking_date,
        start: booking.start_time,
        end: booking.end_time,
        status: booking.status,
        notes: booking.notes,
        services: servicesForBooking,
      };
    });

  const categoriesSafe = (categories ?? []).map((cat) => ({
    id: cat.id,
    businessId: cat.business_id,
    name: cat.name,
    icon: cat.icon ?? undefined,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));

  return {
    id: business.id,
    name: business.name,
    description: business.description ?? '',
    phone: business.phone,
    whatsapp: business.whatsapp ?? undefined,
    instagram: business.instagram ?? undefined,
    facebook: business.facebook ?? undefined,
    profileImageUrl: business.profile_image_url,
    coverImageUrl: business.cover_image_url,
    branding: business.branding,
    hours: business.hours,
    shareToken: business.share_token,
    shareTokenStatus: business.share_token_status,
    shareTokenExpiresAt: business.share_token_expires_at,
    employees: employeesSafe,
    services: servicesSafe,
    categories: categoriesSafe,
    bookings: bookingsSafe,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ValidateTokenRequest = await req.json();
    
    // Log de diagnóstico: Ver el cuerpo completo de la solicitud
    console.log('validate-public-token: full request body', JSON.stringify(body, null, 2));

    const token = body?.token;

    if (!token || typeof token !== 'string') {
      console.error('validate-public-token: token is missing or not a string', { token });
      return badRequest('Missing token');
    }

    console.log('validate-public-token: incoming request', {
      tokenLength: token.length,
      tokenPreview: `${token.slice(0, 4)}...${token.slice(-4)}`,
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = Deno.env.get('SUPABASE_URL');
    const hasServiceRole = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('validate-public-token: environment check', {
      hasSupabaseUrl: Boolean(url),
      hasServiceRole,
    });

    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select(
        'id, name, description, phone, whatsapp, instagram, facebook, profile_image_url, cover_image_url, branding, hours, share_token, share_token_status, share_token_expires_at, status'
      )
      .eq('share_token', token)
      .single();

    if (bizError) {
      // Log de diagnóstico: Mostrar el error completo de la base de datos
      console.error('validate-public-token: business query failed', {
        message: bizError.message,
        details: bizError.details,
        hint: bizError.hint,
        code: bizError.code,
      });
    }

    console.log('validate-public-token: business lookup result', {
      found: Boolean(business),
      bizStatus: business?.status,
      shareTokenStatus: business?.share_token_status,
      hasExpiration: Boolean(business?.share_token_expires_at),
    });

    if (bizError || !business) {
      return unauthorized('Invalid token');
    }

    if (business.status !== 'active' || business.share_token_status !== 'active') {
      console.warn('validate-public-token: inactive business or share token', {
        bizStatus: business.status,
        shareTokenStatus: business.share_token_status,
      });
      return unauthorized('Booking link disabled');
    }
 
    if (business.share_token_expires_at) {
      const expires = new Date(business.share_token_expires_at);
      const expired = Number.isNaN(expires.getTime()) || expires.getTime() < Date.now();
      console.log('validate-public-token: expiration check', {
        expiresAt: business.share_token_expires_at,
        expiresTimestamp: expires.getTime(),
        expired,
        now: Date.now(),
      });
      if (expired) {
        return unauthorized('Booking link expired');
      }
    }

    const [employeesRes, servicesRes, bookingsRes, categoriesRes] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('id, business_id, name, avatar_url, whatsapp, hours')
        .eq('business_id', business.id)
        .eq('archived', false),
      supabaseAdmin
        .from('services')
        .select('id, business_id, name, description, duration, buffer, price, requires_deposit')
        .eq('business_id', business.id)
        .eq('archived', false),
      supabaseAdmin
        .from('bookings')
        .select('id, business_id, employee_id, client_name, client_email, client_phone, booking_date, start_time, end_time, status, notes, archived')
        .eq('business_id', business.id),
      supabaseAdmin
        .from('categories')
        .select('id, business_id, name, icon, created_at, updated_at')
        .eq('business_id', business.id),
    ]);

    const serviceIds = (servicesRes.data ?? []).map((svc: { id: string }) => svc.id);
    const [serviceEmployeesRes, serviceCategoriesRes] = await Promise.all([
      serviceIds.length
        ? supabaseAdmin
            .from('service_employees')
            .select('service_id, employee_id')
            .in('service_id', serviceIds)
        : { data: [] },
      serviceIds.length
        ? supabaseAdmin
            .from('service_categories')
            .select('service_id, category_id')
            .in('service_id', serviceIds)
        : { data: [] },
    ]);

    const bookingIds = (bookingsRes.data ?? [])
      .filter((b) => !b.archived)
      .map((b) => b.id);

    const bookingServicesRes = bookingIds.length
      ? await supabaseAdmin
          .from('booking_services')
          .select('booking_id, service_id, service_name, service_price')
          .in('booking_id', bookingIds)
      : { data: [] };

    const businessPayload = transformBusiness(
      business,
      employeesRes.data ?? [],
      servicesRes.data ?? [],
      serviceEmployeesRes.data ?? [],
      bookingsRes.data ?? [],
      bookingServicesRes.data ?? [],
      categoriesRes.data ?? [],
      serviceCategoriesRes.data ?? []
    );

    return success({ business: businessPayload });
  } catch (error) {
    console.error('validate-public-token error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
