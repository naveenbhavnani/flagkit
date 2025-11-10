import { create } from 'zustand';
import {
  api,
  Flag,
  FlagEnvironmentConfig,
  CreateFlagInput,
  UpdateFlagInput,
  UpdateFlagConfigInput,
} from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface FlagState {
  flags: Flag[];
  currentFlag: Flag | null;
  flagConfigs: Record<string, FlagEnvironmentConfig[]>; // flagId -> configs
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjectFlags: (projectId: string) => Promise<void>;
  loadFlag: (id: string) => Promise<void>;
  createFlag: (projectId: string, data: CreateFlagInput) => Promise<Flag | null>;
  updateFlag: (id: string, data: UpdateFlagInput) => Promise<Flag | null>;
  deleteFlag: (id: string) => Promise<boolean>;
  loadFlagConfigs: (flagId: string) => Promise<void>;
  updateFlagConfig: (
    flagId: string,
    environmentId: string,
    data: UpdateFlagConfigInput
  ) => Promise<FlagEnvironmentConfig | null>;
  toggleFlag: (
    flagId: string,
    environmentId: string,
    enabled: boolean
  ) => Promise<FlagEnvironmentConfig | null>;
  toggleFlagInEnvironment: (
    flagId: string,
    environmentId: string,
    enabled: boolean
  ) => Promise<FlagEnvironmentConfig | null>;
  updateFlagEnvironmentConfig: (
    flagId: string,
    environmentId: string,
    data: UpdateFlagConfigInput
  ) => Promise<FlagEnvironmentConfig | null>;
  clearError: () => void;
}

export const useFlagStore = create<FlagState>((set) => ({
  flags: [],
  currentFlag: null,
  flagConfigs: {},
  isLoading: false,
  error: null,

  loadProjectFlags: async (projectId: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated', flags: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getProjectFlags(token, projectId);

      if (response.success && response.data) {
        set({
          flags: response.data.flags,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load flags',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load flags',
        isLoading: false,
      });
    }
  },

  loadFlag: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getFlag(token, id);

      if (response.success && response.data) {
        set({
          currentFlag: response.data.flag,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load flag',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load flag',
        isLoading: false,
      });
    }
  },

  createFlag: async (projectId: string, data: CreateFlagInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.createFlag(token, projectId, data);

      if (response.success && response.data) {
        const newFlag = response.data.flag;

        set((state) => ({
          flags: [newFlag, ...state.flags],
          currentFlag: newFlag,
          isLoading: false,
        }));

        return newFlag;
      } else {
        set({
          error: response.error?.message || 'Failed to create flag',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create flag',
        isLoading: false,
      });
      return null;
    }
  },

  updateFlag: async (id: string, data: UpdateFlagInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.updateFlag(token, id, data);

      if (response.success && response.data) {
        const updated = response.data.flag;

        set((state) => ({
          flags: state.flags.map((f) => (f.id === id ? updated : f)),
          currentFlag: state.currentFlag?.id === id ? updated : state.currentFlag,
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to update flag',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update flag',
        isLoading: false,
      });
      return null;
    }
  },

  deleteFlag: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.deleteFlag(token, id);

      if (response.success) {
        set((state) => ({
          flags: state.flags.filter((f) => f.id !== id),
          currentFlag: state.currentFlag?.id === id ? null : state.currentFlag,
          isLoading: false,
        }));

        return true;
      } else {
        set({
          error: response.error?.message || 'Failed to delete flag',
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete flag',
        isLoading: false,
      });
      return false;
    }
  },

  loadFlagConfigs: async (flagId: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getAllFlagEnvironmentConfigs(token, flagId);

      if (response.success && response.data) {
        set((state) => ({
          flagConfigs: {
            ...state.flagConfigs,
            [flagId]: response.data!.configs,
          },
          isLoading: false,
        }));
      } else {
        set({
          error: response.error?.message || 'Failed to load flag configurations',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load flag configurations',
        isLoading: false,
      });
    }
  },

  updateFlagConfig: async (
    flagId: string,
    environmentId: string,
    data: UpdateFlagConfigInput
  ) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.updateFlagEnvironmentConfig(token, flagId, environmentId, data);

      if (response.success && response.data) {
        const updated = response.data.config;

        set((state) => ({
          flagConfigs: {
            ...state.flagConfigs,
            [flagId]: (state.flagConfigs[flagId] || []).map((c) =>
              c.environmentId === environmentId ? updated : c
            ),
          },
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to update flag configuration',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update flag configuration',
        isLoading: false,
      });
      return null;
    }
  },

  toggleFlag: async (flagId: string, environmentId: string, enabled: boolean) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.toggleFlagInEnvironment(token, flagId, environmentId, enabled);

      if (response.success && response.data) {
        const updated = response.data.config;

        set((state) => ({
          flagConfigs: {
            ...state.flagConfigs,
            [flagId]: (state.flagConfigs[flagId] || []).map((c) =>
              c.environmentId === environmentId ? updated : c
            ),
          },
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to toggle flag',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle flag',
        isLoading: false,
      });
      return null;
    }
  },

  // Alias methods for compatibility with tests
  get toggleFlagInEnvironment() {
    return this.toggleFlag;
  },

  get updateFlagEnvironmentConfig() {
    return this.updateFlagConfig;
  },

  clearError: () => set({ error: null }),
}));
