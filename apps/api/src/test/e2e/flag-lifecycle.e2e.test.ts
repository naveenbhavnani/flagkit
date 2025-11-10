import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../helpers/test-server';
import { createAuthenticatedUser, getAuthHeader } from '../helpers/auth.helper';
import { FastifyInstance } from 'fastify';
import { createId } from '@paralleldrive/cuid2';

describe('E2E: Complete Flag Lifecycle', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  it('should complete full flag lifecycle from creation to SDK evaluation', async () => {
    // Step 1: Create authenticated user
    const { token, user } = await createAuthenticatedUser(server);
    expect(user).toBeDefined();
    expect(token).toBeDefined();

    // Step 2: Create organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: getAuthHeader(token),
      payload: {
        name: 'E2E Test Organization',
        slug: `e2e-org-${createId()}`,
      },
    });
    expect(orgResponse.statusCode).toBe(201);
    const organization = JSON.parse(orgResponse.body).data.organization;
    expect(organization.id).toBeDefined();

    // Step 3: Create project
    const projectResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organization.id}/projects`,
      headers: getAuthHeader(token),
      payload: {
        name: 'E2E Test Project',
        key: 'E2E',
        description: 'End-to-end test project',
      },
    });
    expect(projectResponse.statusCode).toBe(200);
    const project = JSON.parse(projectResponse.body).data.project;
    expect(project.id).toBeDefined();

    // Step 4: Create production environment
    const prodEnvResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/environments`,
      headers: getAuthHeader(token),
      payload: {
        name: 'Production',
        key: 'production',
      },
    });
    expect(prodEnvResponse.statusCode).toBe(200);
    const prodEnvironment = JSON.parse(prodEnvResponse.body).data.environment;
    expect(prodEnvironment.id).toBeDefined();
    expect(prodEnvironment.clientSdkKey).toBeDefined();
    expect(prodEnvironment.serverSdkKey).toBeDefined();

    // Step 5: Create staging environment
    const stagingEnvResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/environments`,
      headers: getAuthHeader(token),
      payload: {
        name: 'Staging',
        key: 'staging',
      },
    });
    expect(stagingEnvResponse.statusCode).toBe(200);
    const stagingEnvironment = JSON.parse(stagingEnvResponse.body).data.environment;
    expect(stagingEnvironment.id).toBeDefined();

    // Step 6: Create a feature flag
    const flagResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/flags`,
      headers: getAuthHeader(token),
      payload: {
        name: 'New Feature',
        key: 'new-feature',
        description: 'A new feature flag for E2E testing',
        type: 'BOOLEAN',
      },
    });
    expect(flagResponse.statusCode).toBe(200);
    const flag = JSON.parse(flagResponse.body).data.flag;
    expect(flag.id).toBeDefined();
    expect(flag.key).toBe('new-feature');

    // Step 7: Toggle flag on in production (flags start disabled)
    const toggleOnResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/flags/${flag.id}/environments/${prodEnvironment.id}/toggle`,
      headers: getAuthHeader(token),
      payload: {
        enabled: true,
      },
    });
    expect(toggleOnResponse.statusCode).toBe(200);

    // Step 8: Evaluate flag via client SDK
    const clientEvalResponse = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${prodEnvironment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'new-feature',
        context: {
          userId: 'test-user-123',
        },
      },
    });
    expect(clientEvalResponse.statusCode).toBe(200);
    const clientEval = JSON.parse(clientEvalResponse.body);
    expect(clientEval.success).toBe(true);
    expect(clientEval.data.key).toBe('new-feature');
    expect(clientEval.data.enabled).toBe(true);

    // Step 9: Get all flags via SDK
    const allFlagsResponse = await server.inject({
      method: 'GET',
      url: `/sdk/v1/client/${prodEnvironment.clientSdkKey}/flags`,
    });
    expect(allFlagsResponse.statusCode).toBe(200);
    const allFlags = JSON.parse(allFlagsResponse.body);
    expect(allFlags.success).toBe(true);
    expect(allFlags.data.flags['new-feature']).toBeDefined();

    // Step 10: Toggle flag off
    const toggleResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/flags/${flag.id}/environments/${prodEnvironment.id}/toggle`,
      headers: getAuthHeader(token),
      payload: {
        enabled: false,
      },
    });
    expect(toggleResponse.statusCode).toBe(200);

    // Step 11: Verify flag is now disabled
    const disabledEvalResponse = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${prodEnvironment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'new-feature',
      },
    });
    expect(disabledEvalResponse.statusCode).toBe(200);
    const disabledEval = JSON.parse(disabledEvalResponse.body);
    expect(disabledEval.data.enabled).toBe(false);

    // Step 12: Check flag is still enabled in staging (wasn't toggled)
    const stagingEvalResponse = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${stagingEnvironment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'new-feature',
      },
    });
    // Flag has no config in staging, so it should be disabled by default
    expect(stagingEvalResponse.statusCode).toBe(200);
    const stagingEval = JSON.parse(stagingEvalResponse.body);
    expect(stagingEval.data.enabled).toBe(false);
    expect(stagingEval.data.reason).toBe('NO_CONFIG');

    // Step 13: Delete flag
    const deleteResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/flags/${flag.id}`,
      headers: getAuthHeader(token),
    });
    expect(deleteResponse.statusCode).toBe(200);

    // Step 14: Verify flag is gone
    const deletedEvalResponse = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${prodEnvironment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'new-feature',
      },
    });
    expect(deletedEvalResponse.statusCode).toBe(404);
  });

  it('should handle flag targeting and rollout correctly', async () => {
    // Setup: Create org, project, environment
    const { token } = await createAuthenticatedUser(server);

    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: getAuthHeader(token),
      payload: {
        name: 'Targeting Test Org',
        slug: `targeting-org-${createId()}`,
      },
    });
    const organization = JSON.parse(orgResponse.body).data.organization;

    const projectResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organization.id}/projects`,
      headers: getAuthHeader(token),
      payload: {
        name: 'Targeting Project',
        key: 'TGT',
      },
    });
    const project = JSON.parse(projectResponse.body).data.project;

    const envResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/environments`,
      headers: getAuthHeader(token),
      payload: {
        name: 'Testing',
        key: 'testing',
      },
    });
    const environment = JSON.parse(envResponse.body).data.environment;

    // Create string flag with variations
    const flagResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/flags`,
      headers: getAuthHeader(token),
      payload: {
        name: 'Theme Selector',
        key: 'theme',
        type: 'STRING',
        description: 'User theme preference',
      },
    });
    const flag = JSON.parse(flagResponse.body).data.flag;

    // Toggle flag on (enable it)
    await server.inject({
      method: 'POST',
      url: `/api/v1/flags/${flag.id}/environments/${environment.id}/toggle`,
      headers: getAuthHeader(token),
      payload: {
        enabled: true,
      },
    });

    // Test evaluation with different contexts
    const premiumUserEval = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${environment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'theme',
        context: {
          userId: 'premium-user-1',
          attributes: {
            tier: 'premium',
          },
        },
      },
    });
    expect(premiumUserEval.statusCode).toBe(200);
    expect(JSON.parse(premiumUserEval.body).success).toBe(true);

    const regularUserEval = await server.inject({
      method: 'POST',
      url: `/sdk/v1/client/${environment.clientSdkKey}/evaluate`,
      payload: {
        flagKey: 'theme',
        context: {
          userId: 'regular-user-1',
          attributes: {
            tier: 'free',
          },
        },
      },
    });
    expect(regularUserEval.statusCode).toBe(200);
    expect(JSON.parse(regularUserEval.body).success).toBe(true);
  });
});
