import { test, expect } from '@playwright/test';

/**
 * E2E Security Tests for RLS Migration 20251010204643
 * 
 * Tests que validan:
 * 1. Public INSERT directo está bloqueado (seguridad)
 * 2. Public SELECT via share_token funciona
 * 3. Public booking via Edge Function funciona
 * 4. Admin CRUD con authenticated user funciona
 * 5. Cross-tenant protection
 */

test.describe('RLS Security: Public Access', () => {
  test('should block direct public INSERT to bookings', async ({ page }) => {
    // Setup: Obtener anon key y crear cliente Supabase público
    await page.goto('http://localhost:5173');
    
    // Pasar variables de entorno al contexto del navegador
    const result = await page.evaluate(async ([url, key]) => {
      // @ts-ignore - supabase está en window
      const { createClient } = window.supabase;
      const supabase = createClient(url, key);
      
      // Intentar INSERT directo (debería fallar)
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          business_id: 'test-business-id',
          employee_id: 'test-employee-id',
          client_name: 'Hacker',
          client_phone: '+123456789',
          booking_date: '2025-10-15',
          start_time: '10:00',
          end_time: '10:30',
          status: 'confirmed'
        });
      
      return { data, error: error?.message };
    }, [process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY]);
    
    // Verificar que el INSERT fue bloqueado por RLS
    expect(result.data).toBeNull();
    expect(result.error).toContain('row-level security');
  });
  
  test('should allow public SELECT with valid share_token', async ({ page }) => {
    // TODO: Requiere negocio con share_token en DB
    await page.goto('http://localhost:5173');
    
    const result = await page.evaluate(async ([url, key]) => {
      // @ts-ignore
      const { createClient } = window.supabase;
      const supabase = createClient(url, key);
      
      // SELECT de negocio compartido (debería funcionar)
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('share_token_status', 'active')
        .limit(1)
        .maybeSingle();
      
      return { hasData: !!data, error: error?.message };
    }, [process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY]);
    
    // Verificar que el SELECT funcionó
    expect(result.error).toBeUndefined();
    // Si hay negocios con token activo, debería retornar data
    // Si no hay, es OK (devmode sin datos)
  });
});

test.describe('RLS Security: Authenticated Access', () => {
  test.skip('should allow owner to UPDATE their own business', async ({ page }) => {
    // TODO: Requiere auth setup completo
    // Este test requiere:
    // 1. Usuario autenticado en la sesión
    // 2. Negocio con owner_id = auth.uid()
    // 3. JWT válido en headers
    
    await page.goto('http://localhost:5173');
    
    // Login (implementar según flujo real)
    // await page.fill('[data-testid="email"]', 'owner@example.com');
    // await page.fill('[data-testid="password"]', 'password123');
    // await page.click('[data-testid="login-btn"]');
    
    // Esperar autenticación
    // await page.waitForSelector('[data-testid="admin-view"]');
    
    const result = await page.evaluate(async ([url, key]) => {
      // @ts-ignore
      const { createClient } = window.supabase;
      const supabase = createClient(url, key);
      
      // Obtener sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: 'Not authenticated' };
      
      // Obtener business del owner
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();
      
      if (!business) return { error: 'No business found' };
      
      // Intentar UPDATE (debería funcionar)
      const { data, error } = await supabase
        .from('businesses')
        .update({ name: 'Updated Name Test' })
        .eq('id', business.id)
        .select()
        .single();
      
      return { success: !!data, error: error?.message };
    }, [process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY]);
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
  
  test.skip('should block owner from accessing other owner business', async ({ page }) => {
    // TODO: Requiere 2 usuarios con negocios diferentes
    // Test de cross-tenant protection
    
    await page.goto('http://localhost:5173');
    
    // Login como Owner A
    // const ownerA_businessId = 'business-a-id';
    
    // Intentar UPDATE de business de Owner B
    const result = await page.evaluate(async ([url, key]) => {
      // @ts-ignore
      const { createClient } = window.supabase;
      const supabase = createClient(url, key);
      
      // ID de negocio que NO pertenece al usuario actual
      const otherBusinessId = 'other-owner-business-id';
      
      // Intentar UPDATE (debería fallar silenciosamente)
      const { data, error } = await supabase
        .from('businesses')
        .update({ name: 'Hacked!' })
        .eq('id', otherBusinessId)
        .select();
      
      return { 
        rowsAffected: data?.length || 0, 
        error: error?.message 
      };
    }, [process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY]);
    
    // Verificar que no se modificó nada
    expect(result.rowsAffected).toBe(0);
  });
});

test.describe('RLS Security: Edge Functions', () => {
  test.skip('should allow public booking via Edge Function', async ({ request }) => {
    // TODO: Requiere Edge Function deployada y token válido
    
    const response = await request.post(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/public-bookings`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || ''
        },
        data: {
          token: 'valid-share-token',
          services: [{ id: 'service-id' }],
          date: '2025-10-15',
          start: '10:00',
          end: '10:30',
          employeeId: 'employee-id',
          client: {
            name: 'Test Cliente',
            phone: '+54912345678'
          }
        }
      }
    );
    
    const result = await response.json();
    
    // Verificar que el Edge Function pudo hacer INSERT
    expect(response.ok()).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBeDefined();
  });
});

/**
 * MANUAL TESTING CHECKLIST
 * 
 * Estos tests requieren setup manual en Supabase:
 * 
 * [ ] 1. Crear usuario test: test-owner@example.com
 * [ ] 2. Crear business con owner_id = test-owner user_id
 * [ ] 3. Crear share_token activo para ese business
 * [ ] 4. Crear servicios y empleados para ese business
 * [ ] 5. Deploy Edge Function public-bookings
 * [ ] 6. Actualizar .env.test con credenciales
 * 
 * Luego ejecutar:
 * npm run test:e2e -- security-rls.spec.ts
 */
