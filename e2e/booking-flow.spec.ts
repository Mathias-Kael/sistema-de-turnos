import { test, expect } from '@playwright/test';

// Dataset de test controlado
const SERVICE_NAME = 'Servicio A';
const SERVICE_NO_EMPLOYEE_NAME = 'Servicio Fantasma';

async function seedDeterministicBusiness(page) {
  await page.addInitScript(({ data }) => {
    localStorage.clear();
    localStorage.setItem('businessData', JSON.stringify(data));
  }, { data: {
    id: 'biz_test',
    name: 'Biz Test',
    description: 'Negocio de prueba',
    phone: '1111111111',
    branding: {
      primaryColor: '#1a202c',
      secondaryColor: '#edf2f7',
      textColor: '#2d3748',
      font: "'Poppins', sans-serif"
    },
    hours: {
      monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
      tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
      wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
      thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
      friday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
      saturday: { enabled: true, intervals: [{ open: '10:00', close: '16:00' }] },
      sunday: { enabled: false, intervals: [] }
    },
    employees: [
      { id: 'e1', businessId: 'biz_test', name: 'Empleado 1', avatarUrl: '', hours: {
        monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        friday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        saturday: { enabled: true, intervals: [{ open: '10:00', close: '16:00' }] },
        sunday: { enabled: false, intervals: [] }
      } },
      { id: 'e2', businessId: 'biz_test', name: 'Empleado 2', avatarUrl: '', hours: {
        monday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        tuesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        wednesday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        thursday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        friday: { enabled: true, intervals: [{ open: '09:00', close: '18:00' }] },
        saturday: { enabled: true, intervals: [{ open: '10:00', close: '16:00' }] },
        sunday: { enabled: false, intervals: [] }
      } }
    ],
    services: [
      { id: 'sA', businessId: 'biz_test', name: SERVICE_NAME, description: 'Servicio principal', duration: 30, buffer: 0, price: 10, employeeIds: ['e1','e2'] },
      { id: 'sB', businessId: 'biz_test', name: 'Servicio B', description: 'Servicio B', duration: 30, buffer: 0, price: 10, employeeIds: ['e1'] },
      { id: 'sC', businessId: 'biz_test', name: 'Servicio C', description: 'Servicio C', duration: 30, buffer: 0, price: 10, employeeIds: ['e2'] }
    ],
    bookings: [],
    profileImageUrl: undefined,
    coverImageUrl: undefined
  }});
}

// Happy path: cliente reserva exitosamente
// Usamos el modo preview cliente (?client=1) que monta BusinessProvider local.
test.describe('Flujo de reserva', () => {

  test.beforeEach(async ({ page }) => {
    await seedDeterministicBusiness(page);
  });

  test('Happy path: reserva confirmada', async ({ page }) => {
  await page.goto('/?client=1&devMock=1');
    // Esperar lista de servicios
    await expect(page.getByRole('heading', { name: 'Elige tus servicios' })).toBeVisible();
    // Click en card por texto del servicio
  await expect(page.getByRole('heading', { name: SERVICE_NAME })).toBeVisible({ timeout: 10000 });
  await page.getByRole('heading', { name: SERVICE_NAME }).click();
  // Seleccionar "Cualquiera disponible"
  await page.getByText('Cualquiera disponible', { exact: false }).click();
  // Cambiar a mañana para asegurar disponibilidad completa
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowDay = String(tomorrow.getDate());
  // Click en número de día (calendar buttons muestran día numérico)
  // Seleccionar el botón de calendario cuyo texto exacto coincide con el día (evitar coincidencias parciales: 8 vs 18)
  await page.locator('div.grid button').filter({ hasText: new RegExp(`^${tomorrowDay}$`) }).first().click();
  // Esperar sección horarios
  await expect(page.getByRole('heading', { name: 'Elige un horario' })).toBeVisible();
  // Slots
  const firstSlot = page.getByRole('button', { name: /\d{2}:\d{2}/ }).first();
  await expect(firstSlot).toBeVisible({ timeout: 20000 });
    const slotText = await firstSlot.innerText();
    await firstSlot.click();
    // Modal
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.fill('#name', 'Test User');
    await page.fill('#phone', '1111111111');
  await page.getByRole('button', { name: 'Confirmar Reserva' }).click();
  const successDialog = page.getByRole('dialog');
  await expect(successDialog.getByText('¡Turno Confirmado!')).toBeVisible({ timeout: 10000 });
  await expect(successDialog.getByText(new RegExp(`a las ${slotText}`))).toBeVisible();
  });

  test('Error path: token expirado muestra mensaje', async ({ page }) => {
    // Simular token expirado en localStorage y acceder con token param
    await page.addInitScript(() => {
      const expired = {
        token: 'abc123',
        status: 'active',
        createdAt: Date.now() - 10000,
        expiresAt: Date.now() - 5000
      };
      localStorage.setItem('shareToken', JSON.stringify(expired));
    });
  await page.goto('/?token=abc123');
    await expect(page.getByText('Enlace Inválido o Expirado')).toBeVisible();
  });

  test('Edge case: combinación de servicios sin un empleado común', async ({ page }) => {
    await page.goto('/?client=1&devMock=1');
  await page.getByRole('heading', { name: 'Servicio B' }).click();
  await page.getByRole('heading', { name: 'Servicio C' }).click();
    await expect(page.getByText('No hay un único empleado que pueda realizar todos los servicios seleccionados', { exact: false })).toBeVisible();
  });
});
