import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import { createAuthenticatedUser } from '../../test/helpers/auth.helper';
import { FastifyInstance } from 'fastify';
import { prisma } from '@flagkit/database';

describe('Auth Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'Test123!@#',
          name: 'New User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
      });
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('should fail to register with invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Test123!@#',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to register with short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to register with duplicate email', async () => {
      const email = 'duplicate@example.com';

      // First registration
      await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'Test123!@#',
          name: 'First User',
        },
      });

      // Attempt duplicate registration
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'Test123!@#',
          name: 'Second User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('REGISTRATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a user first
      const email = 'login@example.com';
      const password = 'Test123!@#';

      await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password, name: 'Login User' },
      });

      // Login with the credentials
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(email);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('should fail to login with invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should fail to login with incorrect password', async () => {
      const email = 'wrongpass@example.com';

      await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'Test123!@#', name: 'User' },
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'WrongPassword123' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should fail to login with missing fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@example.com' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user with valid token', async () => {
      const { user, token } = await createAuthenticatedUser(server);

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe(user.id);
      expect(body.data.user.email).toBe(user.email);
    });

    it('should fail to get user without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail to get user with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token-here',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail to get user with deleted account', async () => {
      const { user, token } = await createAuthenticatedUser(server);

      // Delete the user
      await prisma.user.delete({ where: { id: user.id } });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // Authentication middleware catches this before route handler, returns 401
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Register a user to get tokens
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refresh@example.com',
          password: 'Test123!@#',
          name: 'Refresh User',
        },
      });

      const registerBody = JSON.parse(registerResponse.body);
      const refreshToken = registerBody.data.tokens.refreshToken;

      // Use refresh token to get new tokens
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
      // Note: tokens might be the same if created within the same second
    });

    it('should fail to refresh with invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('should fail to refresh without token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MISSING_TOKEN');
    });
  });
});
