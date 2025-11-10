import { prisma, MemberRole } from '@flagkit/database';

export interface CreateEnvironmentInput {
  name: string;
  key: string;
  color?: string;
}

export interface UpdateEnvironmentInput {
  name?: string;
  key?: string;
  color?: string;
}

class EnvironmentService {
  /**
   * Check if user has permission to manage environments in a project
   */
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
      throw new Error('Not a member of this organization');
    }

    // Only OWNER, ADMIN, and PROJECT_ADMIN can manage environments
    const allowedRoles: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_ADMIN];
    if (!allowedRoles.includes(member.role)) {
      throw new Error('Insufficient permissions to manage environments');
    }
  }

  /**
   * Create a new environment
   */
  async create(projectId: string, userId: string, input: CreateEnvironmentInput) {
    await this.checkProjectPermission(projectId, userId);

    // Check if environment key already exists in project
    const existing = await prisma.environment.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: input.key.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new Error('Environment with this key already exists in the project');
    }

    const environment = await prisma.environment.create({
      data: {
        name: input.name,
        key: input.key.toLowerCase(),
        color: input.color,
        projectId,
      },
    });

    return environment;
  }

  /**
   * Get all environments for a project
   */
  async getProjectEnvironments(projectId: string, userId: string) {
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
      throw new Error('Not a member of this organization');
    }

    const environments = await prisma.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            flagConfigs: true,
          },
        },
      },
    });

    return environments;
  }

  /**
   * Get a single environment by ID
   */
  async getById(environmentId: string, userId: string) {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
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
            flagConfigs: true,
          },
        },
      },
    });

    if (!environment) {
      throw new Error('Environment not found');
    }

    if (environment.project.organization.members.length === 0) {
      throw new Error('Not a member of this organization');
    }

    return environment;
  }

  /**
   * Update an environment
   */
  async update(environmentId: string, userId: string, input: UpdateEnvironmentInput) {
    const environment = await this.getById(environmentId, userId);
    await this.checkProjectPermission(environment.projectId, userId);

    // If updating key, check it doesn't conflict
    if (input.key && input.key !== environment.key) {
      const existing = await prisma.environment.findUnique({
        where: {
          projectId_key: {
            projectId: environment.projectId,
            key: input.key.toLowerCase(),
          },
        },
      });

      if (existing) {
        throw new Error('Environment with this key already exists in the project');
      }
    }

    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.key && { key: input.key.toLowerCase() }),
        ...(input.color !== undefined && { color: input.color }),
      },
    });

    return updated;
  }

  /**
   * Delete an environment
   */
  async delete(environmentId: string, userId: string) {
    const environment = await this.getById(environmentId, userId);
    await this.checkProjectPermission(environment.projectId, userId);

    await prisma.environment.delete({
      where: { id: environmentId },
    });

    return { success: true };
  }

  /**
   * Regenerate SDK keys for an environment
   */
  async regenerateSdkKeys(
    environmentId: string,
    userId: string,
    keyType: 'client' | 'server' | 'both'
  ) {
    const environment = await this.getById(environmentId, userId);
    await this.checkProjectPermission(environment.projectId, userId);

    const { createId } = await import('@paralleldrive/cuid2');

    const updateData: { clientSdkKey?: string; serverSdkKey?: string } = {};

    if (keyType === 'client' || keyType === 'both') {
      updateData.clientSdkKey = createId();
    }

    if (keyType === 'server' || keyType === 'both') {
      updateData.serverSdkKey = createId();
    }

    const updated = await prisma.environment.update({
      where: { id: environmentId },
      data: updateData,
    });

    return updated;
  }
}

export const environmentService = new EnvironmentService();
