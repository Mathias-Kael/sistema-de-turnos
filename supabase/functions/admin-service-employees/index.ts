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
  action: 'update';
  data: any; // { service_id: string, employee_ids: string[] }
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

    const supabaseRls = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { action, data }: Payload = await req.json();

    if (action !== 'update') {
      throw new Error('Invalid action');
    }

    // 1. Verificar que el servicio exista (RLS garantiza ownership)
    const { data: svc, error: svcError } = await supabaseRls
      .from('services')
      .select('id')
      .eq('id', data.service_id)
      .single();
    if (svcError || !svc) {
      throw new Error('Service not found');
    }

    // 2. Eliminar relaciones actuales
    const { error: delError } = await supabaseRls
      .from('service_employees')
      .delete()
      .eq('service_id', data.service_id);

    if (delError) {
      return new Response(JSON.stringify({ error: delError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Insertar nuevas relaciones
    if (Array.isArray(data.employee_ids) && data.employee_ids.length > 0) {
      const rows = data.employee_ids.map((empId: string) => ({
        service_id: data.service_id,
        employee_id: empId,
      }));
      const { error: insError } = await supabaseRls
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