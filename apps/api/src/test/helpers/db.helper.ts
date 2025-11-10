import { prisma } from '@flagkit/database';

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
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

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [users, organizations, projects, environments, flags, apiTokens] =
    await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.project.count(),
      prisma.environment.count(),
      prisma.flag.count(),
      prisma.apiToken.count(),
    ]);

  return {
    users,
    organizations,
    projects,
    environments,
    flags,
    apiTokens,
  };
}

/**
 * Check if database is empty
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const stats = await getDatabaseStats();
  return Object.values(stats).every((count) => count === 0);
}
