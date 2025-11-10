import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import { useAuthStore } from '@/stores/auth.store';

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset the auth store before each test
    useAuthStore.getState().logout();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              emailVerified: true,
            },
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              expiresIn: 3600,
            },
          },
        }),
      });

      render(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for the login to complete
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
        });
      });

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });

    it('should show error message for invalid credentials', async () => {
      const user = userEvent.setup();

      // Mock failed API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      });

      render(<LoginPage />);

      // Fill in login form with invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Verify user is not authenticated
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should disable form inputs during login', async () => {
      const user = userEvent.setup();

      // Mock a slow API response
      global.fetch = vi.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: {
                      user: {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        emailVerified: true,
                      },
                      tokens: {
                        accessToken: 'mock-token',
                        refreshToken: 'mock-refresh',
                        expiresIn: 3600,
                      },
                    },
                  }),
                }),
              100
            )
          )
      );

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Check that inputs are disabled during loading
      await waitFor(() => {
        expect(emailInput.disabled).toBe(true);
        expect(passwordInput.disabled).toBe(true);
        expect(submitButton.disabled).toBe(true);
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });

      // Wait for login to complete
      await waitFor(
        () => {
          expect(useAuthStore.getState().isAuthenticated).toBe(true);
        },
        { timeout: 2000 }
      );
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock network error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear previous errors when submitting again', async () => {
      const user = userEvent.setup();

      // First attempt - fail
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpass');
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Clear inputs and try again with success
      await user.clear(emailInput);
      await user.clear(passwordInput);

      // Second attempt - success
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'correct@example.com',
              name: 'Test User',
              emailVerified: true,
            },
            tokens: {
              accessToken: 'mock-token',
              refreshToken: 'mock-refresh',
              expiresIn: 3600,
            },
          },
        }),
      });

      await user.type(emailInput, 'correct@example.com');
      await user.type(passwordInput, 'correctpass');
      await user.click(submitButton);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
      });

      // Should be authenticated
      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      });
    });
  });

  describe('Navigation', () => {
    it('should have a link to registration page', () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole('link', { name: /sign up/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should show FlagKit branding', () => {
      render(<LoginPage />);

      expect(screen.getByText('FlagKit')).toBeInTheDocument();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });
  });
});
