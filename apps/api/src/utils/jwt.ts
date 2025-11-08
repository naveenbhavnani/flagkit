import { FastifyInstance } from 'fastify';

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(server: FastifyInstance, payload: JWTPayload): string {
  return server.jwt.sign(payload, { expiresIn: '7d' });
}

/**
 * Generate refresh token (longer expiry)
 */
export function generateRefreshToken(server: FastifyInstance, payload: JWTPayload): string {
  return server.jwt.sign(payload, { expiresIn: '30d' });
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(
  server: FastifyInstance,
  token: string
): Promise<JWTPayload> {
  return server.jwt.verify<JWTPayload>(token);
}
