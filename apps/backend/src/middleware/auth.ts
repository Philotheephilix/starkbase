import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const PUBLIC_PREFIXES = ['/auth', '/health'];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const isPublic = PUBLIC_PREFIXES.some((p) => request.url.startsWith(p));
  if (isPublic) return;

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
