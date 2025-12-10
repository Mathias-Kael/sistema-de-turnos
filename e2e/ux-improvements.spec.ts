import { test, expect } from '@playwright/test';

/**
 * Tests E2E para las 3 mejoras UX de vista pública:
 * 1. Categorías de servicios no truncadas
 * 2. Modal fullscreen de descripción de servicios
 * 3. Modal de amplificación de foto empleado/espacio
 */

test.describe('Vista Pública - Mejoras UX', () => {
    test.beforeEach(async ({ page }) => {
        // Cargar vista pública con mock backend
        await page.goto('http://localhost:5173/?devMock=1&token=public-test-token');
        
        // Esperar a que cargue la vista
        await page.waitForSelector('text=Elige tus servicios', { timeout: 10000 });
    });

    test('Categorías de servicios muestran nombre completo sin truncar', async ({ page }) => {
        // Buscar un header de categoría
        const categoryHeader = page.locator('button:has-text("Servicios")').first();
        
        // Verificar que existe
        await expect(categoryHeader).toBeVisible();
        
        // Verificar que el texto no tiene ellipsis (no está truncado)
        const categoryTitle = categoryHeader.locator('h3').first();
        await expect(categoryTitle).not.toHaveCSS('text-overflow', 'ellipsis');
        
        // Verificar que usa break-words para mostrar texto completo
        const className = await categoryTitle.getAttribute('class');
        expect(className).toContain('break-words');
    });

    test('Modal de descripción de servicio se abre, muestra contenido completo y cierra correctamente', async ({ page }) => {
        // Expandir primera categoría si está colapsada
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        
        // Esperar a que se muestren servicios
        await page.waitForTimeout(500);
        
        // Buscar botón "Ver más" en un servicio
        const verMasButton = page.locator('button:has-text("Ver más")').first();
        
        // Si existe botón "Ver más", hacer click
        if (await verMasButton.isVisible()) {
            await verMasButton.click();
            
            // Verificar que modal se abre
            const modal = page.locator('[role="dialog"]').filter({ hasText: /descripción|servicio/i });
            await expect(modal).toBeVisible();
            
            // Verificar que muestra contenido completo
            await expect(modal).toContainText(/min|hora/i); // Duración
            await expect(modal).toContainText(/\$/); // Precio
            
            // Verificar botones del modal
            await expect(modal.locator('button:has-text("Cerrar")')).toBeVisible();
            await expect(modal.locator('button:has-text("Seleccionar servicio")')).toBeVisible();
            
            // Cerrar modal con botón "Cerrar"
            await modal.locator('button:has-text("Cerrar")').first().click();
            
            // Verificar que modal se cierra
            await expect(modal).not.toBeVisible();
        }
    });

    test('Modal de descripción se cierra con tecla Escape', async ({ page }) => {
        // Expandir primera categoría
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        // Abrir modal "Ver más" si existe
        const verMasButton = page.locator('button:has-text("Ver más")').first();
        if (await verMasButton.isVisible()) {
            await verMasButton.click();
            
            // Verificar que modal está abierto
            const modal = page.locator('[role="dialog"]').filter({ hasText: /descripción|servicio/i });
            await expect(modal).toBeVisible();
            
            // Presionar Escape
            await page.keyboard.press('Escape');
            
            // Verificar que modal se cierra
            await expect(modal).not.toBeVisible();
        }
    });

    test('Botón "Seleccionar servicio" en modal marca servicio como seleccionado', async ({ page }) => {
        // Expandir primera categoría
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        // Abrir modal "Ver más" si existe
        const verMasButton = page.locator('button:has-text("Ver más")').first();
        if (await verMasButton.isVisible()) {
            await verMasButton.click();
            
            // Verificar que modal está abierto
            const modal = page.locator('[role="dialog"]').filter({ hasText: /descripción|servicio/i });
            await expect(modal).toBeVisible();
            
            // Click en "Seleccionar servicio"
            await modal.locator('button:has-text("Seleccionar servicio")').click();
            
            // Verificar que modal se cierra
            await expect(modal).not.toBeVisible();
            
            // Verificar que servicio aparece seleccionado (tiene checkmark visible)
            // Esto depende de la implementación específica, ajustar selector según UI
            const selectedService = page.locator('[class*="border-primary"]').first();
            await expect(selectedService).toBeVisible();
        }
    });

    test('Modal de zoom de imagen se abre al hacer click en avatar de empleado', async ({ page }) => {
        // Primero seleccionar un servicio para ver empleados
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        // Seleccionar primer servicio
        const firstService = page.locator('[class*="border"]').filter({ hasText: /min/i }).first();
        await firstService.click();
        
        // Esperar a que aparezcan empleados
        await page.waitForSelector('text=/quién|empleado|espacio/i', { timeout: 5000 }).catch(() => {});
        
        // Buscar imagen de empleado (avatar)
        const employeeImage = page.locator('img[alt]:not([alt=""])').first();
        
        if (await employeeImage.isVisible()) {
            // Click en imagen
            await employeeImage.click();
            
            // Verificar que modal de zoom se abre
            const zoomModal = page.locator('[role="dialog"][aria-label*="imagen" i], [class*="zoom"]').first();
            
            // Verificar que modal está visible o que imagen se amplió
            // (puede usar diferentes estrategias según implementación)
            const isModalVisible = await zoomModal.isVisible().catch(() => false);
            const hasZoomOverlay = await page.locator('[class*="fixed"][class*="inset-0"]').count() > 0;
            
            expect(isModalVisible || hasZoomOverlay).toBeTruthy();
            
            // Cerrar modal con click en overlay o botón cerrar
            if (isModalVisible) {
                await zoomModal.click();
            } else {
                await page.locator('[class*="fixed"][class*="inset-0"]').first().click();
            }
            
            // Esperar a que modal se cierre
            await page.waitForTimeout(300);
        }
    });

    test('Modal de zoom se cierra con tecla Escape', async ({ page }) => {
        // Seleccionar servicio y llegar a empleados
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        const firstService = page.locator('[class*="border"]').filter({ hasText: /min/i }).first();
        await firstService.click();
        
        await page.waitForSelector('text=/quién|empleado|espacio/i', { timeout: 5000 }).catch(() => {});
        
        const employeeImage = page.locator('img[alt]:not([alt=""])').first();
        
        if (await employeeImage.isVisible()) {
            await employeeImage.click();
            
            // Esperar a que modal se abra
            await page.waitForTimeout(300);
            
            // Presionar Escape
            await page.keyboard.press('Escape');
            
            // Verificar que modal se cierra (overlay debe desaparecer)
            await page.waitForTimeout(300);
            const overlayCount = await page.locator('[class*="fixed"][class*="inset-0"]').filter({ has: page.locator('[role="dialog"]') }).count();
            expect(overlayCount).toBe(0);
        }
    });

    test('Navegación back del browser cierra modal de descripción', async ({ page }) => {
        // Expandir categoría y abrir modal
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        const verMasButton = page.locator('button:has-text("Ver más")').first();
        if (await verMasButton.isVisible()) {
            await verMasButton.click();
            
            // Verificar que modal está abierto
            const modal = page.locator('[role="dialog"]').filter({ hasText: /descripción|servicio/i });
            await expect(modal).toBeVisible();
            
            // Simular back button del navegador
            await page.goBack();
            
            // Verificar que modal se cierra
            await expect(modal).not.toBeVisible();
        }
    });

    test('Modal de zoom no cierra al hacer click en la imagen (solo en overlay)', async ({ page }) => {
        // Seleccionar servicio y llegar a empleados
        const firstCategory = page.locator('button').filter({ hasText: /servicios/i }).first();
        await firstCategory.click();
        await page.waitForTimeout(500);
        
        const firstService = page.locator('[class*="border"]').filter({ hasText: /min/i }).first();
        await firstService.click();
        
        await page.waitForSelector('text=/quién|empleado|espacio/i', { timeout: 5000 }).catch(() => {});
        
        const employeeImage = page.locator('img[alt]:not([alt=""])').first();
        
        if (await employeeImage.isVisible()) {
            await employeeImage.click();
            await page.waitForTimeout(300);
            
            // Click en la imagen ampliada (dentro del modal)
            const zoomedImage = page.locator('[role="dialog"] img, [class*="zoom"] img').first();
            if (await zoomedImage.isVisible()) {
                await zoomedImage.click();
                
                // Esperar un momento
                await page.waitForTimeout(300);
                
                // Verificar que modal sigue abierto (overlay sigue visible)
                const modalDialog = page.locator('[role="dialog"][aria-label*="imagen" i]');
                await expect(modalDialog).toBeVisible();
            }
        }
    });
});
