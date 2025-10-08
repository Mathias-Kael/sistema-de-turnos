import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action: 'update' | 'delete';
  data: any; // { id: string, updates? }
  businessId: string;
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

    const { action, data, businessId }: Payload = await req.json();

    if (!businessId) {
      throw new Error('Missing businessId');
    }

    // Validar pertenencia del booking
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('business_id')
      .eq('id', data.id)
      .single();
    if (existingError || !existing) {
      throw new Error('Booking not found');
    }
    if (existing.business_id !== businessId) {
      throw new Error('Unauthorized: Resource does not belong to business');
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
        const { data: updated, error } = await supabaseAdmin
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
        const { error } = await supabaseAdmin
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
