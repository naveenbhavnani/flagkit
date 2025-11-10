import { prisma, Prisma } from '@flagkit/database';
import { createId } from '@paralleldrive/cuid2';
import type { FlagType } from '@prisma/client';

interface CreateFlagOptions {
  environmentId: string;
  projectId?: string;
  name?: string;
  key?: string;
  type?: FlagType;
  enabled?: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * Create a test flag
 */
export async function createTestFlag(options: CreateFlagOptions) {
  const {
    environmentId,
    projectId: providedProjectId,
    name,
    key,
    type = 'BOOLEAN',
    defaultValue,
    description,
  } = options;

  // Get projectId from environment if not provided
  let projectId = providedProjectId;
  if (!projectId) {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }
    projectId = environment.projectId;
  }

  const flagKey = key || `test-flag-${createId()}`;
  const flagName = name || `Test Flag ${flagKey}`;

  let value: unknown;
  switch (type) {
    case 'BOOLEAN':
      value = defaultValue !== undefined ? defaultValue : true;
      break;
    case 'STRING':
      value = defaultValue !== undefined ? defaultValue : 'default-string';
      break;
    case 'NUMBER':
      value = defaultValue !== undefined ? defaultValue : 100;
      break;
    case 'JSON':
      value = defaultValue !== undefined ? defaultValue : { key: 'value' };
      break;
  }

  const flag = await prisma.flag.create({
    data: {
      id: createId(),
      key: flagKey,
      name: flagName,
      description: description || `Test flag for ${flagName}`,
      type,
      projectId,
      variations: {
        create: [
          {
            id: createId(),
            key: 'on',
            value: JSON.stringify(type === 'BOOLEAN' ? true : value),
            name: 'On',
            description: 'Enabled variation',
          },
          {
            id: createId(),
            key: 'off',
            value: JSON.stringify(type === 'BOOLEAN' ? false : null),
            name: 'Off',
            description: 'Disabled variation',
          },
        ],
      },
    },
  });

  return flag;
}

/**
 * Create multiple test flags
 */
export async function createTestFlags(
  environmentId: string,
  count: number = 3
) {
  const flags = [];
  for (let i = 0; i < count; i++) {
    const flag = await createTestFlag({
      environmentId,
      name: `Test Flag ${i + 1}`,
      key: `test-flag-${i + 1}-${createId()}`,
    });
    flags.push(flag);
  }
  return flags;
}

/**
 * Create a flag with targeting rules
 */
export async function createTestFlagWithTargeting(
  environmentId: string,
  userId: string
) {
  const flag = await createTestFlag({
    environmentId,
    name: 'Targeted Flag',
    key: `targeted-flag-${createId()}`,
  });

  await prisma.flagEnvironmentConfig.create({
    data: {
      flagId: flag.id,
      environmentId,
      enabled: true,
      defaultVariationKey: 'on',
      fallbackVariationKey: 'off',
      targetingRules: [
        {
          id: createId(),
          priority: 1,
          conditions: [
            {
              attribute: 'userId',
              operator: 'equals',
              value: userId,
            },
          ],
          variationKey: 'on',
        },
      ] as Prisma.InputJsonValue,
    },
  });

  return await prisma.flag.findUnique({
    where: { id: flag.id },
  });
}

/**
 * Create a flag with percentage rollout
 */
export async function createTestFlagWithRollout(
  environmentId: string,
  percentage: number = 50
) {
  const flag = await createTestFlag({
    environmentId,
    name: 'Rollout Flag',
    key: `rollout-flag-${createId()}`,
  });

  await prisma.flagEnvironmentConfig.create({
    data: {
      flagId: flag.id,
      environmentId,
      enabled: true,
      defaultVariationKey: 'on',
      fallbackVariationKey: 'off',
      rolloutPercentage: percentage,
    },
  });

  return await prisma.flag.findUnique({
    where: { id: flag.id },
  });
}
