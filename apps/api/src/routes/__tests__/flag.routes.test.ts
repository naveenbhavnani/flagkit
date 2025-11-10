import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestProject,
  createTestEnvironment,
  getAuthHeader,
} from '../../test/helpers/auth.helper';
import { FastifyInstance } from 'fastify';

describe('Flag Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('POST /api/v1/projects/:projectId/flags', () => {
    it('should create a new flag', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: {
          key: 'test-flag',
          name: 'Test Flag',
          description: 'A test flag',
          type: 'BOOLEAN',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flag).toMatchObject({
        key: 'test-flag',
        name: 'Test Flag',
        description: 'A test flag',
        type: 'BOOLEAN',
      });
    });

    it('should fail to create flag with invalid key format', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: {
          key: 'Invalid Key!',
          name: 'Invalid Flag',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to create flag with short key', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: {
          key: 'a',
          name: 'Short Key Flag',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to create flag without authentication', async () => {
      const { project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        payload: {
          key: 'test-flag',
          name: 'Test Flag',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create flag with custom variations', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: {
          key: 'color-theme',
          name: 'Color Theme',
          type: 'STRING',
          variations: [
            {
              key: 'light',
              name: 'Light Theme',
              value: 'light',
              description: 'Light color theme',
            },
            {
              key: 'dark',
              name: 'Dark Theme',
              value: 'dark',
              description: 'Dark color theme',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flag.key).toBe('color-theme');
    });
  });

  describe('GET /api/v1/projects/:projectId/flags', () => {
    it('should get all flags for a project', async () => {
      const { token, project } = await createTestProject(server);

      // Create multiple flags
      await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'flag-1', name: 'Flag 1' },
      });

      await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'flag-2', name: 'Flag 2' },
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flags).toHaveLength(2);
      expect(body.data.flags[0].key).toBeDefined();
    });

    it('should return empty array for project with no flags', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flags).toHaveLength(0);
    });

    it('should fail to get flags without authentication', async () => {
      const { project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/flags`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/flags/:id', () => {
    it('should get a single flag by id', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: {
          key: 'single-flag',
          name: 'Single Flag',
          description: 'Test description',
        },
      });

      const createdFlag = JSON.parse(createResponse.body).data.flag;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${createdFlag.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flag).toMatchObject({
        id: createdFlag.id,
        key: 'single-flag',
        name: 'Single Flag',
      });
    });

    it('should fail to get non-existent flag', async () => {
      const { token } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/flags/non-existent-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should fail to get flag without authentication', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'auth-test', name: 'Auth Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flagId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/v1/flags/:id', () => {
    it('should update a flag', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'update-test', name: 'Original Name' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Updated Name',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flag).toMatchObject({
        id: flagId,
        name: 'Updated Name',
        description: 'Updated description',
      });
    });

    it('should update flag status', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'status-test', name: 'Status Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}`,
        headers: getAuthHeader(token),
        payload: {
          status: 'ARCHIVED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flag.status).toBe('ARCHIVED');
    });

    it('should fail to update non-existent flag', async () => {
      const { token } = await createTestProject(server);

      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/flags/non-existent-id',
        headers: getAuthHeader(token),
        payload: { name: 'New Name' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should fail with invalid update data', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'validation-test', name: 'Validation Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}`,
        headers: getAuthHeader(token),
        payload: {
          name: '', // Empty name should fail validation
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/flags/:id', () => {
    it('should archive a flag', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'delete-test', name: 'Delete Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/flags/${flagId}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBeDefined();
    });

    it('should fail to delete non-existent flag', async () => {
      const { token } = await createTestProject(server);

      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/flags/non-existent-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should fail to delete without authentication', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'auth-delete', name: 'Auth Delete' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/flags/${flagId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/flags/:id/environments/:environmentId/config', () => {
    it('should get environment config for a flag', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'env-config-test', name: 'Env Config Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/config`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.config).toBeDefined();
    });

    it('should fail to get config without authentication', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'auth-config', name: 'Auth Config' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/config`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/v1/flags/:id/environments/:environmentId/config', () => {
    it('should update environment config', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'config-update', name: 'Config Update' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/config`,
        headers: getAuthHeader(token),
        payload: {
          enabled: true,
          rolloutPercentage: 50,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.config).toBeDefined();
    });

    it('should fail with invalid rollout percentage', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'invalid-rollout', name: 'Invalid Rollout' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/config`,
        headers: getAuthHeader(token),
        payload: {
          rolloutPercentage: 150, // Invalid: should be 0-100
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update targeting rules', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'targeting-test', name: 'Targeting Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/config`,
        headers: getAuthHeader(token),
        payload: {
          targetingRules: [
            {
              conditions: [{ attribute: 'userId', operator: 'equals', value: 'user-123' }],
              variationKey: 'on',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/v1/flags/:id/environments/:environmentId/toggle', () => {
    it('should toggle flag on', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'toggle-test', name: 'Toggle Test' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/toggle`,
        headers: getAuthHeader(token),
        payload: { enabled: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.config).toBeDefined();
    });

    it('should toggle flag off', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'toggle-off', name: 'Toggle Off' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      // Toggle on first
      await server.inject({
        method: 'POST',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/toggle`,
        headers: getAuthHeader(token),
        payload: { enabled: true },
      });

      // Then toggle off
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/toggle`,
        headers: getAuthHeader(token),
        payload: { enabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should fail to toggle without enabled field', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'toggle-invalid', name: 'Toggle Invalid' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/toggle`,
        headers: getAuthHeader(token),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to toggle without authentication', async () => {
      const { token, project, environment } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'auth-toggle', name: 'Auth Toggle' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/flags/${flagId}/environments/${environment.id}/toggle`,
        payload: { enabled: true },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/flags/:id/environments/configs', () => {
    it('should get all environment configs for a flag', async () => {
      const { token, project } = await createTestEnvironment(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'all-configs', name: 'All Configs' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flagId}/environments/configs`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.configs).toBeDefined();
      expect(Array.isArray(body.data.configs)).toBe(true);
    });

    it('should fail to get configs without authentication', async () => {
      const { token, project } = await createTestProject(server);

      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${project.id}/flags`,
        headers: getAuthHeader(token),
        payload: { key: 'auth-configs', name: 'Auth Configs' },
      });

      const flagId = JSON.parse(createResponse.body).data.flag.id;

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flagId}/environments/configs`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
