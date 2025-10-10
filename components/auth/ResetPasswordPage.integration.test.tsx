import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

// Mock AuthContext used by ResetPasswordPage
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Mock StyleInjector to avoid CSS variable injection side-effects in JSDOM
jest.mock('../common/StyleInjector', () => ({
  StyleInjector: ({ children }: any) => <>{children}</>,
}));

// Supabase client mock
const getSessionMock = jest.fn();
const verifyOtpMock = jest.fn();
const exchangeCodeForSessionMock = jest.fn();
const setSessionMock = jest.fn();
const updateUserMock = jest.fn();
const signOutMock = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => getSessionMock(...args),
      verifyOtp: (...args: any[]) => verifyOtpMock(...args),
      exchangeCodeForSession: (...args: any[]) => exchangeCodeForSessionMock(...args),
      setSession: (...args: any[]) => setSessionMock(...args),
      updateUser: (...args: any[]) => updateUserMock(...args),
      signOut: (...args: any[]) => signOutMock(...args),
    },
  },
}));

describe('ResetPasswordPage integration (verifyOtp 403 double-run guard)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Simular que al inicio no hay sesión
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });
    // verifyOtp devuelve error 403 (p.ej. segunda invocación) sin data
    verifyOtpMock.mockResolvedValue({ data: { session: null }, error: { status: 403, message: 'forbidden' } });
    // Luego de verifyOtp, la app consulta getSession; simulamos que sí hay sesión (ya creada por primer render/otra pestaña)
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'at', user: { id: 'u1' } } }, error: null });
    updateUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    signOutMock.mockResolvedValue({ error: null });
  });

  it('permite continuar si verifyOtp falla con 403 pero la sesión existe al chequear', async () => {
    // Configurar URL simulando token_hash y type=recovery
    const initialEntries = ['/reset-password?type=recovery&token_hash=mockhash'];

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    // Esperar a que la página deje de estar en "Cargando…"
    await waitFor(() => {
      expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument();
    });

    // Debería mostrar el formulario (no un error bloqueante)
    expect(screen.getByText(/Restablecer contraseña/i)).toBeInTheDocument();

    // Completar y enviar formulario
    const pwd = screen.getByLabelText(/Nueva contraseña/i);
    const confirm = screen.getByLabelText(/Confirmar contraseña/i);
    fireEvent.change(pwd, { target: { value: 'Abcdefg1' } });
    fireEvent.change(confirm, { target: { value: 'Abcdefg1' } });

    const submit = screen.getByRole('button', { name: /Guardar nueva contraseña/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalled();
    });

    // signOut debe ejecutarse luego de actualizar
    expect(signOutMock).toHaveBeenCalled();
  });
});
