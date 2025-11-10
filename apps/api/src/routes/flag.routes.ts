import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FlagType, FlagStatus } from '@flagkit/database';
import {
  flagService,
  CreateFlagInput,
  UpdateFlagInput,
  UpdateFlagConfigInput,
} from '../services/flag.service';

const createFlagSchema = z.object({
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Key must be lowercase letters, numbers, underscores, and hyphens only'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(FlagType).optional(),
  tags: z.array(z.string()).optional(),
  variations: z
    .array(
      z.object({
        key: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        value: z.string(),
        description: z.string().max(200).optional(),
      })
    )
    .optional(),
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.nativeEnum(FlagStatus).optional(),
  tags: z.array(z.string()).optional(),
});

const updateFlagConfigSchema = z.object({
  enabled: z.boolean().optional(),
  defaultVariationKey: z.string().optional(),
  fallbackVariationKey: z.string().optional(),
  targetingRules: z.unknown().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
});

const toggleFlagSchema = z.object({
  enabled: z.boolean(),
});

export default async function flagRoutes(server: FastifyInstance) {
  // Create flag
  server.post<{
    Body: CreateFlagInput;
    Params: { projectId: string };
  }>('/projects/:projectId/flags', async (request, reply) => {
    await server.authenticate(request, reply);

    const { projectId } = request.params;
    const validation = createFlagSchema.safeParse(request.body);

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
      const flag = await flagService.create(projectId, request.user!.id, validation.data);

      return {
        success: true,
        data: { flag },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create flag',
        },
      });
    }
  });

  // Get all flags for a project
  server.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/flags', async (request, reply) => {
    await server.authenticate(request, reply);

    const { projectId } = request.params;

    try {
      const flags = await flagService.getProjectFlags(projectId, request.user!.id);

      return {
        success: true,
        data: { flags },
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

  // Get a single flag
  server.get<{
    Params: { id: string };
  }>('/flags/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      const flag = await flagService.getById(id, request.user!.id);

      return {
        success: true,
        data: { flag },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Flag not found' ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Failed to get flag',
        },
      });
    }
  });

  // Update a flag
  server.put<{
    Params: { id: string };
    Body: UpdateFlagInput;
  }>('/flags/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;
    const validation = updateFlagSchema.safeParse(request.body);

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
      const flag = await flagService.update(id, request.user!.id, validation.data);

      return {
        success: true,
        data: { flag },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update flag',
        },
      });
    }
  });

  // Delete a flag (soft delete/archive)
  server.delete<{
    Params: { id: string };
  }>('/flags/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      await flagService.delete(id, request.user!.id);

      return {
        success: true,
        data: { message: 'Flag archived successfully' },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to archive flag',
        },
      });
    }
  });

  // Get environment-specific config
  server.get<{
    Params: { id: string; environmentId: string };
  }>('/flags/:id/environments/:environmentId/config', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id, environmentId } = request.params;

    try {
      const config = await flagService.getEnvironmentConfig(id, environmentId, request.user!.id);

      return {
        success: true,
        data: { config },
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

  // Update environment-specific config
  server.put<{
    Params: { id: string; environmentId: string };
    Body: UpdateFlagConfigInput;
  }>('/flags/:id/environments/:environmentId/config', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id, environmentId } = request.params;
    const validation = updateFlagConfigSchema.safeParse(request.body);

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
      const config = await flagService.updateEnvironmentConfig(
        id,
        environmentId,
        request.user!.id,
        validation.data
      );

      return {
        success: true,
        data: { config },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update flag configuration',
        },
      });
    }
  });

  // Toggle flag in environment (convenience endpoint)
  server.post<{
    Params: { id: string; environmentId: string };
    Body: { enabled: boolean };
  }>('/flags/:id/environments/:environmentId/toggle', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id, environmentId } = request.params;
    const validation = toggleFlagSchema.safeParse(request.body);

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
      const config = await flagService.toggleFlagInEnvironment(
        id,
        environmentId,
        request.user!.id,
        validation.data.enabled
      );

      return {
        success: true,
        data: { config },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'TOGGLE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to toggle flag',
        },
      });
    }
  });

  // Get all environment configs for a flag
  server.get<{
    Params: { id: string };
  }>('/flags/:id/environments/configs', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      const configs = await flagService.getAllEnvironmentConfigs(id, request.user!.id);

      return {
        success: true,
        data: { configs },
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
}
