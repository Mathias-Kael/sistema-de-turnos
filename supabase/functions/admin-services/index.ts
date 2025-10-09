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

    // Cliente con RLS
    const supabaseRls = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { action, data }: Payload = await req.json();

    // Para update/delete verificar existencia vía RLS (si no pertenece, RLS fallará en select)
    if (action === 'update' || action === 'delete') {
      const { data: existing, error: existingError } = await supabaseRls
        .from('services')
        .select('id')
        .eq('id', data.id)
        .single();
      if (existingError || !existing) {
        throw new Error('Service not found');
      }
    }

    let result;
    switch (action) {
      case 'create': {
        const { data: inserted, error } = await supabaseRls
          .from('services')
          .insert({
            business_id: data.business_id,
            name: data.name,
            description: data.description,
            duration: data.duration,
            buffer: data.buffer,
            price: data.price,
            requires_deposit: data.requires_deposit,
          })
          .select()
          .single();

        if (!error && inserted && data.employee_ids?.length) {
          for (const empId of data.employee_ids) {
            await supabaseRls.from('service_employees').insert({
              service_id: inserted.id,
              employee_id: empId,
            });
          }
        }
        result = { data: inserted, error };
        break;
      }
      case 'update': {
        const { data: updated, error } = await supabaseRls
          .from('services')
          .update({
            name: data.updates.name,
            description: data.updates.description,
            duration: data.updates.duration,
            buffer: data.updates.buffer,
            price: data.updates.price,
            requires_deposit: data.updates.requires_deposit,
          })
          .eq('id', data.id)
          .select()
          .single();

        if (!error) {
          await supabaseRls
            .from('service_employees')
            .delete()
            .eq('service_id', data.id);

          if (data.updates.employee_ids?.length) {
            for (const empId of data.updates.employee_ids) {
              await supabaseRls.from('service_employees').insert({
                service_id: data.id,
                employee_id: empId,
              });
            }
          }
        }
        result = { data: updated, error };
        break;
      }
      case 'delete': {
        const { error } = await supabaseRls
          .from('services')
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