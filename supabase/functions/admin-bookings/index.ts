// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
declare const Deno: any;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action: 'update' | 'delete';
  data: any; // { id: string, updates? }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) throw new Error('Unauthorized');

    // Cliente RLS
    const supabaseRls = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { action, data }: Payload = await req.json();

    // Validar existencia con RLS
    const { data: existing, error: existingError } = await supabaseRls
      .from('bookings')
      .select('id')
      .eq('id', data.id)
      .single();
    if (existingError || !existing) {
      throw new Error('Booking not found');
    }

    let result;
    switch (action) {
      case 'update': {
        const allowedFields: Record<string, boolean> = { status: true, notes: true };
        const updates: Record<string, any> = {};
        for (const key of Object.keys(data.updates || {})) {
          if (allowedFields[key]) updates[key] = data.updates[key];
        }
        if (Object.keys(updates).length === 0) {
          throw new Error('No valid fields to update');
        }
        const { data: updated, error } = await supabaseRls
          .from('bookings')
          .update(updates)
          .eq('id', data.id)
          .select()
          .single();
        result = { data: updated, error };
        break;
      }
      case 'delete': {
        // Eliminación física (borra dependencias booking_services por FK ON DELETE CASCADE)
        const { error } = await supabaseRls
          .from('bookings')
          .delete()
          .eq('id', data.id);
        result = { data: null, error };
        break;
      }
      default:
        throw new Error('Invalid action');
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
