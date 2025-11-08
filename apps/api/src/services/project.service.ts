import { prisma } from '@flagkit/database';
import { MemberRole } from '@prisma/client';

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  key?: string;
  description?: string;
}

class ProjectService {
  /**
   * Create a new project
   */
  async create(organizationId: string, userId: string, input: CreateProjectInput) {
    // Check if user has permission (OWNER, ADMIN, or PROJECT_ADMIN)
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_ADMIN],
        },
      },
    });

    if (!member) {
      throw new Error('Insufficient permissions');
    }

    // Check if project key already exists in organization
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key: input.key.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new Error('Project with this key already exists in the organization');
    }

    const project = await prisma.project.create({
      data: {
        name: input.name,
        key: input.key.toUpperCase(),
        description: input.description,
        organizationId,
      },
    });

    return project;
  }

  /**
   * Get all projects for an organization
   */
  async getOrganizationProjects(organizationId: string, userId: string) {
    // Verify user is a member of the organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!member) {
      throw new Error('Not a member of this organization');
    }

    const projects = await prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            environments: true,
            flags: true,
          },
        },
      },
    });

    return projects;
  }

  /**
   * Get a single project by ID
   */
  async getById(projectId: string, userId: string) {
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
        environments: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            flags: true,
            segments: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is a member of the organization
    if (project.organization.members.length === 0) {
      throw new Error('Not a member of this organization');
    }

    return project;
  }

  /**
   * Update a project
   */
  async update(projectId: string, userId: string, input: UpdateProjectInput) {
    const project = await this.getById(projectId, userId);

    // Check if user has permission (OWNER, ADMIN, or PROJECT_ADMIN)
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: project.organizationId,
        userId,
        role: {
          in: [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.PROJECT_ADMIN],
        },
      },
    });

    if (!member) {
      throw new Error('Insufficient permissions');
    }

    // If updating key, check it doesn't conflict
    if (input.key && input.key !== project.key) {
      const existing = await prisma.project.findUnique({
        where: {
          organizationId_key: {
            organizationId: project.organizationId,
            key: input.key.toUpperCase(),
          },
        },
      });

      if (existing) {
        throw new Error('Project with this key already exists in the organization');
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.key && { key: input.key.toUpperCase() }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });

    return updated;
  }

  /**
   * Delete a project
   */
  async delete(projectId: string, userId: string) {
    const project = await this.getById(projectId, userId);

    // Only OWNER or ADMIN can delete projects
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: project.organizationId,
        userId,
        role: {
          in: [MemberRole.OWNER, MemberRole.ADMIN],
        },
      },
    });

    if (!member) {
      throw new Error('Only organization owners and admins can delete projects');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  }
}

export const projectService = new ProjectService();
