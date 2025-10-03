import { mockBackend } from './mockBackend';
import { INITIAL_BUSINESS_DATA } from '../constants';
import { Business } from '../types';

// Helper para clonar
const clone = <T,>(d: T): T => JSON.parse(JSON.stringify(d));

describe('Migración businessId', () => {
  const STORAGE_KEY = 'businessData';
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('agrega businessId faltantes a employees, services y bookings (incluyendo services internos)', async () => {
    // 1. Crear estado legacy sin businessId en entidades
    const legacy: Business = clone(INITIAL_BUSINESS_DATA);

    // Eliminar businessId de employees, services y bookings (si hubiese)
    legacy.employees = legacy.employees.map(({ businessId, ...rest }: any) => ({ ...rest }));
    legacy.services = legacy.services.map(({ businessId, ...rest }: any) => ({ ...rest }));
    legacy.bookings = [
      {
        id: 'legacy-booking-1',
        client: { name: 'Legacy', email: '', phone: '' },
        date: '2030-01-01',
        start: '10:00',
        end: '10:30',
        services: [
          { id: 's1', name: 'Servicio Legacy', price: 10 }, // sin businessId
        ],
        employeeId: legacy.employees[0].id,
        status: 'confirmed'
      }
    ] as any;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    // 2. Forzar recarga del backend (trigger loadState + migración)
    mockBackend.loadDataForTests();

    // 3. Obtener estado migrado
    const migrated = await mockBackend.getBusinessData();

    // 4. Validaciones
    expect(warnSpy).toHaveBeenCalledWith('[MIGRATION] Se añadieron businessId faltantes a entidades.');

    migrated.employees.forEach(e => expect(e.businessId).toBe(migrated.id));
    migrated.services.forEach(s => expect(s.businessId).toBe(migrated.id));
    migrated.bookings.forEach(b => {
      expect(b.businessId).toBe(migrated.id);
      b.services.forEach(s => expect(s.businessId).toBe(migrated.id));
    });
  });
});
