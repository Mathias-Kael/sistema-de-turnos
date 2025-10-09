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
  action?: 'update' | 'upsert' | 'create';
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

    // Validación JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) throw new Error('Unauthorized');

    // Cliente con RLS usando el JWT del usuario
    const supabaseRls = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

  const { action: rawAction, data }: Payload = await req.json();

    const action = rawAction || 'update';

    if (!data || typeof data !== 'object') {
      throw new Error('Missing data payload');
    }

    // Validaciones básicas
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Missing name');
    }

  // Id objetivo (puede venir del payload)
  const targetId = data.id;
  if (!targetId) throw new Error('Missing business id for operation');
  if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('Missing name');

    // Obtener si existe actualmente
    const { data: existingRows, error: selectError } = await supabaseRls
      .from('businesses')
      .select('id')
      .eq('id', targetId);

    if (selectError) {
      throw new Error('Select failed: ' + selectError.message);
    }

    const exists = Array.isArray(existingRows) && existingRows.length > 0;

    if (action === 'create' || (action === 'upsert' && !exists) || (action === 'update' && !exists)) {
      // Crear nuevo registro
      const { error: insertError } = await supabaseRls
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
          owner_id: userData.user.id,
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
      const { error: updateError } = await supabaseRls
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