import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config';
import { prisma } from '@flagkit/database';

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: config.env === 'production' ? 'info' : 'debug',
      transport:
        config.env === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register plugins
  await server.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await server.register(multipart);
  await server.register(websocket);

  // Health check route
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Database health check
  server.get('/health/db', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const orgCount = await prisma.organization.count();
      const projectCount = await prisma.project.count();
      const envCount = await prisma.environment.count();

      return {
        status: 'ok',
        database: 'connected',
        stats: {
          organizations: orgCount,
          projects: projectCount,
          environments: envCount,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // API version route
  server.get('/', async () => {
    return {
      name: 'FlagKit API',
      version: '0.1.0',
      environment: config.env,
    };
  });

  // TODO: Register routes
  // await server.register(authRoutes, { prefix: '/api/v1/auth' });
  // await server.register(flagRoutes, { prefix: '/api/v1/flags' });

  return server;
};
