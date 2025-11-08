import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sdkService, EvaluationContext } from '../services/sdk.service';

const evaluateRequestSchema = z.object({
  flagKey: z.string().min(1),
  context: z
    .object({
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      attributes: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export default async function sdkRoutes(server: FastifyInstance) {
  // Get all flags for client SDK
  server.get<{
    Params: { sdkKey: string };
  }>('/sdk/v1/client/:sdkKey/flags', async (request, reply) => {
    const { sdkKey } = request.params;

    try {
      const result = await sdkService.getAllFlags(sdkKey, 'client');

      if (!result) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_SDK_KEY',
            message: 'Invalid client SDK key',
          },
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to evaluate flags',
        },
      });
    }
  });

  // Get all flags for server SDK
  server.get<{
    Params: { sdkKey: string };
  }>('/sdk/v1/server/:sdkKey/flags', async (request, reply) => {
    const { sdkKey } = request.params;

    try {
      const result = await sdkService.getAllFlags(sdkKey, 'server');

      if (!result) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_SDK_KEY',
            message: 'Invalid server SDK key',
          },
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to evaluate flags',
        },
      });
    }
  });

  // Evaluate a specific flag for client SDK
  server.post<{
    Params: { sdkKey: string };
    Body: { flagKey: string; context?: EvaluationContext };
  }>('/sdk/v1/client/:sdkKey/evaluate', async (request, reply) => {
    const { sdkKey } = request.params;
    const validation = evaluateRequestSchema.safeParse(request.body);

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

    const { flagKey, context } = validation.data;

    try {
      const result = await sdkService.evaluateFlag(sdkKey, 'client', flagKey, context);

      if (!result) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'FLAG_NOT_FOUND',
            message: 'Flag not found or SDK key is invalid',
          },
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to evaluate flag',
        },
      });
    }
  });

  // Evaluate a specific flag for server SDK
  server.post<{
    Params: { sdkKey: string };
    Body: { flagKey: string; context?: EvaluationContext };
  }>('/sdk/v1/server/:sdkKey/evaluate', async (request, reply) => {
    const { sdkKey } = request.params;
    const validation = evaluateRequestSchema.safeParse(request.body);

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

    const { flagKey, context } = validation.data;

    try {
      const result = await sdkService.evaluateFlag(sdkKey, 'server', flagKey, context);

      if (!result) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'FLAG_NOT_FOUND',
            message: 'Flag not found or SDK key is invalid',
          },
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to evaluate flag',
        },
      });
    }
  });
}
