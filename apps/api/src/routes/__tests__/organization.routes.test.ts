import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createAuthenticatedUser,
  getAuthHeader,
  createTestOrganization,
} from '../../test/helpers/auth.helper';
import { FastifyInstance } from 'fastify';

describe('Organization Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('POST /api/v1/organizations', () => {
    it('should create a new organization', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Organization',
          slug: 'test-org',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization).toBeDefined();
      expect(body.data.organization.name).toBe('Test Organization');
      expect(body.data.organization.slug).toBe('test-org');
    });

    it('should return 400 for invalid organization name', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
        payload: {
          name: '',
          slug: 'test-org',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid slug format', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Org',
          slug: 'Invalid Slug!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for slug that is too short', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
        payload: {
          name: 'Test Org',
          slug: 'ab',
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
        url: '/api/v1/organizations',
        payload: {
          name: 'Test Organization',
          slug: 'test-org',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/organizations', () => {
    it('should get all organizations for authenticated user', async () => {
      const { token } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organizations).toBeDefined();
      expect(Array.isArray(body.data.organizations)).toBe(true);
      expect(body.data.organizations.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no organizations', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organizations).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/organizations/:id', () => {
    it('should get organization details by ID', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization).toBeDefined();
      expect(body.data.organization.id).toBe(organization.id);
      expect(body.data.organization.name).toBe(organization.name);
    });

    it('should return 404 for non-existent organization', async () => {
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/organizations/non-existent-id',
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
        url: '/api/v1/organizations/some-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user is not a member', async () => {
      const { organization } = await createTestOrganization(server);
      const { token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/organizations/:id', () => {
    it('should update organization name', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
        payload: {
          name: 'Updated Organization Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe('Updated Organization Name');
    });

    it('should update organization logo URL', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
        payload: {
          logoUrl: 'https://example.com/logo.png',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should return 400 for invalid name', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
        payload: {
          name: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid logo URL', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
        payload: {
          logoUrl: 'not-a-valid-url',
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
        url: '/api/v1/organizations/some-id',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not owner/admin', async () => {
      const { organization } = await createTestOrganization(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/organizations/${organization.id}`,
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

  describe('POST /api/v1/organizations/:id/members', () => {
    it('should invite a member to organization', async () => {
      const { token, organization } = await createTestOrganization(server);
      const { user: newUser } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/members`,
        headers: getAuthHeader(token),
        payload: {
          email: newUser.email,
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.member).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/members`,
        headers: getAuthHeader(token),
        payload: {
          email: 'invalid-email',
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid role', async () => {
      const { token, organization } = await createTestOrganization(server);
      const { user: newUser } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/members`,
        headers: getAuthHeader(token),
        payload: {
          email: newUser.email,
          role: 'INVALID_ROLE',
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
        url: '/api/v1/organizations/some-id/members',
        payload: {
          email: 'member@example.com',
          role: 'DEVELOPER',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/organizations/:id/members/:userId', () => {
    it('should remove a member from organization', async () => {
      const { token, organization } = await createTestOrganization(server);
      const { user: newUser } = await createAuthenticatedUser(server);

      // First invite the member
      await server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${organization.id}/members`,
        headers: getAuthHeader(token),
        payload: {
          email: newUser.email,
          role: 'DEVELOPER',
        },
      });

      // Then remove the member
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/organizations/${organization.id}/members/${newUser.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Member removed successfully');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/some-id/members/user-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not owner/admin', async () => {
      const { organization, user: orgOwner } = await createTestOrganization(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/organizations/${organization.id}/members/${orgOwner.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('REMOVE_ERROR');
    });
  });

  describe('DELETE /api/v1/organizations/:id', () => {
    it('should delete organization', async () => {
      const { token, organization } = await createTestOrganization(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Organization deleted successfully');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/some-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not owner', async () => {
      const { organization } = await createTestOrganization(server);
      const { token: otherUserToken } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/organizations/${organization.id}`,
        headers: getAuthHeader(otherUserToken),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DELETE_ERROR');
    });
  });
});
