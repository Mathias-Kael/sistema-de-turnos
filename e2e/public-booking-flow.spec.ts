import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno esperadas para correr este test contra instancia real
const SUPABASE_URL = process.env.E2E_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY as string;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[public-booking-flow.spec] Falta configuración E2E_SUPABASE_URL/E2E_SUPABASE_ANON_KEY; el test se marcará como skipped.');
}
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function seedBusiness() {
  if (!supabase) return null;
  // Crear business con token activo
  const token = 'tk_e2e_public_' + Date.now();
  const hours = {
    monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    friday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
    saturday: { enabled: true, intervals: [{ open: '10:00', close: '16:00' }] },
    sunday: { enabled: false, intervals: [] }
  };
  const { data: biz, error: bizErr } = await supabase.from('businesses').insert({
    name: 'Public E2E', description: 'Test', phone: '123456789', branding: {
      primaryColor: '#1a202c', secondaryColor: '#edf2f7', textColor: '#2d3748', font: "'Poppins', sans-serif"
    }, hours, share_token: token, share_token_status: 'active'
  }).select('id, share_token').single();
  if (bizErr || !biz) throw bizErr || new Error('No se pudo crear business');
  // Crear employees + service
  const { data: emp, error: empErr } = await supabase.from('employees').insert({ business_id: biz.id, name: 'Empleado Público', whatsapp: '123456789', hours }).select('id').single();
  if (empErr || !emp) throw empErr || new Error('No se pudo crear empleado');
  const { data: svc, error: svcErr } = await supabase.from('services').insert({ business_id: biz.id, name: 'Servicio Público', duration: 30, buffer: 0, price: 1000, requires_deposit: false }).select('id').single();
  if (svcErr || !svc) throw svcErr || new Error('No se pudo crear servicio');
  await supabase.from('service_employees').insert({ service_id: svc.id, employee_id: emp.id });
  return { businessId: biz.id, token: biz.share_token, serviceId: svc.id, employeeId: emp.id };
}

// Test principal
test.describe('Flujo público de reserva (Edge Function)', () => {
  test.skip(!supabase, 'Supabase no configurado para test público');

  test('Reserva pública genera booking y booking_services con datos completos', async ({ page }) => {
    const seed = await seedBusiness();
    expect(seed).not.toBeNull();
    const { token, businessId, serviceId, employeeId } = seed!;

    // Visitar la app en modo público con token
    await page.goto('/?token=' + token);
    await expect(page.getByText('Elige tus servicios')).toBeVisible();
    // Seleccionar servicio
    await page.getByRole('heading', { name: 'Servicio Público' }).click();
    // Seleccionar empleado (cualquiera disponible si UI lo muestra, si no tomar el existente)
    await page.getByText('Cualquiera disponible', { exact: false }).click();
    // Elegir mañana para asegurar disponibilidad
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate());
    await page.locator('div.grid button').filter({ hasText: new RegExp('^' + day + '$') }).first().click();
    await expect(page.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible();
    const firstSlot = page.getByRole('button', { name: /\d{2}:\d{2}/ }).first();
    await firstSlot.click();
    // Modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.fill('#name', 'Cliente Público');
    await page.fill('#phone', '55555555');
    await page.getByRole('button', { name: 'Confirmar Reserva' }).click();
    await expect(page.getByText('¡Turno Confirmado!')).toBeVisible({ timeout: 10000 });

    // Verificar en BD: booking + booking_services con service_name y service_price poblados
    // Pequeña espera para que la función termine (ms)
    await new Promise(r => setTimeout(r, 500));
    const { data: bookings } = await supabase!.from('bookings').select('id').eq('business_id', businessId).limit(1);
    expect(bookings && bookings.length).toBeGreaterThan(0);
    const bookingId = bookings![0].id;
    const { data: bsRows } = await supabase!.from('booking_services').select('service_name, service_price').eq('booking_id', bookingId);
    expect(bsRows && bsRows.length).toBeGreaterThan(0);
    expect(bsRows![0].service_name).toBeTruthy();
    expect(Number(bsRows![0].service_price)).toBeGreaterThan(0);
  });
});
