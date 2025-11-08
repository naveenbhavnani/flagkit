import { prisma, MemberRole } from '@flagkit/database';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  logoUrl?: string;
}

export interface InviteMemberInput {
  email: string;
  role: MemberRole;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  async create(userId: string, input: CreateOrganizationInput) {
    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error('Organization with this slug already exists');
    }

    // Create organization and add creator as owner
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: {
          create: {
            userId,
            role: MemberRole.OWNER,
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return organization;
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                projects: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Get organization by ID
   */
  async getById(organizationId: string, userId: string) {
    // Check if user has access
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) {
      throw new Error('Organization not found or access denied');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    return {
      ...organization,
      userRole: member.role,
    };
  }

  /**
   * Update organization
   */
  async update(organizationId: string, userId: string, input: UpdateOrganizationInput) {
    // Check if user is owner or admin
    const member = await this.checkPermission(organizationId, userId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
    });

    return organization;
  }

  /**
   * Invite member to organization
   */
  async inviteMember(organizationId: string, userId: string, input: InviteMemberInput) {
    // Check if user is owner or admin
    await this.checkPermission(organizationId, userId, [MemberRole.OWNER, MemberRole.ADMIN]);

    // Find user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!invitedUser) {
      throw new Error('User with this email does not exist');
    }

    // Check if user is already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: invitedUser.id,
          organizationId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        userId: invitedUser.id,
        organizationId,
        role: input.role,
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, memberUserId: string) {
    // Check if user is owner or admin
    await this.checkPermission(organizationId, userId, [MemberRole.OWNER, MemberRole.ADMIN]);

    // Cannot remove yourself if you're the only owner
    if (userId === memberUserId) {
      const owners = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: MemberRole.OWNER,
        },
      });

      if (owners === 1) {
        throw new Error('Cannot remove the only owner of the organization');
      }
    }

    await prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Delete organization (owner only)
   */
  async delete(organizationId: string, userId: string) {
    // Check if user is owner
    await this.checkPermission(organizationId, userId, [MemberRole.OWNER]);

    // Delete organization (cascade will delete members, projects, etc.)
    await prisma.organization.delete({
      where: { id: organizationId },
    });

    return { success: true };
  }

  /**
   * Check if user has required permission
   */
  private async checkPermission(
    organizationId: string,
    userId: string,
    allowedRoles: MemberRole[]
  ) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) {
      throw new Error('Access denied');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new Error('Insufficient permissions');
    }

    return member;
  }
}

export const organizationService = new OrganizationService();
