import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { generateAccessToken, generateRefreshToken } from '@/utils/jwt';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default async function authRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const body = registerSchema.parse(request.body);

      // Register user
      const user = await authService.register(body);

      // Generate tokens
      const accessToken = generateAccessToken(server, {
        userId: user.id,
        email: user.email,
      });

      const refreshToken = generateRefreshToken(server, {
        userId: user.id,
        email: user.email,
      });

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
          },
        },
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
            code: 'REGISTRATION_ERROR',
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
  });

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const body = loginSchema.parse(request.body);

      // Login user
      const user = await authService.login(body);

      // Generate tokens
      const accessToken = generateAccessToken(server, {
        userId: user.id,
        email: user.email,
      });

      const refreshToken = generateRefreshToken(server, {
        userId: user.id,
        email: user.email,
      });

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
          },
        },
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
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
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
  });

  /**
   * GET /api/v1/auth/me
   * Get current user profile (protected route)
   */
  server.get(
    '/me',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await authService.getUserById(request.user.userId);

        return reply.status(200).send({
          success: true,
          data: { user },
        });
      } catch (error) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Refresh token is required',
          },
        });
      }

      // Verify refresh token
      const payload = await server.jwt.verify<{ userId: string; email: string }>(refreshToken);

      // Generate new tokens
      const newAccessToken = generateAccessToken(server, {
        userId: payload.userId,
        email: payload.email,
      });

      const newRefreshToken = generateRefreshToken(server, {
        userId: payload.userId,
        email: payload.email,
      });

      return reply.status(200).send({
        success: true,
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 7 * 24 * 60 * 60,
          },
        },
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    }
  });
}
