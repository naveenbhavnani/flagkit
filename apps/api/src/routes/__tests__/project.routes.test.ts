import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestOrganization,
  createTestProject,
  getAuthHeader,
  createAuthenticatedUser,
} from '../../test/helpers/auth.helper';
import { FastifyInstance } from 'fastify';

describe('Project Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('POST /api/v1/organizations/:organizationId/projects', () => {
    it('should create a new project', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
          key: 'TEST',
          description: 'A test project',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project).toBeDefined();
      expect(body.data.project.name).toBe('Test Project');
      expect(body.data.project.key).toBe('TEST');
      expect(body.data.project.description).toBe('A test project');
    });

    it('should create project without description', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Minimal Project',
          key: 'MIN',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project.name).toBe('Minimal Project');
    });

    it('should return 400 for missing name', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          key: 'TEST',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty name', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: '',
          key: 'TEST',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing key', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for key too short', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
          key: 'A',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for key too long', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
          key: 'VERYLONGKEY',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for lowercase key', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
          key: 'test',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for key with special characters', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Project',
          key: 'TEST-KEY',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-id/projects',
        payload: {
          name: 'Test Project',
          key: 'TEST',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when user is not member of organization', async () => {
      const { organization } = await createTestOrganization(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(otherUserToken),
        payload: {
          name: 'Test Project',
          key: 'TEST',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/projects', () => {
    it('should get all projects for organization', async () => {
      const { token, organization } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.projects).toBeDefined();
      expect(Array.isArray(body.data.projects)).toBe(true);
      expect(body.data.projects.length).toBeGreaterThan(0);
    });

    it('should return empty array for organization with no projects', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.projects).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-id/projects',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { organization } = await createTestProject(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/projects`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get project by ID', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project).toBeDefined();
      expect(body.data.project.id).toBe(project.id);
      expect(body.data.project.name).toBe(project.name);
    });

    it('should return 404 for non-existent project', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/non-existent-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/project-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestProject(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update project name', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Updated Project Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project.name).toBe('Updated Project Name');
    });

    it('should update project key', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
        payload: {
          key: 'UPDATED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project.key).toBe('UPDATED');
    });

    it('should update project description', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
        payload: {
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.project.description).toBe('Updated description');
    });

    it('should return 400 for invalid key format', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
        payload: {
          key: 'invalid-key',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/projects/project-id',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestProject(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(otherUserToken),
        payload: {
          name: 'Hacked Name',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UPDATE_ERROR');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Project deleted successfully');
    });

    it('should return 404 for non-existent project', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/projects/non-existent-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/projects/project-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestProject(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${project.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DELETE_ERROR');
    });
  });
});
