import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config';
import { prisma } from '@flagkit/database';
import jwtPlugin from './plugins/jwt.plugin';
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import projectRoutes from './routes/project.routes';
import environmentRoutes from './routes/environment.routes';
import flagRoutes from './routes/flag.routes';
import sdkRoutes from './routes/sdk.routes';

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

  // Register JWT plugin
  await server.register(jwtPlugin);

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

  // Register routes
  // SDK routes (no JWT auth required - uses SDK keys)
  await server.register(sdkRoutes, { prefix: '/' });

  // API routes (JWT auth required)
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(organizationRoutes, { prefix: '/api/v1/organizations' });
  await server.register(projectRoutes, { prefix: '/api/v1' });
  await server.register(environmentRoutes, { prefix: '/api/v1' });
  await server.register(flagRoutes, { prefix: '/api/v1' });

  return server;
};
