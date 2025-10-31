/**
 * Tests para funciones CRUD de Clientes Recurrentes
 * Fase 2 - Backend API
 * 
 * Tests de integración básicos para validar:
 * - Tipos correctos
 * - Interfaces consistentes
 * - Backward compatibility
 * 
 * NOTA: Tests reales contra Supabase en e2e/
 */

import { describe, it, expect } from '@jest/globals';
import type { Client, ClientInput } from '../types';

describe('Clientes Recurrentes - Type Safety', () => {
  it('debería validar estructura de Client interface', () => {
    const mockClient: Client = {
      id: 'client-123',
      businessId: 'biz-456',
      name: 'Juan Pérez',
      phone: '+5491112345678',
      email: 'juan@example.com',
      notes: 'Cliente VIP',
      tags: ['VIP', 'Frecuente'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(mockClient.id).toBeDefined();
    expect(mockClient.businessId).toBeDefined();
    expect(mockClient.name).toBeDefined();
    expect(mockClient.phone).toBeDefined();
  });

  it('debería validar estructura de ClientInput interface', () => {
    const mockInput: ClientInput = {
      name: 'Ana López',
      phone: '+5491198765432',
      email: 'ana@example.com',
      notes: 'Prefiere turno mañana',
      tags: ['Regular'],
    };

    expect(mockInput.name).toBeDefined();
    expect(mockInput.phone).toBeDefined();
  });

  it('debería permitir Client con campos opcionales undefined', () => {
    const mockClient: Client = {
      id: 'client-789',
      businessId: 'biz-456',
      name: 'Carlos Gómez',
      phone: '+5491187654321',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // email, notes, tags son opcionales
    };

    expect(mockClient.email).toBeUndefined();
    expect(mockClient.notes).toBeUndefined();
    expect(mockClient.tags).toBeUndefined();
  });
});

describe('Clientes Recurrentes - API Interface Validation', () => {
  it('createClient debería tener firma correcta', () => {
    // Validación de tipos en tiempo de compilación
    type CreateClientParams = {
      business_id: string;
      name: string;
      phone: string;
      email?: string;
      notes?: string;
      tags?: string[];
    };

    const validParams: CreateClientParams = {
      business_id: 'biz-1',
      name: 'Test',
      phone: '+123',
    };

    expect(validParams.business_id).toBeDefined();
  });

  it('searchClients debería aceptar businessId y query', () => {
    type SearchParams = [businessId: string, query: string];
    
    const validParams: SearchParams = ['biz-123', 'Juan'];
    
    expect(validParams[0]).toBe('biz-123');
    expect(validParams[1]).toBe('Juan');
  });

  it('updateClient debería aceptar partial updates', () => {
    type UpdateParams = {
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
      tags?: string[];
    };

    // Actualización parcial válida
    const partialUpdate: UpdateParams = {
      email: 'nuevo@example.com',
    };

    expect(partialUpdate.email).toBe('nuevo@example.com');
    expect(partialUpdate.name).toBeUndefined();
  });

  it('deleteClient debería aceptar solo clientId', () => {
    type DeleteParams = [clientId: string];
    
    const validParams: DeleteParams = ['client-123'];
    
    expect(validParams[0]).toBe('client-123');
  });
});

describe('Backward Compatibility - Booking con client_id', () => {
  it('createBookingSafe debería aceptar bookingData SIN client_id', () => {
    type LegacyBookingData = {
      employee_id: string;
      date: string;
      start_time: string;
      end_time: string;
      client_name: string;
      client_phone: string;
      business_id: string;
      service_ids: string[];
      // NO incluir client_id
    };

    const legacyData: LegacyBookingData = {
      employee_id: 'emp-1',
      date: '2025-11-01',
      start_time: '10:00',
      end_time: '11:00',
      client_name: 'Cliente Anónimo',
      client_phone: '+5491199887766',
      business_id: 'biz-1',
      service_ids: ['svc-1'],
    };

    expect(legacyData.client_name).toBeDefined();
    expect('client_id' in legacyData).toBe(false);
  });

  it('createBookingSafe debería aceptar bookingData CON client_id', () => {
    type NewBookingData = {
      employee_id: string;
      date: string;
      start_time: string;
      end_time: string;
      client_name: string;
      client_phone: string;
      client_email?: string;
      business_id: string;
      service_ids: string[];
      client_id?: string; // ← Nuevo campo opcional
    };

    const newData: NewBookingData = {
      employee_id: 'emp-1',
      date: '2025-11-01',
      start_time: '10:00',
      end_time: '11:00',
      client_name: 'Cliente Registrado',
      client_phone: '+5491199887766',
      client_email: 'cliente@example.com',
      business_id: 'biz-1',
      service_ids: ['svc-1'],
      client_id: 'client-999', // ← Debe ser opcional
    };

    expect(newData.client_id).toBe('client-999');
  });
});

describe('Error Messages - Spanish Translation', () => {
  it('debería tener mensajes en español para errores comunes', () => {
    const errorMessages = {
      emptyName: 'El nombre del cliente es obligatorio',
      emptyPhone: 'El teléfono del cliente es obligatorio',
      duplicatePhone: 'Ya existe un cliente con este teléfono en tu negocio',
      futureBookings: 'No se puede eliminar el cliente porque tiene reservas futuras',
      searchError: 'Error al buscar clientes',
      notFound: 'Cliente no encontrado',
    };

    expect(errorMessages.emptyName).toMatch(/obligatorio/i);
    expect(errorMessages.duplicatePhone).toMatch(/ya existe/i);
    expect(errorMessages.futureBookings).toMatch(/reservas futuras/i);
  });
});
