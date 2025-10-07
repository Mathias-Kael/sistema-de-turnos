import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PublicClientLoader } from './PublicClientLoader';
import { supabase } from '../../lib/supabase';
import { supabaseBackend } from '../../services/supabaseBackend';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../../services/supabaseBackend', () => ({
  supabaseBackend: {
    getBusinessByToken: jest.fn()
  }
}));

const mockedFrom = (supabase.from as unknown as jest.Mock);
const mockedGetBusinessByToken = supabaseBackend.getBusinessByToken as jest.Mock;

function mockUrl(token: string | null) {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = { search: token ? `?token=${token}` : '' };
}

describe('PublicClientLoader', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    mockUrl('');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // silenciar logs verbose
  });
  afterEach(() => { logSpy.mockRestore(); });

  const baseBusiness = {
    id: 'biz1',
    name: 'Biz',
    description: '',
    phone: '123',
    profileImageUrl: '',
    coverImageUrl: '',
    branding: { primaryColor: '#000', secondaryColor: '#fff', textColor: '#111', font: 'Poppins' },
    hours: { monday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, tuesday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, wednesday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, thursday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, friday:{enabled:true,intervals:[{open:'09:00',close:'18:00'}]}, saturday:{enabled:false,intervals:[]}, sunday:{enabled:false,intervals:[]} },
    employees: [],
    services: [],
    bookings: [],
    shareToken: 'tok',
    shareTokenStatus: 'active',
    shareTokenExpiresAt: null,
  } as any;

  function mockSupabaseOnce(result: any) {
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve(result) }) }) })
    });
  }

  test('estado invalid cuando token no existe', async () => {
    mockUrl('missing');
    mockSupabaseOnce({ data: null, error: { message: 'not found' } });
    render(<PublicClientLoader />);
    await waitFor(() => {
      expect(screen.getByText(/Enlace Inválido/i)).toBeInTheDocument();
    });
  });

  test('estado paused', async () => {
    mockUrl('pausedTok');
    mockSupabaseOnce({ data: { id: 'biz1', share_token_status: 'paused', share_token_expires_at: null }, error: null });
    render(<PublicClientLoader />);
    await waitFor(() => {
      expect(screen.getByText(/Agenda Pausada/i)).toBeInTheDocument();
    });
  });

  test('estado expired', async () => {
    mockUrl('expTok');
    mockSupabaseOnce({ data: { id: 'biz1', share_token_status: 'active', share_token_expires_at: new Date(Date.now() - 1000).toISOString() }, error: null });
    render(<PublicClientLoader />);
    await waitFor(() => {
      expect(screen.getByText(/Enlace Inválido/i)).toBeInTheDocument();
    });
  });

  test('estado valid y renderiza negocio', async () => {
    mockUrl('valTok');
    mockSupabaseOnce({ data: { id: 'biz1', share_token_status: 'active', share_token_expires_at: null }, error: null });
    mockedGetBusinessByToken.mockResolvedValueOnce(baseBusiness);
    render(<PublicClientLoader />);
    await waitFor(() => {
      expect(screen.getByText(/Biz/)).toBeInTheDocument();
    });
  });
});
