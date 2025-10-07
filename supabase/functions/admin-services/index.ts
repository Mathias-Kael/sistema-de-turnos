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

    if (action === 'update' || action === 'delete') {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('services')
        .select('business_id')
        .eq('id', data.id)
        .single();
      if (existingError || !existing) {
        throw new Error('Service not found');
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
            await supabaseAdmin.from('service_employees').insert({
              service_id: inserted.id,
              employee_id: empId,
            });
          }
        }
        result = { data: inserted, error };
        break;
      }
      case 'update': {
        const { data: updated, error } = await supabaseAdmin
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
          await supabaseAdmin
            .from('service_employees')
            .delete()
            .eq('service_id', data.id);

          if (data.updates.employee_ids?.length) {
            for (const empId of data.updates.employee_ids) {
              await supabaseAdmin.from('service_employees').insert({
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
        const { error } = await supabaseAdmin
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