import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { projectService, CreateProjectInput, UpdateProjectInput } from '../services/project.service';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  key: z.string().min(2, 'Key must be at least 2 characters').max(10).regex(/^[A-Z0-9]+$/, 'Key must be uppercase letters and numbers only'),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  key: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/).optional(),
  description: z.string().optional(),
});

export default async function projectRoutes(server: FastifyInstance) {
  // Create project
  server.post<{
    Body: CreateProjectInput;
    Params: { organizationId: string };
  }>('/organizations/:organizationId/projects', async (request, reply) => {
    await server.authenticate(request, reply);

    const { organizationId } = request.params;
    const validation = createProjectSchema.safeParse(request.body);

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
      const project = await projectService.create(
        organizationId,
        request.user!.id,
        validation.data
      );

      return {
        success: true,
        data: { project },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create project',
        },
      });
    }
  });

  // Get all projects for an organization
  server.get<{
    Params: { organizationId: string };
  }>('/organizations/:organizationId/projects', async (request, reply) => {
    await server.authenticate(request, reply);

    const { organizationId } = request.params;

    try {
      const projects = await projectService.getOrganizationProjects(
        organizationId,
        request.user!.id
      );

      return {
        success: true,
        data: { projects },
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

  // Get a single project
  server.get<{
    Params: { id: string };
  }>('/projects/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      const project = await projectService.getById(id, request.user!.id);

      return {
        success: true,
        data: { project },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Project not found' ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
          message: error instanceof Error ? error.message : 'Failed to get project',
        },
      });
    }
  });

  // Update a project
  server.put<{
    Params: { id: string };
    Body: UpdateProjectInput;
  }>('/projects/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;
    const validation = updateProjectSchema.safeParse(request.body);

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
      const project = await projectService.update(
        id,
        request.user!.id,
        validation.data
      );

      return {
        success: true,
        data: { project },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update project',
        },
      });
    }
  });

  // Delete a project
  server.delete<{
    Params: { id: string };
  }>('/projects/:id', async (request, reply) => {
    await server.authenticate(request, reply);

    const { id } = request.params;

    try {
      await projectService.delete(id, request.user!.id);

      return {
        success: true,
        data: { message: 'Project deleted successfully' },
      };
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 403;
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete project',
        },
      });
    }
  });
}
