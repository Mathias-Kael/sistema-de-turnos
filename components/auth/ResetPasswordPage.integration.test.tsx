import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Supabase client mock
const updateUserMock = jest.fn();
const signOutMock = jest.fn();
const onAuthStateChangeMock = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: any[]) => updateUserMock(...args),
      signOut: (...args: any[]) => signOutMock(...args),
      onAuthStateChange: (...args: any[]) => onAuthStateChangeMock(...args),
    },
  },
}));

describe('ResetPasswordPage Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    updateUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    signOutMock.mockResolvedValue({ error: null });
  });

  it('muestra el formulario cuando el evento PASSWORD_RECOVERY se dispara', async () => {
    let callback: (event: string, session: any) => void = () => {};
    onAuthStateChangeMock.mockImplementation((cb) => {
      callback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    // Simular el evento de Supabase
    act(() => {
      callback('PASSWORD_RECOVERY', {});
    });

    await waitFor(() => {
      expect(screen.getByText('Restablecer tu contraseña')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Enlace inválido/i)).not.toBeInTheDocument();
  });

  it('muestra un error si el evento no es de recuperación', async () => {
    let callback: (event: string, session: any) => void = () => {};
    onAuthStateChangeMock.mockImplementation((cb) => {
      callback = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    // Simular un evento diferente
    act(() => {
      callback('SIGNED_OUT', null);
    });

    // Avanzar los timers para que el fallback se ejecute
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
    });
  });
});
