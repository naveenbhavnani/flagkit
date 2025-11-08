import { prisma } from '@flagkit/database';
import { FlagType, FlagStatus, MemberRole } from '@flagkit/database';

export interface CreateFlagInput {
  key: string;
  name: string;
  description?: string;
  type?: FlagType;
  tags?: string[];
  variations?: {
    key: string;
    name: string;
    value: string;
    description?: string;
  }[];
}

export interface UpdateFlagInput {
  name?: string;
  description?: string;
  status?: FlagStatus;
  tags?: string[];
}

export interface UpdateFlagConfigInput {
  enabled?: boolean;
  defaultVariationKey?: string;
  fallbackVariationKey?: string;
  targetingRules?: unknown;
  rolloutPercentage?: number;
}

class FlagService {
  private async checkProjectPermission(projectId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const member = project.organization.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // VIEWER can read but not create/modify
    const allowedRoles = [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.PROJECT_ADMIN,
      MemberRole.DEVELOPER,
    ];

    if (!allowedRoles.includes(member.role)) {
      throw new Error('Insufficient permissions to manage flags');
    }
  }

  async create(projectId: string, userId: string, input: CreateFlagInput) {
    await this.checkProjectPermission(projectId, userId);

    // Check if flag key already exists in project
    const existing = await prisma.flag.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: input.key.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new Error('Flag with this key already exists in the project');
    }

    // Create flag with variations
    const flag = await prisma.flag.create({
      data: {
        key: input.key.toLowerCase(),
        name: input.name,
        description: input.description,
        type: input.type || FlagType.BOOLEAN,
        tags: input.tags || [],
        projectId,
        ownerId: userId,
        variations: {
          create: input.variations || [
            {
              key: 'true',
              name: 'True',
              value: JSON.stringify(true),
              description: 'Flag is enabled',
            },
            {
              key: 'false',
              name: 'False',
              value: JSON.stringify(false),
              description: 'Flag is disabled',
            },
          ],
        },
      },
      include: {
        variations: true,
        _count: {
          select: {
            envConfigs: true,
          },
        },
      },
    });

    return flag;
  }

  async getProjectFlags(projectId: string, userId: string) {
    // Verify user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.organization.members.length === 0) {
      throw new Error('Access denied');
    }

    const flags = await prisma.flag.findMany({
      where: {
        projectId,
        status: {
          not: FlagStatus.ARCHIVED,
        },
      },
      include: {
        variations: true,
        _count: {
          select: {
            envConfigs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return flags;
  }

  async getById(flagId: string, userId: string) {
    const flag = await prisma.flag.findUnique({
      where: { id: flagId },
      include: {
        variations: true,
        project: {
          include: {
            organization: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
        _count: {
          select: {
            envConfigs: true,
          },
        },
      },
    });

    if (!flag) {
      throw new Error('Flag not found');
    }

    if (flag.project.organization.members.length === 0) {
      throw new Error('Access denied');
    }

    return flag;
  }

  async update(flagId: string, userId: string, input: UpdateFlagInput) {
    const flag = await this.getById(flagId, userId);
    await this.checkProjectPermission(flag.projectId, userId);

    const updated = await prisma.flag.update({
      where: { id: flagId },
      data: {
        name: input.name,
        description: input.description,
        status: input.status,
        tags: input.tags,
      },
      include: {
        variations: true,
        _count: {
          select: {
            envConfigs: true,
          },
        },
      },
    });

    return updated;
  }

  async delete(flagId: string, userId: string) {
    const flag = await this.getById(flagId, userId);
    await this.checkProjectPermission(flag.projectId, userId);

    // Soft delete by archiving
    await prisma.flag.update({
      where: { id: flagId },
      data: {
        status: FlagStatus.ARCHIVED,
      },
    });
  }

  // Environment-specific configuration
  async getEnvironmentConfig(flagId: string, environmentId: string, userId: string) {
    const flag = await this.getById(flagId, userId);

    let config = await prisma.flagEnvironmentConfig.findUnique({
      where: {
        flagId_environmentId: {
          flagId,
          environmentId,
        },
      },
    });

    // Create default config if it doesn't exist
    if (!config) {
      const defaultVariation = flag.variations[0];
      config = await prisma.flagEnvironmentConfig.create({
        data: {
          flagId,
          environmentId,
          enabled: false,
          defaultVariationKey: defaultVariation?.key || 'false',
          fallbackVariationKey: defaultVariation?.key || 'false',
        },
      });
    }

    return config;
  }

  async updateEnvironmentConfig(
    flagId: string,
    environmentId: string,
    userId: string,
    input: UpdateFlagConfigInput
  ) {
    const flag = await this.getById(flagId, userId);
    await this.checkProjectPermission(flag.projectId, userId);

    // Verify environment belongs to the same project
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
    });

    if (!environment || environment.projectId !== flag.projectId) {
      throw new Error('Environment not found or does not belong to the flag\'s project');
    }

    // Validate variation keys if provided
    if (input.defaultVariationKey) {
      const variation = flag.variations.find((v) => v.key === input.defaultVariationKey);
      if (!variation) {
        throw new Error('Invalid default variation key');
      }
    }

    if (input.fallbackVariationKey) {
      const variation = flag.variations.find((v) => v.key === input.fallbackVariationKey);
      if (!variation) {
        throw new Error('Invalid fallback variation key');
      }
    }

    // Upsert the config
    const config = await prisma.flagEnvironmentConfig.upsert({
      where: {
        flagId_environmentId: {
          flagId,
          environmentId,
        },
      },
      update: {
        enabled: input.enabled,
        defaultVariationKey: input.defaultVariationKey,
        fallbackVariationKey: input.fallbackVariationKey,
        targetingRules: input.targetingRules,
        rolloutPercentage: input.rolloutPercentage,
      },
      create: {
        flagId,
        environmentId,
        enabled: input.enabled ?? false,
        defaultVariationKey: input.defaultVariationKey || flag.variations[0]?.key || 'false',
        fallbackVariationKey: input.fallbackVariationKey || flag.variations[0]?.key || 'false',
        targetingRules: input.targetingRules,
        rolloutPercentage: input.rolloutPercentage,
      },
    });

    return config;
  }

  async getAllEnvironmentConfigs(flagId: string, userId: string) {
    const flag = await this.getById(flagId, userId);

    // Get all environments for the flag's project
    const environments = await prisma.environment.findMany({
      where: {
        projectId: flag.projectId,
      },
    });

    // Get or create configs for each environment
    const configs = await Promise.all(
      environments.map((env) => this.getEnvironmentConfig(flagId, env.id, userId))
    );

    return configs;
  }

  async toggleFlagInEnvironment(
    flagId: string,
    environmentId: string,
    userId: string,
    enabled: boolean
  ) {
    return this.updateEnvironmentConfig(flagId, environmentId, userId, { enabled });
  }
}

export const flagService = new FlagService();
