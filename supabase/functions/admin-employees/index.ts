import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action: 'create' | 'update' | 'delete';
  data: any;
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

    // Defensa en profundidad: validar ownership para update/delete
    if (action === 'update' || action === 'delete') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('employees')
        .select('business_id')
        .eq('id', data.id)
        .single();
      if (existingError || !existing) {
        throw new Error('Employee not found');
      }
      if (existing.business_id !== businessId) {
        throw new Error('Unauthorized: Resource does not belong to business');
      }
    }

    let result;
    switch (action) {
      case 'create': {
        if (data.business_id !== businessId) {
          throw new Error('business_id mismatch');
        }
        const { data: inserted, error } = await supabaseAdmin
          .from('employees')
          .insert({
            business_id: data.business_id,
            name: data.name,
            avatar_url: data.avatar_url,
            whatsapp: data.whatsapp,
            hours: data.hours,
          })
          .select()
          .single();
        result = { data: inserted, error };
        break;
      }
      case 'update': {
        const { data: updated, error } = await supabaseAdmin
          .from('employees')
          .update({
            name: data.updates.name,
            avatar_url: data.updates.avatar_url,
            whatsapp: data.updates.whatsapp,
            hours: data.updates.hours,
          })
            .eq('id', data.id)
          .select()
          .single();
        result = { data: updated, error };
        break;
      }
      case 'delete': {
        const { error } = await supabaseAdmin
          .from('employees')
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