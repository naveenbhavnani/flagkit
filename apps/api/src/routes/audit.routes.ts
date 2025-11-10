import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuditResourceType } from '@flagkit/database';
import { AuditService } from '../services/audit.service';
import { prisma } from '@flagkit/database';

const auditService = new AuditService(prisma);

const getAuditLogsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  resourceType: z.nativeEnum(AuditResourceType).optional(),
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const getFlagHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export default async function auditRoutes(fastify: FastifyInstance) {
  // Get audit logs for an organization
  fastify.get(
    '/api/v1/organizations/:organizationId/audit-logs',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { organizationId } = request.params as { organizationId: string };
        const query = getAuditLogsQuerySchema.parse(request.query);

        // Verify user has access to the organization
        const member = await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            userId: request.user.id,
          },
        });

        if (!member) {
          return reply.status(403).send({
            success: false,
            error: { message: 'Access denied' },
          });
        }

        const result = await auditService.getOrganizationAuditLogs(organizationId, {
          limit: query.limit,
          offset: query.offset,
          resourceType: query.resourceType,
          resourceId: query.resourceId,
          userId: query.userId,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch audit logs' },
        });
      }
    }
  );

  // Get audit logs for a specific resource
  fastify.get(
    '/api/v1/audit-logs/:resourceType/:resourceId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { resourceType, resourceId } = request.params as {
          resourceType: AuditResourceType;
          resourceId: string;
        };
        const query = getAuditLogsQuerySchema.parse(request.query);

        // Determine organization based on resource type
        let organizationId: string | null = null;

        switch (resourceType) {
          case 'FLAG': {
            const flag = await prisma.flag.findUnique({
              where: { id: resourceId },
              include: {
                project: {
                  select: { organizationId: true },
                },
              },
            });
            organizationId = flag?.project.organizationId || null;
            break;
          }
          case 'PROJECT': {
            const project = await prisma.project.findUnique({
              where: { id: resourceId },
              select: { organizationId: true },
            });
            organizationId = project?.organizationId || null;
            break;
          }
          case 'ENVIRONMENT': {
            const environment = await prisma.environment.findUnique({
              where: { id: resourceId },
              include: {
                project: {
                  select: { organizationId: true },
                },
              },
            });
            organizationId = environment?.project.organizationId || null;
            break;
          }
          case 'ORGANIZATION': {
            organizationId = resourceId;
            break;
          }
          default:
            return reply.status(400).send({
              success: false,
              error: { message: 'Invalid resource type' },
            });
        }

        if (!organizationId) {
          return reply.status(404).send({
            success: false,
            error: { message: 'Resource not found' },
          });
        }

        // Verify user has access to the organization
        const member = await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            userId: request.user.id,
          },
        });

        if (!member) {
          return reply.status(403).send({
            success: false,
            error: { message: 'Access denied' },
          });
        }

        const result = await auditService.getResourceAuditLogs(
          organizationId,
          resourceType,
          resourceId,
          {
            limit: query.limit,
            offset: query.offset,
          }
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch audit logs' },
        });
      }
    }
  );

  // Get flag change history
  fastify.get(
    '/api/v1/flags/:flagId/history',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { flagId } = request.params as { flagId: string };
        const query = getFlagHistoryQuerySchema.parse(request.query);

        // Verify user has access to the flag
        const flag = await prisma.flag.findUnique({
          where: { id: flagId },
          include: {
            project: {
              include: {
                organization: {
                  include: {
                    members: {
                      where: { userId: request.user.id },
                    },
                  },
                },
              },
            },
          },
        });

        if (!flag) {
          return reply.status(404).send({
            success: false,
            error: { message: 'Flag not found' },
          });
        }

        if (flag.project.organization.members.length === 0) {
          return reply.status(403).send({
            success: false,
            error: { message: 'Access denied' },
          });
        }

        const result = await auditService.getFlagChangeHistory(flagId, {
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch flag history' },
        });
      }
    }
  );
}
