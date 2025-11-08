import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config';

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
