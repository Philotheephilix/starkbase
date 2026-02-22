import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

// Exact paths that don't require a Bearer token
const PUBLIC_PATHS = new Set(['/health', '/auth/register', '/auth/login', '/platforms']);

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (PUBLIC_PATHS.has(request.url.split('?')[0])) return;

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret');
    (request as FastifyRequest & { user: unknown }).user = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}
