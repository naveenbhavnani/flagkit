import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { organizationService } from '@/services/organization.service';
import { MemberRole } from '@flagkit/database';

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(MemberRole),
});

export default async function organizationRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/organizations
   * Create a new organization
   */
  server.post(
    '/',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createOrganizationSchema.parse(request.body);
        const organization = await organizationService.create(request.user.id, body);

        return reply.status(201).send({
          success: true,
          data: { organization },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          });
        }

        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'CREATE_ERROR',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        });
      }
    }
  );

  /**
   * GET /api/v1/organizations
   * Get all organizations for the current user
   */
  server.get(
    '/',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const organizations = await organizationService.getUserOrganizations(
          request.user.id
        );

        return reply.status(200).send({
          success: true,
          data: { organizations },
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch organizations',
          },
        });
      }
    }
  );

  /**
   * GET /api/v1/organizations/:id
   * Get organization details
   */
  server.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      try {
        const organization = await organizationService.getById(
          request.params.id,
          request.user.id
        );

        return reply.status(200).send({
          success: true,
          data: { organization },
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch organization',
          },
        });
      }
    }
  );

  /**
   * PUT /api/v1/organizations/:id
   * Update organization
   */
  server.put<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      try {
        const body = updateOrganizationSchema.parse(request.body);
        const organization = await organizationService.update(
          request.params.id,
          request.user.id,
          body
        );

        return reply.status(200).send({
          success: true,
          data: { organization },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          });
        }

        if (error instanceof Error) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'UPDATE_ERROR',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update organization',
          },
        });
      }
    }
  );

  /**
   * POST /api/v1/organizations/:id/members
   * Invite a member to the organization
   */
  server.post<{ Params: { id: string } }>(
    '/:id/members',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      try {
        const body = inviteMemberSchema.parse(request.body);
        const member = await organizationService.inviteMember(
          request.params.id,
          request.user.id,
          body
        );

        return reply.status(201).send({
          success: true,
          data: { member },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          });
        }

        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVITE_ERROR',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to invite member',
          },
        });
      }
    }
  );

  /**
   * DELETE /api/v1/organizations/:id/members/:userId
   * Remove a member from the organization
   */
  server.delete<{ Params: { id: string; userId: string } }>(
    '/:id/members/:userId',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      try {
        await organizationService.removeMember(
          request.params.id,
          request.user.id,
          request.params.userId
        );

        return reply.status(200).send({
          success: true,
          data: { message: 'Member removed successfully' },
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'REMOVE_ERROR',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to remove member',
          },
        });
      }
    }
  );

  /**
   * DELETE /api/v1/organizations/:id
   * Delete organization
   */
  server.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      try {
        await organizationService.delete(request.params.id, request.user.id);

        return reply.status(200).send({
          success: true,
          data: { message: 'Organization deleted successfully' },
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'DELETE_ERROR',
              message: error.message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete organization',
          },
        });
      }
    }
  );
}
