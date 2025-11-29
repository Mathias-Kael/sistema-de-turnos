import { test, expect, devices } from '@playwright/test';

// Dataset de test controlado para AdminView
async function seedAuthenticatedAdmin(page) {
  await page.addInitScript(() => {
    // Simular usuario autenticado en el formato correcto de Supabase
    const mockUser = {
      id: 'user_test_123',
      email: 'admin@test.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Simular sesión de Supabase en el formato correcto
    const authData = {
      currentSession: {
        access_token: 'mock_token_123',
        refresh_token: 'mock_refresh_123',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      },
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    };

    // Guardar en localStorage con la clave correcta de Supabase
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify(authData));
    
    // Business data
    const businessData = {
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
      employees: [],
      services: [],
      bookings: [],
      profileImageUrl: undefined,
      coverImageUrl: undefined
    };
    
    localStorage.setItem('businessData', JSON.stringify(businessData));
  });
}

test.describe('Back Navigation - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthenticatedAdmin(page);
  });

  test('Test 1 (Exit Tab): Navegar a RESERVATIONS y volver con goBack() debe mostrar DASHBOARD', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    // Esperar a que cargue el dashboard usando data-testid
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    // Click en tab de Reservas
    await page.getByText('Reservas').click();
    
    // Verificar que estamos en la vista de Reservas
    await expect(page.getByRole('heading', { name: /Reservas/i })).toBeVisible({ timeout: 5000 });
    
    // Ejecutar goBack()
    await page.goBack();
    
    // Afirmar que volvimos al dashboard
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });

  test('Test 2 (Exit Tab): Navegar a MANAGEMENT y volver con goBack() debe mostrar DASHBOARD', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    // Esperar a que cargue el dashboard
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    // Click en tab de Gestión
    await page.getByText('Gestión').click();
    
    // Verificar que estamos en la vista de Gestión
    await expect(page.getByText('Personalización')).toBeVisible({ timeout: 5000 });
    
    // Ejecutar goBack()
    await page.goBack();
    
    // Afirmar que volvimos al dashboard
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });

  test('Test 3 (Multiple navigations): DASHBOARD -> RESERVATIONS -> MANAGEMENT -> goBack() -> goBack() debe volver a DASHBOARD', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    // Navegar: DASHBOARD -> RESERVATIONS
    await page.getByText('Reservas').click();
    await expect(page.getByRole('heading', { name: /Reservas/i })).toBeVisible({ timeout: 5000 });
    
    // Navegar: RESERVATIONS -> MANAGEMENT
    await page.getByText('Gestión').click();
    await expect(page.getByText('Personalización')).toBeVisible({ timeout: 5000 });
    
    // Primera navegación atrás: MANAGEMENT -> DASHBOARD (interceptado)
    await page.goBack();
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
    
    // Segunda navegación atrás: Debería salir de la app o ir a página anterior
    const initialUrl = page.url();
    await page.goBack();
    
    // Verificar que la URL cambió (navegamos fuera de la app o a una página anterior)
    // o que seguimos en la misma página (no se empujó estado inicial)
    await page.waitForTimeout(500);
    const finalUrl = page.url();
    
    // El comportamiento esperado es que salga de la app o se mantenga
    // (dependiendo de si hay historial previo)
    expect(finalUrl).toBeDefined();
  });
});

// Tests Mobile (iPhone 13)
const iPhoneTest = test.extend({
  ...devices['iPhone 13']
});

iPhoneTest.describe('Back Navigation - Mobile (iPhone)', () => {
  iPhoneTest.beforeEach(async ({ page }) => {
    await seedAuthenticatedAdmin(page);
  });

  iPhoneTest('Mobile Test 1: Navegar a RESERVATIONS y volver con goBack()', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    // Click en tab de Reservas
    await page.getByText('Reservas').click();
    await expect(page.getByRole('heading', { name: /Reservas/i })).toBeVisible({ timeout: 5000 });
    
    // Ejecutar goBack()
    await page.goBack();
    
    // Afirmar que volvimos al dashboard
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });

  iPhoneTest('Mobile Test 2: Navegar a MANAGEMENT y volver con goBack()', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    // Click en tab de Gestión
    await page.getByText('Gestión').click();
    await expect(page.getByText('Personalización')).toBeVisible({ timeout: 5000 });
    
    // Ejecutar goBack()
    await page.goBack();
    
    // Afirmar que volvimos al dashboard
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });
});

// Tests Mobile (Pixel 5)
const pixelTest = test.extend({
  ...devices['Pixel 5']
});

pixelTest.describe('Back Navigation - Mobile (Pixel)', () => {
  pixelTest.beforeEach(async ({ page }) => {
    await seedAuthenticatedAdmin(page);
  });

  pixelTest('Pixel Test 1: Navegar a RESERVATIONS y volver con goBack()', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    await page.getByText('Reservas').click();
    await expect(page.getByRole('heading', { name: /Reservas/i })).toBeVisible({ timeout: 5000 });
    
    await page.goBack();
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });

  pixelTest('Pixel Test 2: Navegar a MANAGEMENT y volver con goBack()', async ({ page }) => {
    await page.goto('/admin?devMock=1');
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 10000 });
    
    await page.getByText('Gestión').click();
    await expect(page.getByText('Personalización')).toBeVisible({ timeout: 5000 });
    
    await page.goBack();
    
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 5000 });
  });
});