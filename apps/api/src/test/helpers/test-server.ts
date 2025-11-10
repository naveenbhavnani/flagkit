import { FastifyInstance } from 'fastify';
import { createServer } from '../../app';

/**
 * Create a test server instance
 * Always creates a fresh server instance to ensure test isolation
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const server = await createServer();
  await server.ready();
  return server;
}

/**
 * Close the test server
 */
export async function closeTestServer(server: FastifyInstance): Promise<void> {
  await server.close();
}
