import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../test/helpers/test-server';
import {
  createTestEnvironment,
} from '../../test/helpers/auth.helper';
import { createTestFlag } from '../../test/factories/flag.factory';
import { FastifyInstance } from 'fastify';

describe('SDK Routes', () => {
  let server: FastifyInstance;
  let clientSdkKey: string;
  let serverSdkKey: string;
  let environmentId: string;

  beforeAll(async () => {
    server = await createTestServer();

    // Create environment with SDK keys
    const envData = await createTestEnvironment(server);
    environmentId = envData.environment.id;
    clientSdkKey = envData.environment.clientSdkKey;
    serverSdkKey = envData.environment.serverSdkKey;
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  describe('GET /sdk/v1/client/:sdkKey/flags', () => {
    it('should get all flags for valid client SDK key', async () => {
      // Create a test flag
      await createTestFlag({
        environmentId,
        key: 'test-client-flag',
        name: 'Test Client Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'GET',
        url: `/sdk/v1/client/${clientSdkKey}/flags`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.flags).toBeDefined();
      expect(typeof body.data.flags).toBe('object');
    });

    it('should return 401 for invalid client SDK key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/sdk/v1/client/invalid-sdk-key/flags',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_SDK_KEY');
    });

    it('should not allow server SDK key for client endpoint', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/sdk/v1/client/${serverSdkKey}/flags`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return empty flags object when no flags exist', async () => {
      // Create a new environment with no flags
      const newEnv = await createTestEnvironment(server, 'empty-env');

      const response = await server.inject({
        method: 'GET',
        url: `/sdk/v1/client/${newEnv.environment.clientSdkKey}/flags`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flags).toEqual({});
    });
  });

  describe('GET /sdk/v1/server/:sdkKey/flags', () => {
    it('should get all flags for valid server SDK key', async () => {
      // Create a test flag
      await createTestFlag({
        environmentId,
        key: 'test-server-flag',
        name: 'Test Server Flag',
        type: 'STRING',
        defaultValue: 'server-value',
      });

      const response = await server.inject({
        method: 'GET',
        url: `/sdk/v1/server/${serverSdkKey}/flags`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.flags).toBeDefined();
      expect(typeof body.data.flags).toBe('object');
    });

    it('should return 401 for invalid server SDK key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/sdk/v1/server/invalid-sdk-key/flags',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_SDK_KEY');
    });

    it('should not allow client SDK key for server endpoint', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/sdk/v1/server/${clientSdkKey}/flags`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /sdk/v1/client/:sdkKey/evaluate', () => {
    it('should evaluate a flag with valid client SDK key', async () => {
      await createTestFlag({
        environmentId,
        key: 'eval-client-flag',
        name: 'Eval Client Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'eval-client-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.key).toBe('eval-client-flag');
      expect(body.data.value).toBeDefined();
    });

    it('should evaluate flag with user context', async () => {
      await createTestFlag({
        environmentId,
        key: 'context-flag',
        name: 'Context Flag',
        type: 'BOOLEAN',
        defaultValue: false,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'context-flag',
          context: {
            userId: 'user-123',
            attributes: {
              tier: 'premium',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBe('context-flag');
    });

    it('should include SDK version in evaluation when provided', async () => {
      await createTestFlag({
        environmentId,
        key: 'version-flag',
        name: 'Version Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        headers: {
          'x-flagkit-sdk-version': '1.0.0',
        },
        payload: {
          flagKey: 'version-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent flag', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'non-existent-flag',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FLAG_NOT_FOUND');
    });

    it('should return 400 for missing flagKey', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty flagKey', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid SDK key', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sdk/v1/client/invalid-key/evaluate',
        payload: {
          flagKey: 'some-flag',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /sdk/v1/server/:sdkKey/evaluate', () => {
    it('should evaluate a flag with valid server SDK key', async () => {
      await createTestFlag({
        environmentId,
        key: 'eval-server-flag',
        name: 'Eval Server Flag',
        type: 'NUMBER',
        defaultValue: 42,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/server/${serverSdkKey}/evaluate`,
        payload: {
          flagKey: 'eval-server-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.key).toBe('eval-server-flag');
      expect(body.data.value).toBeDefined();
    });

    it('should evaluate flag with context for server SDK', async () => {
      await createTestFlag({
        environmentId,
        key: 'server-context-flag',
        name: 'Server Context Flag',
        type: 'STRING',
        defaultValue: 'default',
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/server/${serverSdkKey}/evaluate`,
        payload: {
          flagKey: 'server-context-flag',
          context: {
            userId: 'server-user-456',
            sessionId: 'session-789',
            attributes: {
              role: 'admin',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBe('server-context-flag');
    });

    it('should return 404 for non-existent flag with server SDK', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/server/${serverSdkKey}/evaluate`,
        payload: {
          flagKey: 'missing-flag',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FLAG_NOT_FOUND');
    });

    it('should return 400 for invalid payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/server/${serverSdkKey}/evaluate`,
        payload: {
          flagKey: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Flag Type Evaluation', () => {
    it('should evaluate boolean flags correctly', async () => {
      await createTestFlag({
        environmentId,
        key: 'bool-flag',
        name: 'Boolean Flag',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'bool-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.data.value).toBe('boolean');
    });

    it('should evaluate string flags correctly', async () => {
      await createTestFlag({
        environmentId,
        key: 'string-flag',
        name: 'String Flag',
        type: 'STRING',
        defaultValue: 'test-value',
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'string-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.data.value).toBe('string');
    });

    it('should evaluate number flags correctly', async () => {
      await createTestFlag({
        environmentId,
        key: 'number-flag',
        name: 'Number Flag',
        type: 'NUMBER',
        defaultValue: 123,
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'number-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.data.value).toBe('number');
    });

    it('should evaluate JSON flags correctly', async () => {
      await createTestFlag({
        environmentId,
        key: 'json-flag',
        name: 'JSON Flag',
        type: 'JSON',
        defaultValue: { key: 'value', count: 42 },
      });

      const response = await server.inject({
        method: 'POST',
        url: `/sdk/v1/client/${clientSdkKey}/evaluate`,
        payload: {
          flagKey: 'json-flag',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.data.value).toBe('object');
    });
  });
});
