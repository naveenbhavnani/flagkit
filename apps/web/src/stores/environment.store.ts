import { create } from 'zustand';
import {
  api,
  Environment,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
} from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface EnvironmentState {
  environments: Environment[];
  currentEnvironment: Environment | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjectEnvironments: (projectId: string) => Promise<void>;
  loadEnvironment: (id: string) => Promise<void>;
  createEnvironment: (
    projectId: string,
    data: CreateEnvironmentInput
  ) => Promise<Environment | null>;
  updateEnvironment: (id: string, data: UpdateEnvironmentInput) => Promise<Environment | null>;
  deleteEnvironment: (id: string) => Promise<boolean>;
  regenerateKeys: (id: string, keyType: 'client' | 'server' | 'both') => Promise<Environment | null>;
  clearError: () => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  environments: [],
  currentEnvironment: null,
  isLoading: false,
  error: null,

  loadProjectEnvironments: async (projectId: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated', environments: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getProjectEnvironments(token, projectId);

      if (response.success && response.data) {
        set({
          environments: response.data.environments,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load environments',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load environments',
        isLoading: false,
      });
    }
  },

  loadEnvironment: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getEnvironment(token, id);

      if (response.success && response.data) {
        set({
          currentEnvironment: response.data.environment,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load environment',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load environment',
        isLoading: false,
      });
    }
  },

  createEnvironment: async (projectId: string, data: CreateEnvironmentInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.createEnvironment(token, projectId, data);

      if (response.success && response.data) {
        const newEnv = response.data.environment;

        set((state) => ({
          environments: [...state.environments, newEnv],
          currentEnvironment: newEnv,
          isLoading: false,
        }));

        return newEnv;
      } else {
        set({
          error: response.error?.message || 'Failed to create environment',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create environment',
        isLoading: false,
      });
      return null;
    }
  },

  updateEnvironment: async (id: string, data: UpdateEnvironmentInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.updateEnvironment(token, id, data);

      if (response.success && response.data) {
        const updated = response.data.environment;

        set((state) => ({
          environments: state.environments.map((e) => (e.id === id ? updated : e)),
          currentEnvironment: state.currentEnvironment?.id === id ? updated : state.currentEnvironment,
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to update environment',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update environment',
        isLoading: false,
      });
      return null;
    }
  },

  deleteEnvironment: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.deleteEnvironment(token, id);

      if (response.success) {
        set((state) => ({
          environments: state.environments.filter((e) => e.id !== id),
          currentEnvironment: state.currentEnvironment?.id === id ? null : state.currentEnvironment,
          isLoading: false,
        }));

        return true;
      } else {
        set({
          error: response.error?.message || 'Failed to delete environment',
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete environment',
        isLoading: false,
      });
      return false;
    }
  },

  regenerateKeys: async (id: string, keyType: 'client' | 'server' | 'both') => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.regenerateEnvironmentKeys(token, id, keyType);

      if (response.success && response.data) {
        const updated = response.data.environment;

        set((state) => ({
          environments: state.environments.map((e) => (e.id === id ? updated : e)),
          currentEnvironment: state.currentEnvironment?.id === id ? updated : state.currentEnvironment,
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to regenerate keys',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to regenerate keys',
        isLoading: false,
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
