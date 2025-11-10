import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestEnvironment,
  getAuthHeader,
  createAuthenticatedUser,
} from '../../test/helpers/auth.helper';
import { createTestFlag } from '../../test/factories/flag.factory';
import { FastifyInstance } from 'fastify';

describe('Analytics Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('GET /api/v1/flags/:flagId/analytics', () => {
    it('should get flag analytics for specific environment', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'analytics-flag',
        name: 'Analytics Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/analytics?environmentId=${environment.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should get flag analytics for all environments', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'multi-env-flag',
        name: 'Multi Env Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/analytics`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.environments).toBeDefined();
      expect(Array.isArray(body.data.environments)).toBe(true);
    });

    it('should handle date range and interval parameters', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'date-range-flag',
        name: 'Date Range Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const startDate = new Date('2024-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2024-01-31T23:59:59Z').toISOString();

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/analytics?environmentId=${environment.id}&startDate=${startDate}&endDate=${endDate}&interval=DAY`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent flag', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/flags/non-existent-flag-id/analytics',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 404 for invalid environment', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'invalid-env-flag',
        name: 'Invalid Env Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/analytics?environmentId=non-existent-env-id`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'forbidden-flag',
        name: 'Forbidden Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/analytics`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/flags/some-flag-id/analytics',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/environments/:environmentId/analytics', () => {
    it('should get environment analytics', async () => {
      const { token, environment, project } = await createTestEnvironment(server);

      // Create a flag for the environment
      await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'env-analytics-flag',
        name: 'Env Analytics Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/environments/${environment.id}/analytics`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should handle date range parameters', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const startDate = new Date('2024-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2024-01-31T23:59:59Z').toISOString();

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/environments/${environment.id}/analytics?startDate=${startDate}&endDate=${endDate}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent environment', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/environments/non-existent-env-id/analytics',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { environment } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/environments/${environment.id}/analytics`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/environments/some-env-id/analytics',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/analytics/summary', () => {
    it('should get project analytics summary', async () => {
      const { token, environment, project } = await createTestEnvironment(server);

      // Create a flag for analytics
      await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'project-summary-flag',
        name: 'Project Summary Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analytics/summary`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.projectId).toBe(project.id);
      expect(body.data.projectName).toBe(project.name);
      expect(body.data.environments).toBeDefined();
      expect(Array.isArray(body.data.environments)).toBe(true);
      expect(body.data.totalEvaluations).toBeDefined();
    });

    it('should handle date range parameters', async () => {
      const { token, project } = await createTestEnvironment(server);

      const startDate = new Date('2024-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2024-01-31T23:59:59Z').toISOString();

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analytics/summary?startDate=${startDate}&endDate=${endDate}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/non-existent-project-id/analytics/summary',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestEnvironment(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analytics/summary`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/some-project-id/analytics/summary',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
