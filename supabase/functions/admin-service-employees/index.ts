import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action: 'update';
  data: any; // { service_id: string, employee_ids: string[] }
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

    // Validar que el service pertenece al negocio
    const { data: svc, error: svcError } = await supabaseAdmin
      .from('services')
      .select('business_id')
      .eq('id', data.service_id)
      .single();
    if (svcError || !svc) {
      throw new Error('Service not found');
    }
    if (svc.business_id !== businessId) {
      throw new Error('Unauthorized: Service does not belong to business');
    }

    if (action !== 'update') {
      throw new Error('Invalid action');
    }

    // 1. Eliminar relaciones actuales
    const { error: delError } = await supabaseAdmin
      .from('service_employees')
      .delete()
      .eq('service_id', data.service_id);

    if (delError) {
      return new Response(JSON.stringify({ error: delError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Insertar nuevas relaciones
    if (Array.isArray(data.employee_ids) && data.employee_ids.length > 0) {
      const rows = data.employee_ids.map((empId: string) => ({
        service_id: data.service_id,
        employee_id: empId,
      }));
      const { error: insError } = await supabaseAdmin
        .from('service_employees')
        .insert(rows);

      if (insError) {
        return new Response(JSON.stringify({ error: insError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});