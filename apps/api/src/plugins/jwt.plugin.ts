import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '@/config';
import { authService } from '@/services/auth.service';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
    };
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }
}

async function jwtPlugin(server: FastifyInstance) {
  // Register JWT plugin
  await server.register(jwt, {
    secret: config.jwt.secret,
  });

  // Decorate server with authenticate method
  server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await request.jwtVerify<{ userId: string; email: string }>();

      // Get user from database
      const user = await authService.getUserById(decoded.userId);

      // Attach full user object to request
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (err) {
      const error = err as Error;
      server.log.error(error, 'Authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: error.message });
    }
  });
}

export default fp(jwtPlugin);
