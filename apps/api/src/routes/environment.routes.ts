import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  environmentService,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
} from '../services/environment.service';

const createEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase letters, numbers, and hyphens only'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
});

const updateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  key: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const regenerateKeysSchema = z.object({
  keyType: z.enum(['client', 'server', 'both']),
});

export default async function environmentRoutes(server: FastifyInstance) {
  // Create environment
  server.post<{
    Body: CreateEnvironmentInput;
    Params: { projectId: string };
  }>('/projects/:projectId/environments', async (request, reply) => {
    await server.authenticate(request, reply);

    const { projectId } = request.params;
    const validation = createEnvironmentSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      });
    }

    try {
      const environment = await environmentService.create(
        projectId,
        request.user!.id,
        validation.data
      );

      return {
        success: true,
        data: { environment },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create environment',
        },
      });
    }
  });

  // Get all environments for a project
  server.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/environments', async (request, reply) => {
    await server.authenticate(request, reply);

    const { projectId } = request.params;

    try {
      const environments = await environmentService.getProjectEnvironments(
        projectId,
        request.user!.id
      );

      return {
        success: true,
        data: { environments },
      };
    } catch (error) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Access denied',
        },
      });
    }
  });

  // Get a single environment
  server.get<{
    Params: { id: string };
  }>('/environments/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      const environment = await environmentService.getById(id, request.user!.id);

      return {
        success: true,
        data: { environment },
      };
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message === 'Environment not found' ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Failed to get environment',
        },
      });
    }
  });

  // Update an environment
  server.put<{
    Params: { id: string };
    Body: UpdateEnvironmentInput;
  }>('/environments/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;
    const validation = updateEnvironmentSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      });
    }

    try {
      const environment = await environmentService.update(id, request.user!.id, validation.data);

      return {
        success: true,
        data: { environment },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update environment',
        },
      });
    }
  });

  // Delete an environment
  server.delete<{
    Params: { id: string };
  }>('/environments/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      await environmentService.delete(id, request.user!.id);

      return {
        success: true,
        data: { message: 'Environment deleted successfully' },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete environment',
        },
      });
    }
  });

  // Regenerate SDK keys
  server.post<{
    Params: { id: string };
    Body: { keyType: 'client' | 'server' | 'both' };
  }>('/environments/:id/regenerate-keys', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;
    const validation = regenerateKeysSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      });
    }

    try {
      const environment = await environmentService.regenerateSdkKeys(
        id,
        request.user!.id,
        validation.data.keyType
      );

      return {
        success: true,
        data: { environment },
      };
    } catch (error) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'REGENERATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to regenerate SDK keys',
        },
      });
    }
  });
}
