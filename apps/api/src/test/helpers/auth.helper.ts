import { FastifyInstance } from 'fastify';
import { prisma } from '@flagkit/database';
import { hashPassword } from '../../utils/password';
import { createId } from '@paralleldrive/cuid2';

interface TestUser {
  id: string;
  email: string;
  name: string | null;
  password: string;
}

interface AuthenticatedUser {
  user: TestUser;
  token: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  data: Partial<TestUser> = {}
): Promise<TestUser> {
  const password = data.password || 'Test123!@#';
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: data.id || createId(),
      email: data.email || `test-${createId()}@example.com`,
      name: data.name || 'Test User',
      password: hashedPassword,
    },
  });

  return {
    ...user,
    password, // Return unhashed password for testing
  };
}

/**
 * Create a test user and generate a JWT token
 */
export async function createAuthenticatedUser(
  server: FastifyInstance,
  userData: Partial<TestUser> = {}
): Promise<AuthenticatedUser> {
  const user = await createTestUser(userData);
  const token = server.jwt.sign({ userId: user.id, email: user.email });

  return {
    user,
    token,
  };
}

/**
 * Create a test organization with owner
 */
export async function createTestOrganization(
  server: FastifyInstance,
  orgName?: string
) {
  const { user, token } = await createAuthenticatedUser(server);

  const organization = await prisma.organization.create({
    data: {
      id: createId(),
      name: orgName || `Test Org ${createId()}`,
      slug: `test-org-${createId()}`,
      members: {
        create: {
          id: createId(),
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  return {
    user,
    token,
    organization,
  };
}

/**
 * Create a test project within an organization
 */
export async function createTestProject(
  server: FastifyInstance,
  projectName?: string
) {
  const { user, token, organization } = await createTestOrganization(server);

  const project = await prisma.project.create({
    data: {
      id: createId(),
      name: projectName || `Test Project ${createId()}`,
      key: `test-project-${createId()}`,
      organizationId: organization.id,
    },
  });

  return {
    user,
    token,
    organization,
    project,
  };
}

/**
 * Create a test environment within a project
 */
export async function createTestEnvironment(
  server: FastifyInstance,
  envName?: string
) {
  const { user, token, organization, project } = await createTestProject(server);

  const environment = await prisma.environment.create({
    data: {
      id: createId(),
      name: envName || 'Test Environment',
      key: `test-env-${createId()}`,
      projectId: project.id,
    },
  });

  return {
    user,
    token,
    organization,
    project,
    environment,
  };
}

/**
 * Create a test SDK key (returns the SDK key from an environment)
 */
export async function createTestSDKKey(
  server: FastifyInstance,
  type: 'CLIENT' | 'SERVER' = 'CLIENT'
) {
  const { user, token, organization, project, environment } =
    await createTestEnvironment(server);

  return {
    user,
    token,
    organization,
    project,
    environment,
    key: type === 'CLIENT' ? environment.clientSdkKey : environment.serverSdkKey,
  };
}

/**
 * Get authorization header with Bearer token
 */
export function getAuthHeader(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}
