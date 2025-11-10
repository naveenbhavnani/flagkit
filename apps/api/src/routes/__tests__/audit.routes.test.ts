import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestOrganization,
  createTestProject,
  createTestEnvironment,
  getAuthHeader,
  createAuthenticatedUser,
} from '../../test/helpers/auth.helper';
import { createTestFlag } from '../../test/factories/flag.factory';
import { FastifyInstance } from 'fastify';

describe('Audit Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('GET /api/v1/organizations/:organizationId/audit-logs', () => {
    it('should get organization audit logs', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.logs).toBeDefined();
      expect(Array.isArray(body.data.logs)).toBe(true);
      expect(body.data.total).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs?limit=10&offset=0`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by resource type', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs?resourceType=FLAG`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by resource id', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs?resourceId=some-resource-id`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by user id', async () => {
      const { token, organization, user } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs?userId=${user.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const { token, organization } = await createTestOrganization(server);

      const startDate = new Date('2024-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2024-01-31T23:59:59Z').toISOString();

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs?startDate=${startDate}&endDate=${endDate}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { organization } = await createTestOrganization(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}/audit-logs`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations/some-org-id/audit-logs',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/audit-logs/:resourceType/:resourceId', () => {
    it('should get audit logs for FLAG resource', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'audit-flag',
        name: 'Audit Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/FLAG/${flag.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should get audit logs for PROJECT resource', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/PROJECT/${project.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should get audit logs for ENVIRONMENT resource', async () => {
      const { token, environment } = await createTestEnvironment(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/ENVIRONMENT/${environment.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should get audit logs for ORGANIZATION resource', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/ORGANIZATION/${organization.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const { token, project } = await createTestProject(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/PROJECT/${project.id}?limit=10&offset=5`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent FLAG resource', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit-logs/FLAG/non-existent-flag-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 404 for non-existent PROJECT resource', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit-logs/PROJECT/non-existent-project-id',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 403 when user is not member of organization', async () => {
      const { project } = await createTestProject(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/audit-logs/PROJECT/${project.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit-logs/PROJECT/some-project-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/flags/:flagId/history', () => {
    it('should get flag change history', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'history-flag',
        name: 'History Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/history`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.changes).toBeDefined();
      expect(Array.isArray(body.data.changes)).toBe(true);
      expect(body.data.total).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const { token, environment, project } = await createTestEnvironment(server);
      const flag = await createTestFlag({
        environmentId: environment.id,
        projectId: project.id,
        key: 'pagination-history-flag',
        name: 'Pagination History Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/history?limit=20&offset=0`,
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
        url: '/api/v1/flags/non-existent-flag-id/history',
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
        key: 'forbidden-history-flag',
        name: 'Forbidden History Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/flags/${flag.id}/history`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/flags/some-flag-id/history',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
