import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientView } from './ClientView';
import { BusinessProvider } from '../../context/BusinessContext';
import { mockBackend } from '../../services/mockBackend';
import { ShareLink } from '../../types';

jest.mock('../../services/mockBackend');

const mockedBackend = mockBackend as jest.Mocked<typeof mockBackend>;

describe('ClientView (modo token)', () => {
  const originalLocation = window.location;
  beforeAll(() => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { ...originalLocation, search: '' };
  });
  afterAll(() => {
    Object.defineProperty(window, 'location', { value: originalLocation });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  function setTokenInUrl(token: string) {
    // @ts-ignore
    window.location.search = `?token=${token}`;
  }

  test('muestra loading y luego error si backend devuelve null', async () => {
    setTokenInUrl('abc');
    mockedBackend.getBusinessByToken.mockResolvedValueOnce(null as any);

    render(
      <BusinessProvider>
        <ClientView />
      </BusinessProvider>
    );

    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Link inválido/i)).toBeInTheDocument();
    });
  });

  test('carga business cuando token válido', async () => {
    setTokenInUrl('valid123');
    // Simular enlace shareToken en localStorage
    const link: ShareLink = { token: 'valid123', status: 'active', createdAt: Date.now(), expiresAt: null };
    localStorage.setItem('shareToken', JSON.stringify(link));

    mockedBackend.getBusinessByToken.mockResolvedValueOnce({
      id: 'biz_1',
      name: 'Negocio Test',
      description: 'Desc',
      phone: '123',
      branding: { primaryColor: '#000', secondaryColor: '#fff', textColor: '#111', font: 'Poppins' },
      employees: [],
      services: [],
      hours: { monday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, tuesday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, wednesday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, thursday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, friday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, saturday:{enabled:false,intervals:[]}, sunday:{enabled:false,intervals:[]} },
      bookings: []
    } as any);

    render(
      <BusinessProvider>
        <ClientView />
      </BusinessProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Negocio Test/)).toBeInTheDocument();
    });
  });
});
