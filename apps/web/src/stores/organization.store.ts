import { create } from 'zustand';
import { api, Organization, CreateOrganizationInput } from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadOrganizations: () => Promise<void>;
  loadOrganization: (id: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationInput) => Promise<Organization | null>;
  setCurrentOrganization: (org: Organization | null) => void;
  clearError: () => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,

  loadOrganizations: async () => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated', organizations: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getOrganizations(token);

      if (response.success && response.data) {
        set({
          organizations: response.data.organizations,
          isLoading: false,
        });

        // Set first org as current if none selected
        if (!get().currentOrganization && response.data.organizations.length > 0) {
          set({ currentOrganization: response.data.organizations[0] });
        }
      } else {
        set({
          error: response.error?.message || 'Failed to load organizations',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load organizations',
        isLoading: false,
      });
    }
  },

  loadOrganization: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getOrganization(token, id);

      if (response.success && response.data) {
        set({
          currentOrganization: response.data.organization,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load organization',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load organization',
        isLoading: false,
      });
    }
  },

  createOrganization: async (data: CreateOrganizationInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.createOrganization(token, data);

      if (response.success && response.data) {
        const newOrg = response.data.organization;

        set((state) => ({
          organizations: [newOrg, ...state.organizations],
          currentOrganization: newOrg,
          isLoading: false,
        }));

        return newOrg;
      } else {
        set({
          error: response.error?.message || 'Failed to create organization',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create organization',
        isLoading: false,
      });
      return null;
    }
  },

  setCurrentOrganization: (org: Organization | null) => {
    set({ currentOrganization: org });
  },

  clearError: () => set({ error: null }),
}));
