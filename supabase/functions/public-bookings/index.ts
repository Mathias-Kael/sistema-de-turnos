// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string,string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface BookingRequestService { id: string; }
interface BookingRequestBody {
  token: string;
  services: BookingRequestService[];
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;   // HH:MM
  employeeId: string; // already selected/assigned on client prior to call
  client: { 
    name: string; 
    phone: string; 
    email?: string;
    id?: string; // ← NEW: Optional client_id for registered clients
  };
  notes?: string;
}

function isValidTime(t: string) { return /^([0-1]\d|2[0-3]):[0-5]0$|^([0-1]\d|2[0-3]):[0-5]\d$/.test(t); }
function isValidDate(d: string) { return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)); }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') throw new Error('Method not allowed');
    const body: BookingRequestBody = await req.json();
    if (!body.token) throw new Error('Missing token');
    if (!body.services?.length) throw new Error('Missing services');
    if (!isValidDate(body.date)) throw new Error('Invalid date');
    if (!isValidTime(body.start) || !isValidTime(body.end)) throw new Error('Invalid time');
    if (!body.client?.name || !body.client?.phone) throw new Error('Missing client info');
    if (!body.employeeId) throw new Error('Missing employeeId');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Validate business by token
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id, share_token_status, share_token_expires_at')
      .eq('share_token', body.token)
      .eq('status', 'active')
      .single();
    if (bizErr || !biz) throw new Error('Invalid token');
    if (biz.share_token_status !== 'active') throw new Error('Booking disabled');
    if (biz.share_token_expires_at) {
      const exp = new Date(biz.share_token_expires_at).getTime();
      if (Date.now() > exp) throw new Error('Token expired');
    }

    const businessId = biz.id;

    // 2. Validate services exist & belong to business; gather duration & buffer
    const serviceIds = body.services.map(s => s.id);
    const { data: svcRows, error: svcErr } = await supabaseAdmin
      .from('services')
      .select('id, name, price, duration, buffer, business_id')
      .in('id', serviceIds);
    if (svcErr) throw new Error('Service lookup failed');
    if (!svcRows || svcRows.length !== serviceIds.length) throw new Error('Some services not found');
    if (svcRows.some(s => s.business_id !== businessId)) throw new Error('Service mismatch');

    // 3. Compute total duration
    const totalDuration = svcRows.reduce((acc, s) => acc + s.duration + (s.buffer || 0), 0);

    // 4. Check overlapping bookings for employee
    const { data: existingBookings, error: bookErr } = await supabaseAdmin
      .from('bookings')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .eq('employee_id', body.employeeId)
      .eq('booking_date', body.date)
      .eq('archived', false);
    if (bookErr) throw new Error('Booking lookup failed');

    const startMinutes = toMinutes(body.start);
    const endMinutes = toMinutes(body.end);
    if (endMinutes - startMinutes !== totalDuration) {
      throw new Error('Duration mismatch');
    }
    if (existingBookings?.some(b => overlaps(startMinutes, endMinutes, toMinutes(b.start_time), toMinutes(b.end_time)))) {
      throw new Error('Slot no longer available');
    }

    // 5. Insert booking
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        business_id: businessId,
        employee_id: body.employeeId,
        client_name: body.client.name,
        client_email: body.client.email || null,
        client_phone: body.client.phone,
        client_id: body.client.id || null, // ← NEW: Associate with registered client if provided
        booking_date: body.date,
        start_time: body.start,
        end_time: body.end,
        status: 'confirmed',
        notes: body.notes || null,
        archived: false
      })
      .select('id')
      .single();
    if (insErr || !inserted) throw new Error('Insert failed');

    // 6. Insert booking_services rows
    // Mapear detalles para nombre y precio
    const svcMap = new Map<string, { name: string; price: number }>(
      (svcRows || []).map((s: any) => [s.id, { name: s.name, price: Number(s.price) }])
    );
    for (const svcId of serviceIds) {
      const meta = svcMap.get(svcId) || { name: '', price: 0 };
      await supabaseAdmin.from('booking_services').insert({
        booking_id: inserted.id,
        service_id: svcId,
        service_name: meta.name,
        service_price: meta.price,
      });
    }

    return new Response(JSON.stringify({ data: { id: inserted.id } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function toMinutes(t: string) { const [h,m] = t.split(':').map(Number); return h*60 + m; }
function overlaps(aStart:number,aEnd:number,bStart:number,bEnd:number) { return aStart < bEnd && aEnd > bStart; }
