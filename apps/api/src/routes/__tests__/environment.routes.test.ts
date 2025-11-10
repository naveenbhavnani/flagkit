import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestProject,
  createTestEnvironment,
  getAuthHeader,
  createAuthenticatedUser,
} from '../../test/helpers/auth.helper';
import { FastifyInstance } from 'fastify';

describe('Environment Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('POST /api/v1/projects/:projectId/environments', () => {
    it('should create a new environment', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
          key: 'test-env',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment).toBeDefined();
      expect(body.data.environment.name).toBe('Test Environment');
      expect(body.data.environment.key).toBe('test-env');
      expect(body.data.environment.clientSdkKey).toBeDefined();
      expect(body.data.environment.serverSdkKey).toBeDefined();
    });

    it('should create environment with color', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Staging',
          key: 'staging',
          color: '#FF5733',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.color).toBe('#FF5733');
    });

    it('should return 400 for missing name', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          key: 'test-env',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing key', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for key too short', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
          key: 'a',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for uppercase key', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
          key: 'TEST',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for key with spaces', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
          key: 'test env',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid color format', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Environment',
          key: 'test-env',
          color: 'red',
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
        url: '/api/v1/projects/project-id/environments',
        payload: {
          name: 'Test Environment',
          key: 'test-env',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/environments', () => {
    it('should get all environments for project', async () => {
      const { token, project } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environments).toBeDefined();
      expect(Array.isArray(body.data.environments)).toBe(true);
      expect(body.data.environments.length).toBeGreaterThan(0);
    });

    it('should return empty array for project with no environments', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environments).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/project-id/environments',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/environments`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/environments/:id', () => {
    it('should get environment by ID', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment).toBeDefined();
      expect(body.data.environment.id).toBe(environment.id);
      expect(body.data.environment.name).toBe(environment.name);
    });

    it('should return 404 for non-existent environment', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/environments/non-existent-id',
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
        url: '/api/v1/environments/env-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/v1/environments/:id', () => {
    it('should update environment name', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Updated Environment Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.name).toBe('Updated Environment Name');
    });

    it('should update environment key', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
        payload: {
          key: 'updated-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.key).toBe('updated-key');
    });

    it('should update environment color', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
        payload: {
          color: '#00FF00',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.color).toBe('#00FF00');
    });

    it('should return 400 for invalid key format', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
        payload: {
          key: 'INVALID_KEY',
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
        url: '/api/v1/environments/env-id',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/environments/${environment.id}`,
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

  describe('DELETE /api/v1/environments/:id', () => {
    it('should delete environment', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Environment deleted successfully');
    });

    it('should return 404 for non-existent environment', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/environments/non-existent-id',
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
        url: '/api/v1/environments/env-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${environment.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DELETE_ERROR');
    });
  });

  describe('POST /api/v1/environments/:id/regenerate-keys', () => {
    it('should regenerate client SDK key', async () => {
      const { token, environment } = await createTestEnvironment(server);
      const originalClientKey = environment.clientSdkKey;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/environments/${environment.id}/regenerate-keys`,
        headers: getAuthHeader(token),
        payload: {
          keyType: 'client',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.clientSdkKey).toBeDefined();
      expect(body.data.environment.clientSdkKey).not.toBe(originalClientKey);
      expect(body.data.environment.serverSdkKey).toBe(environment.serverSdkKey);
    });

    it('should regenerate server SDK key', async () => {
      const { token, environment } = await createTestEnvironment(server);
      const originalServerKey = environment.serverSdkKey;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/environments/${environment.id}/regenerate-keys`,
        headers: getAuthHeader(token),
        payload: {
          keyType: 'server',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.serverSdkKey).toBeDefined();
      expect(body.data.environment.serverSdkKey).not.toBe(originalServerKey);
      expect(body.data.environment.clientSdkKey).toBe(environment.clientSdkKey);
    });

    it('should regenerate both SDK keys', async () => {
      const { token, environment } = await createTestEnvironment(server);
      const originalClientKey = environment.clientSdkKey;
      const originalServerKey = environment.serverSdkKey;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/environments/${environment.id}/regenerate-keys`,
        headers: getAuthHeader(token),
        payload: {
          keyType: 'both',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.environment.clientSdkKey).toBeDefined();
      expect(body.data.environment.clientSdkKey).not.toBe(originalClientKey);
      expect(body.data.environment.serverSdkKey).toBeDefined();
      expect(body.data.environment.serverSdkKey).not.toBe(originalServerKey);
    });

    it('should return 400 for invalid key type', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/environments/${environment.id}/regenerate-keys`,
        headers: getAuthHeader(token),
        payload: {
          keyType: 'invalid',
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
        url: '/api/v1/environments/env-id/regenerate-keys',
        payload: {
          keyType: 'client',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/environments/${environment.id}/regenerate-keys`,
        headers: getAuthHeader(otherUserToken),
        payload: {
          keyType: 'client',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('REGENERATE_ERROR');
    });
  });
});
