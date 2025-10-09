import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  action?: 'update' | 'upsert' | 'create';
  data: any;
  businessId?: string; // opcional para creación
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

    const { action: rawAction, data, businessId }: Payload = await req.json();

    const action = rawAction || 'update';

    if (!data || typeof data !== 'object') {
      throw new Error('Missing data payload');
    }

    // Validaciones básicas
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Missing name');
    }

    // Id que intentaremos usar / asegurar
    const targetId = data.id || businessId; // preferimos id explícito

    if (!targetId) {
      throw new Error('Missing business id for operation');
    }

    if (businessId && data.id && businessId !== data.id) {
      throw new Error('businessId mismatch');
    }

    // Obtener si existe actualmente
    const { data: existingRows, error: selectError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', targetId);

    if (selectError) {
      throw new Error('Select failed: ' + selectError.message);
    }

    const exists = Array.isArray(existingRows) && existingRows.length > 0;

    if (action === 'create' || (action === 'upsert' && !exists) || (action === 'update' && !exists)) {
      // Crear nuevo registro
      const { error: insertError } = await supabaseAdmin
        .from('businesses')
        .insert({
          id: targetId,
          name: data.name,
          description: data.description ?? '',
          phone: data.phone ?? null,
          profile_image_url: data.profile_image_url ?? null,
          cover_image_url: data.cover_image_url ?? null,
          branding: data.branding ?? null,
          hours: data.hours ?? null,
          share_token: data.share_token ?? null,
          share_token_status: data.share_token_status ?? null,
          share_token_expires_at: data.share_token_expires_at ?? null,
          status: 'active',
        });
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, operation: 'created', id: targetId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' || action === 'upsert') {
      const { error: updateError } = await supabaseAdmin
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
        .eq('id', targetId);
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, operation: 'updated', id: targetId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});