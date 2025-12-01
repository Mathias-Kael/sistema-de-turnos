import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno esperadas para correr este test contra instancia real
const SUPABASE_URL = process.env.E2E_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY as string;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[public-booking-flow.spec] Falta configuración E2E_SUPABASE_URL/E2E_SUPABASE_ANON_KEY; el test se marcará como skipped.');
}
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function seedBusiness({ numEmployees = 1, servicesSetup = [] }: { numEmployees?: number, servicesSetup?: { name: string, assignedTo: number[] }[] }) {
  if (!supabase) return null;

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

  const employeeIds: string[] = [];
  for (let i = 0; i < numEmployees; i++) {
    const { data: emp, error: empErr } = await supabase.from('employees').insert({ business_id: biz.id, name: `Empleado ${i + 1}`, whatsapp: '123456789', hours }).select('id').single();
    if (empErr || !emp) throw empErr || new Error(`No se pudo crear empleado ${i + 1}`);
    employeeIds.push(emp.id);
  }

  for (const serviceDef of servicesSetup) {
    const { data: svc, error: svcErr } = await supabase.from('services').insert({ business_id: biz.id, name: serviceDef.name, duration: 30, price: 1000 }).select('id').single();
    if (svcErr || !svc) throw svcErr || new Error(`No se pudo crear servicio ${serviceDef.name}`);
    for (const empIndex of serviceDef.assignedTo) {
      await supabase.from('service_employees').insert({ service_id: svc.id, employee_id: employeeIds[empIndex] });
    }
  }

  return { token: biz.share_token };
}

test.describe('Flujo público de reserva - Optimización UX', () => {
  test.skip(!supabase, 'Supabase no configurado para test público');

  test('Negocio unipersonal: salta selección de empleado y muestra banner', async ({ page }) => {
    const seed = await seedBusiness({
      numEmployees: 1,
      servicesSetup: [{ name: 'Corte de Pelo', assignedTo: [0] }]
    });
    await page.goto('/?token=' + seed!.token);

    await page.getByRole('heading', { name: 'Corte de Pelo' }).click();

    // ASERCIÓN: El selector de empleado NO debe estar visible
    await expect(page.getByText('¿Con quién prefieres tu turno?')).not.toBeVisible();

    // ASERCIÓN: El banner de auto-asignación SÍ debe estar visible
    await expect(page.getByText('Tu turno será con Empleado 1')).toBeVisible();
    await expect(page.getByText('Por favor, selecciona el día y la hora que prefieras.')).toBeVisible();
  });

  test('Selección de servicio resulta en 1 empleado: salta selección y muestra banner', async ({ page }) => {
    const seed = await seedBusiness({
      numEmployees: 2,
      servicesSetup: [
        { name: 'Corte de Pelo', assignedTo: [0, 1] }, // Empleado 1 y 2
        { name: 'Manicura', assignedTo: [0] }       // Solo Empleado 1
      ]
    });
    await page.goto('/?token=' + seed!.token);

    // Seleccionar ambos servicios. Solo Empleado 1 es elegible.
    await page.getByRole('heading', { name: 'Corte de Pelo' }).click();
    await page.getByRole('heading', { name: 'Manicura' }).click();

    // ASERCIÓN: El selector de empleado NO debe estar visible
    await expect(page.getByText('¿Con quién prefieres tu turno?')).not.toBeVisible();

    // ASERCIÓN: El banner de auto-asignación SÍ debe estar visible
    await expect(page.getByText('Tu turno será con Empleado 1')).toBeVisible();
  });

  test('Múltiples empleados elegibles: muestra selector de empleado', async ({ page }) => {
    const seed = await seedBusiness({
      numEmployees: 2,
      servicesSetup: [{ name: 'Corte de Pelo', assignedTo: [0, 1] }]
    });
    await page.goto('/?token=' + seed!.token);

    await page.getByRole('heading', { name: 'Corte de Pelo' }).click();

    // ASERCIÓN: El selector de empleado SÍ debe estar visible
    await expect(page.getByText('¿Con quién prefieres tu turno?')).toBeVisible();
    await expect(page.getByText('Cualquiera disponible')).toBeVisible();
    await expect(page.getByText('Empleado 1')).toBeVisible();
    await expect(page.getByText('Empleado 2')).toBeVisible();

    // ASERCIÓN: El banner de auto-asignación NO debe estar visible
    await expect(page.getByText('Tu turno será con')).not.toBeVisible();
  });
});
