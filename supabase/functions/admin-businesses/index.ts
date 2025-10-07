import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action: 'update';
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

    if (data.id !== businessId) {
      throw new Error('businessId mismatch');
    }

    // Confirmar que el negocio existe (defensa en profundidad)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();
    if (existingError || !existing) {
      throw new Error('Business not found');
    }

    if (action !== 'update') {
      throw new Error('Invalid action');
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        name: data.name,
        description: data.description,
        phone: data.phone,
        profile_image_url: data.profile_image_url,
        cover_image_url: data.cover_image_url,
        branding: data.branding,
        hours: data.hours,
        share_token: data.share_token,
        share_token_status: data.share_token_status,
        share_token_expires_at: data.share_token_expires_at,
      })
      .eq('id', data.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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