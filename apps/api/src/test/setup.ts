import { beforeAll, afterAll } from 'vitest';
import { prisma } from '@flagkit/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

/**
 * Clean up database
 * This is exported so individual test files can call it when needed
 */
export async function cleanDatabase() {
  // Delete in order to respect foreign key constraints
  await prisma.flagEvaluation.deleteMany();
  await prisma.flagMetrics.deleteMany();
  await prisma.experimentResult.deleteMany();
  await prisma.experiment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.flagChange.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.flagEnvironmentConfig.deleteMany();
  await prisma.flagVariation.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();

  // Clean database once at the start of the test suite
  await cleanDatabase();
});

afterAll(async () => {
  // Clean up after all tests complete
  await cleanDatabase();

  // Disconnect from database
  await prisma.$disconnect();
});
