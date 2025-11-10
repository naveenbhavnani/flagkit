import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrganizationStore } from '@/stores/organization.store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Organization Management Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset organization store
    useOrganizationStore.setState({
      organizations: [],
      currentOrganization: null,
      isLoading: false,
      error: null,
    });

    // Mock localStorage with auth token
    localStorageMock.setItem('flagkit_access_token', 'mock-token');
    localStorageMock.setItem('flagkit_refresh_token', 'mock-refresh');
    localStorageMock.setItem(
      'flagkit_user',
      JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
      })
    );

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Organization Creation', () => {
    it('should successfully create organization', async () => {
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-organization',
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        logoUrl: null,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organization: mockOrganization,
          },
        }),
      });

      const result = await useOrganizationStore.getState().createOrganization({
        name: 'Test Organization',
        slug: 'test-organization',
      });

      expect(result).toEqual(mockOrganization);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/organizations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({
            name: 'Test Organization',
            slug: 'test-organization',
          }),
        })
      );
    });

    it('should handle API errors during creation', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'SLUG_EXISTS',
            message: 'An organization with this slug already exists',
          },
        }),
      });

      const result = await useOrganizationStore.getState().createOrganization({
        name: 'Test Org',
        slug: 'existing-slug',
      });

      expect(result).toBeNull();
      expect(useOrganizationStore.getState().error).toBe('An organization with this slug already exists');
    });
  });

  describe('Organization Listing', () => {
    it('should load organizations successfully', async () => {
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Organization 1',
          slug: 'org-1',
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          logoUrl: null,
          _count: {
            members: 5,
            projects: 3,
          },
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          slug: 'org-2',
          subscriptionTier: 'pro',
          subscriptionStatus: 'active',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          logoUrl: null,
          _count: {
            members: 10,
            projects: 8,
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organizations: mockOrganizations,
          },
        }),
      });

      await useOrganizationStore.getState().loadOrganizations();

      const store = useOrganizationStore.getState();
      expect(store.organizations).toEqual(mockOrganizations);
      expect(store.isLoading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/organizations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: Response) => void;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValueOnce(promise);

      const loadPromise = useOrganizationStore.getState().loadOrganizations();

      // Check loading state
      expect(useOrganizationStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          success: true,
          data: { organizations: [] },
        }),
      } as Response);

      await loadPromise;

      // Loading should be done
      expect(useOrganizationStore.getState().isLoading).toBe(false);
    });
  });

  describe('Organization Updates', () => {
    it('should successfully update organization', async () => {
      const updatedOrg = {
        id: 'org-123',
        name: 'Updated Name',
        slug: 'updated-slug',
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        logoUrl: null,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organization: updatedOrg,
          },
        }),
      });

      const result = await useOrganizationStore.getState().updateOrganization('org-123', {
        name: 'Updated Name',
        slug: 'updated-slug',
      });

      expect(result).toEqual(updatedOrg);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/organizations/org-123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({
            name: 'Updated Name',
            slug: 'updated-slug',
          }),
        })
      );
    });
  });

  describe('Organization Details', () => {
    it('should load organization details', async () => {
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        logoUrl: null,
        members: [],
        projects: [],
        _count: {
          members: 5,
          projects: 3,
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            organization: mockOrganization,
          },
        }),
      });

      await useOrganizationStore.getState().loadOrganization('org-123');

      expect(useOrganizationStore.getState().currentOrganization).toEqual(mockOrganization);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/organizations/org-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });
});
