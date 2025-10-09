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
  action: 'create' | 'update' | 'delete';
  data: any;
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

    // Validaciones con RLS para update/delete
    if (action === 'update' || action === 'delete') {
      const { data: existing, error: existingError } = await supabaseRls
        .from('employees')
        .select('id')
        .eq('id', data.id)
        .single();
      if (existingError || !existing) {
        throw new Error('Employee not found');
      }
    }

    let result;
    switch (action) {
      case 'create': {
        const { data: inserted, error } = await supabaseRls
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
        const { data: updated, error } = await supabaseRls
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
        const { error } = await supabaseRls
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