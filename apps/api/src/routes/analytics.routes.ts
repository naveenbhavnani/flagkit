import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MetricInterval } from '@flagkit/database';
import { AnalyticsService } from '../services/analytics.service';
import { prisma } from '@flagkit/database';

const analyticsService = new AnalyticsService(prisma);

const getAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(['HOUR', 'DAY']).optional().default('HOUR'),
  environmentId: z.string().optional(),
});

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Get analytics for a specific flag
  fastify.get(
    '/api/v1/flags/:flagId/analytics',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { flagId } = request.params as { flagId: string };
        const query = getAnalyticsQuerySchema.parse(request.query);

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

        // If no environmentId provided, get analytics for all environments
        let analytics;
        if (query.environmentId) {
          // Verify environment belongs to same project
          const environment = await prisma.environment.findFirst({
            where: {
              id: query.environmentId,
              projectId: flag.projectId,
            },
          });

          if (!environment) {
            return reply.status(404).send({
              success: false,
              error: { message: 'Environment not found or does not belong to this flag' },
            });
          }

          analytics = await analyticsService.getFlagAnalytics(flagId, query.environmentId, {
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            interval: query.interval as MetricInterval,
          });
        } else {
          // Get analytics for all environments in the project
          const environments = await prisma.environment.findMany({
            where: { projectId: flag.projectId },
          });

          const allAnalytics = await Promise.all(
            environments.map(async (env) => {
              const envAnalytics = await analyticsService.getFlagAnalytics(flagId, env.id, {
                startDate: query.startDate ? new Date(query.startDate) : undefined,
                endDate: query.endDate ? new Date(query.endDate) : undefined,
                interval: query.interval as MetricInterval,
              });

              return {
                environmentId: env.id,
                environmentName: env.name,
                environmentKey: env.key,
                ...envAnalytics,
              };
            })
          );

          return reply.send({
            success: true,
            data: { environments: allAnalytics },
          });
        }

        return reply.send({
          success: true,
          data: analytics,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch analytics' },
        });
      }
    }
  );

  // Get analytics for all flags in an environment
  fastify.get(
    '/api/v1/environments/:environmentId/analytics',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { environmentId } = request.params as { environmentId: string };
        const query = getAnalyticsQuerySchema.parse(request.query);

        // Verify user has access to the environment
        const environment = await prisma.environment.findUnique({
          where: { id: environmentId },
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

        if (!environment) {
          return reply.status(404).send({
            success: false,
            error: { message: 'Environment not found' },
          });
        }

        if (environment.project.organization.members.length === 0) {
          return reply.status(403).send({
            success: false,
            error: { message: 'Access denied' },
          });
        }

        // Get analytics for all flags in the environment
        const analytics = await analyticsService.getEnvironmentAnalytics(environmentId, {
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        });

        // Enrich with flag details
        const flagIds = analytics.map((a) => a.flagId);
        const flags = await prisma.flag.findMany({
          where: { id: { in: flagIds } },
          select: {
            id: true,
            key: true,
            name: true,
          },
        });

        const flagMap = new Map(flags.map((f) => [f.id, f]));

        const enrichedAnalytics = analytics.map((a) => ({
          ...a,
          flag: flagMap.get(a.flagId),
        }));

        return reply.send({
          success: true,
          data: enrichedAnalytics,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch environment analytics' },
        });
      }
    }
  );

  // Get analytics summary for a project
  fastify.get(
    '/api/v1/projects/:projectId/analytics/summary',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const query = getAnalyticsQuerySchema.parse(request.query);

        // Verify user has access to the project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            organization: {
              include: {
                members: {
                  where: { userId: request.user.id },
                },
              },
            },
            environments: true,
          },
        });

        if (!project) {
          return reply.status(404).send({
            success: false,
            error: { message: 'Project not found' },
          });
        }

        if (project.organization.members.length === 0) {
          return reply.status(403).send({
            success: false,
            error: { message: 'Access denied' },
          });
        }

        // Get analytics for all environments in the project
        const environmentAnalytics = await Promise.all(
          project.environments.map(async (env) => {
            const analytics = await analyticsService.getEnvironmentAnalytics(env.id, {
              startDate: query.startDate ? new Date(query.startDate) : undefined,
              endDate: query.endDate ? new Date(query.endDate) : undefined,
            });

            return {
              environmentId: env.id,
              environmentName: env.name,
              environmentKey: env.key,
              totalEvaluations: analytics.reduce((sum, a) => sum + a.totalEvaluations, 0),
              totalUniqueUsers: analytics.reduce((sum, a) => sum + a.uniqueUsers, 0),
              flagCount: analytics.length,
            };
          })
        );

        return reply.send({
          success: true,
          data: {
            projectId,
            projectName: project.name,
            environments: environmentAnalytics,
            totalEvaluations: environmentAnalytics.reduce((sum, e) => sum + e.totalEvaluations, 0),
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { message: 'Failed to fetch project analytics summary' },
        });
      }
    }
  );
}
