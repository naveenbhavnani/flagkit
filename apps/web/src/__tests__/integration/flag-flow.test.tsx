import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFlagStore } from '@/stores/flag.store';

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

describe('Flag Management Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset flag store
    useFlagStore.setState({
      flags: [],
      currentFlag: null,
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

    vi.clearAllMocks();
  });

  describe('Flag Creation', () => {
    it('should successfully create a flag', async () => {
      const mockFlag = {
        id: 'flag-123',
        key: 'new-feature',
        name: 'New Feature',
        description: 'A new feature flag',
        type: 'boolean',
        status: 'active',
        projectId: 'project-123',
        tags: ['frontend'],
        ownerId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        variations: [
          {
            id: 'var-1',
            key: 'true',
            name: 'True',
            value: 'true',
            description: 'Feature enabled',
            flagId: 'flag-123',
          },
          {
            id: 'var-2',
            key: 'false',
            name: 'False',
            value: 'false',
            description: 'Feature disabled',
            flagId: 'flag-123',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            flag: mockFlag,
          },
        }),
      });

      const result = await useFlagStore.getState().createFlag('project-123', {
        key: 'new-feature',
        name: 'New Feature',
        description: 'A new feature flag',
        tags: ['frontend'],
      });

      expect(result).toEqual(mockFlag);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/projects/project-123/flags',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle errors during flag creation', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'FLAG_EXISTS',
            message: 'A flag with this key already exists',
          },
        }),
      });

      const result = await useFlagStore.getState().createFlag('project-123', {
        key: 'existing-flag',
        name: 'Existing Flag',
      });

      expect(result).toBeNull();
      expect(useFlagStore.getState().error).toBe('A flag with this key already exists');
    });
  });

  describe('Flag Listing', () => {
    it('should load project flags', async () => {
      const mockFlags = [
        {
          id: 'flag-1',
          key: 'feature-a',
          name: 'Feature A',
          description: 'First feature',
          type: 'boolean',
          status: 'active',
          projectId: 'project-123',
          tags: ['frontend'],
          ownerId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          variations: [],
          _count: { envConfigs: 2 },
        },
        {
          id: 'flag-2',
          key: 'feature-b',
          name: 'Feature B',
          description: 'Second feature',
          type: 'boolean',
          status: 'inactive',
          projectId: 'project-123',
          tags: ['backend'],
          ownerId: 'user-123',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          variations: [],
          _count: { envConfigs: 3 },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            flags: mockFlags,
          },
        }),
      });

      await useFlagStore.getState().loadProjectFlags('project-123');

      const store = useFlagStore.getState();
      expect(store.flags).toEqual(mockFlags);
      expect(store.isLoading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/projects/project-123/flags',
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

      const loadPromise = useFlagStore.getState().loadProjectFlags('project-123');

      // Check loading state
      expect(useFlagStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          success: true,
          data: { flags: [] },
        }),
      } as Response);

      await loadPromise;

      // Loading should be done
      expect(useFlagStore.getState().isLoading).toBe(false);
    });
  });

  describe('Flag Updates', () => {
    it('should successfully update a flag', async () => {
      const updatedFlag = {
        id: 'flag-123',
        key: 'feature-flag',
        name: 'Updated Feature',
        description: 'Updated description',
        type: 'boolean',
        status: 'active',
        projectId: 'project-123',
        tags: ['updated'],
        ownerId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        variations: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            flag: updatedFlag,
          },
        }),
      });

      const result = await useFlagStore.getState().updateFlag('flag-123', {
        name: 'Updated Feature',
        description: 'Updated description',
        tags: ['updated'],
      });

      expect(result).toEqual(updatedFlag);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/flags/flag-123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({
            name: 'Updated Feature',
            description: 'Updated description',
            tags: ['updated'],
          }),
        })
      );
    });
  });

  describe('Flag Environment Configuration', () => {
    it('should toggle flag in environment', async () => {
      const mockConfig = {
        id: 'config-123',
        flagId: 'flag-123',
        environmentId: 'env-123',
        enabled: true,
        defaultVariationKey: 'true',
        fallbackVariationKey: 'false',
        targetingRules: null,
        rolloutPercentage: 100,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            config: mockConfig,
          },
        }),
      });

      const result = await useFlagStore.getState().toggleFlagInEnvironment('flag-123', 'env-123', true);

      expect(result).toEqual(mockConfig);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/flags/flag-123/environments/env-123/toggle',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({ enabled: true }),
        })
      );
    });

    it('should update flag environment configuration', async () => {
      const mockConfig = {
        id: 'config-123',
        flagId: 'flag-123',
        environmentId: 'env-123',
        enabled: true,
        defaultVariationKey: 'new-default',
        fallbackVariationKey: 'fallback',
        targetingRules: { rules: [] },
        rolloutPercentage: 50,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            config: mockConfig,
          },
        }),
      });

      const result = await useFlagStore.getState().updateFlagEnvironmentConfig('flag-123', 'env-123', {
        enabled: true,
        defaultVariationKey: 'new-default',
        fallbackVariationKey: 'fallback',
        rolloutPercentage: 50,
      });

      expect(result).toEqual(mockConfig);
    });
  });

  describe('Flag Deletion', () => {
    it('should successfully delete a flag', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            message: 'Flag deleted successfully',
          },
        }),
      });

      const result = await useFlagStore.getState().deleteFlag('flag-123');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/flags/flag-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle deletion errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'FLAG_IN_USE',
            message: 'Cannot delete flag that is currently in use',
          },
        }),
      });

      const result = await useFlagStore.getState().deleteFlag('flag-123');

      expect(result).toBe(false);
      expect(useFlagStore.getState().error).toBe('Cannot delete flag that is currently in use');
    });
  });
});
