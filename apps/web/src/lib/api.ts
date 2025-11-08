const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface OrganizationMember {
  id: string;
  role: string;
  userId: string;
  organizationId: string;
  invitedAt: string;
  joinedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
  joinedAt?: string;
  userRole?: string;
  members?: OrganizationMember[];
  projects?: Project[];
  _count?: {
    members: number;
    projects: number;
  };
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  key?: string;
  description?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    return response.json();
  }

  async register(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(token: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/v1/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    return this.request<{ tokens: AuthTokens }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Organization methods
  async createOrganization(
    token: string,
    data: CreateOrganizationInput
  ): Promise<ApiResponse<{ organization: Organization }>> {
    return this.request<{ organization: Organization }>('/api/v1/organizations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getOrganizations(token: string): Promise<ApiResponse<{ organizations: Organization[] }>> {
    return this.request<{ organizations: Organization[] }>('/api/v1/organizations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getOrganization(
    token: string,
    id: string
  ): Promise<ApiResponse<{ organization: Organization }>> {
    return this.request<{ organization: Organization }>(`/api/v1/organizations/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateOrganization(
    token: string,
    id: string,
    data: Partial<CreateOrganizationInput>
  ): Promise<ApiResponse<{ organization: Organization }>> {
    return this.request<{ organization: Organization }>(`/api/v1/organizations/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  // Project methods
  async createProject(
    token: string,
    organizationId: string,
    data: CreateProjectInput
  ): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(
      `/api/v1/organizations/${organizationId}/projects`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );
  }

  async getOrganizationProjects(
    token: string,
    organizationId: string
  ): Promise<ApiResponse<{ projects: Project[] }>> {
    return this.request<{ projects: Project[] }>(
      `/api/v1/organizations/${organizationId}/projects`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async getProject(token: string, id: string): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(`/api/v1/projects/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateProject(
    token: string,
    id: string,
    data: UpdateProjectInput
  ): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteProject(token: string, id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const api = new ApiClient(API_URL);
