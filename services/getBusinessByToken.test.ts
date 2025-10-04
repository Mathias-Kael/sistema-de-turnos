import { mockBackend } from './mockBackend';

interface ShareLink {
  token: string;
  status: 'active' | 'paused' | 'revoked';
  createdAt: number;
  expiresAt: number | null;
}

describe('mockBackend.getBusinessByToken', () => {
  beforeEach(() => {
    localStorage.clear();
    // Forzar recarga del estado interno usado por mockBackend
    mockBackend.loadDataForTests();
  });

  function storeLink(link: ShareLink) {
    localStorage.setItem('shareToken', JSON.stringify(link));
  }

  it('devuelve null si no hay shareToken en localStorage', async () => {
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).toBeNull();
  });

  it('devuelve null si el token no coincide', async () => {
    storeLink({ token: 'otro', status: 'active', createdAt: Date.now(), expiresAt: null });
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).toBeNull();
  });

  it('devuelve null si está expirado', async () => {
    storeLink({ token: 'abc', status: 'active', createdAt: Date.now() - 10000, expiresAt: Date.now() - 5000 });
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).toBeNull();
  });

  it('devuelve null si está revoked', async () => {
    storeLink({ token: 'abc', status: 'revoked', createdAt: Date.now(), expiresAt: null });
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).toBeNull();
  });

  it('devuelve el negocio si el token está activo', async () => {
    storeLink({ token: 'abc', status: 'active', createdAt: Date.now(), expiresAt: null });
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('biz_1');
  });

  it('devuelve el negocio si el token está pausado (la UI decidirá que mostrar)', async () => {
    storeLink({ token: 'abc', status: 'paused', createdAt: Date.now(), expiresAt: null });
    const result = await mockBackend.getBusinessByToken('abc');
    expect(result).not.toBeNull();
  });
});
