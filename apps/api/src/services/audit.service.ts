import type { PrismaClient, AuditAction, AuditResourceType, Prisma } from '@flagkit/database';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit event
   */
  async log(params: {
    action: AuditAction;
    resourceType: AuditResourceType;
    resourceId?: string;
    userId?: string;
    organizationId: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          userId: params.userId,
          organizationId: params.organizationId,
          changes: params.changes as Prisma.JsonObject || undefined,
          metadata: params.metadata as Prisma.JsonObject || undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      // Don't let audit logging failure break the request
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log a flag change (more detailed than audit log)
   */
  async logFlagChange(params: {
    flagId: string;
    userId?: string;
    changeType: 'CREATED' | 'UPDATED' | 'TOGGLED' | 'DELETED' | 'CONFIG_UPDATED';
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    comment?: string;
  }) {
    try {
      await this.prisma.flagChange.create({
        data: {
          flagId: params.flagId,
          userId: params.userId,
          changeType: params.changeType,
          before: params.before as Prisma.JsonObject || undefined,
          after: params.after as Prisma.JsonObject || undefined,
          comment: params.comment,
        },
      });
    } catch (error) {
      console.error('Failed to log flag change:', error);
    }
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationAuditLogs(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      resourceType?: AuditResourceType;
      resourceId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (options.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options.resourceId) {
      where.resourceId = options.resourceId;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }

  /**
   * Get flag change history
   */
  async getFlagChangeHistory(
    flagId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const [changes, total] = await Promise.all([
      this.prisma.flagChange.findMany({
        where: {
          flagId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.flagChange.count({ where: { flagId } }),
    ]);

    return {
      changes,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(
    organizationId: string,
    resourceType: AuditResourceType,
    resourceId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.getOrganizationAuditLogs(organizationId, {
      ...options,
      resourceType,
      resourceId,
    });
  }

  /**
   * Helper method to create audit log from request context
   */
  createAuditLogger(organizationId: string, userId?: string, req?: { ip?: string; headers?: { 'user-agent'?: string } }) {
    return {
      log: (params: {
        action: AuditAction;
        resourceType: AuditResourceType;
        resourceId?: string;
        changes?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      }) => {
        return this.log({
          ...params,
          organizationId,
          userId,
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        });
      },

      logFlagChange: (params: {
        flagId: string;
        changeType: 'CREATED' | 'UPDATED' | 'TOGGLED' | 'DELETED' | 'CONFIG_UPDATED';
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
        comment?: string;
      }) => {
        return this.logFlagChange({
          ...params,
          userId,
        });
      },
    };
  }
}
