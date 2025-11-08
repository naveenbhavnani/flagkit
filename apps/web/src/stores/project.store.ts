import { create } from 'zustand';
import { api, Project, CreateProjectInput, UpdateProjectInput } from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadOrganizationProjects: (organizationId: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (organizationId: string, data: CreateProjectInput) => Promise<Project | null>;
  updateProject: (id: string, data: UpdateProjectInput) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadOrganizationProjects: async (organizationId: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated', projects: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getOrganizationProjects(token, organizationId);

      if (response.success && response.data) {
        set({
          projects: response.data.projects,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load projects',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false,
      });
    }
  },

  loadProject: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.getProject(token, id);

      if (response.success && response.data) {
        set({
          currentProject: response.data.project,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to load project',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load project',
        isLoading: false,
      });
    }
  },

  createProject: async (organizationId: string, data: CreateProjectInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.createProject(token, organizationId, data);

      if (response.success && response.data) {
        const newProject = response.data.project;

        set((state) => ({
          projects: [newProject, ...state.projects],
          currentProject: newProject,
          isLoading: false,
        }));

        return newProject;
      } else {
        set({
          error: response.error?.message || 'Failed to create project',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false,
      });
      return null;
    }
  },

  updateProject: async (id: string, data: UpdateProjectInput) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.updateProject(token, id, data);

      if (response.success && response.data) {
        const updated = response.data.project;

        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? updated : p)),
          currentProject: state.currentProject?.id === id ? updated : state.currentProject,
          isLoading: false,
        }));

        return updated;
      } else {
        set({
          error: response.error?.message || 'Failed to update project',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false,
      });
      return null;
    }
  },

  deleteProject: async (id: string) => {
    const token = authStorage.getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.deleteProject(token, id);

      if (response.success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
          isLoading: false,
        }));

        return true;
      } else {
        set({
          error: response.error?.message || 'Failed to delete project',
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false,
      });
      return false;
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  clearError: () => set({ error: null }),
}));
