import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { loading, user, session } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="session">{session ? 'Has session' : 'No session'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();

    // Default mock implementation
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('should handle valid session on mount', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      access_token: 'valid-token',
      refresh_token: 'valid-refresh',
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });
  });

  it('should handle no session on mount', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });
  });

  it('should clear session on invalid refresh token error', async () => {
    const invalidTokenError = new AuthError('Invalid Refresh Token: Refresh Token Not Found');
    invalidTokenError.status = 400;

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: invalidTokenError,
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    // Verify signOut was called to clear invalid tokens
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('should handle token expired error', async () => {
    const expiredTokenError = new AuthError('Token has expired');
    expiredTokenError.status = 400;

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: expiredTokenError,
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('should handle SIGNED_IN event after email confirmation', async () => {
    let authChangeCallback: ((event: string, session: any) => void) | null = null;

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    // Simulate email confirmation and sign in
    const newSession = {
      user: { id: '123', email: 'test@example.com' },
      access_token: 'new-token',
      refresh_token: 'new-refresh',
    };

    if (authChangeCallback) {
      act(() => {
        authChangeCallback('SIGNED_IN', newSession);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });
  });

  it('should handle TOKEN_REFRESHED failure', async () => {
    let authChangeCallback: ((event: string, session: any) => void) | null = null;

    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      access_token: 'valid-token',
      refresh_token: 'valid-refresh',
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      };
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });

    // Simulate token refresh failure
    if (authChangeCallback) {
      act(() => {
        authChangeCallback('TOKEN_REFRESHED', null);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('should handle SIGNED_OUT event', async () => {
    let authChangeCallback: ((event: string, session: any) => void) | null = null;

    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      access_token: 'valid-token',
      refresh_token: 'valid-refresh',
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      };
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('Has session');
    });

    // Simulate sign out
    if (authChangeCallback) {
      act(() => {
        authChangeCallback('SIGNED_OUT', null);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    // signOut should NOT be called on SIGNED_OUT to prevent loops
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('should handle initialization errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (supabase.auth.getSession as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error initializing auth:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should unsubscribe on unmount', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('No session');
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
