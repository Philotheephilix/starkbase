import { FastifyRequest, FastifyReply } from 'fastify';

export function createScopeMiddleware(ownsPlatform: (ownerId: string, platformId: string) => boolean) {
  return async function scopeMiddleware(request: FastifyRequest, reply: FastifyReply) {
    if (!request.authType) return; // Public route

    if (request.authType === 'owner') {
      const platformId = (request.params as any).platformId;
      if (platformId) {
        if (!ownsPlatform(request.owner!.ownerId, platformId)) {
          return reply.status(403).send({ error: 'You do not own this platform' });
        }
        request.platformId = platformId;
      }
      return;
    }

    if (request.authType === 'user') {
      // platformId already set from JWT in auth middleware
      return;
    }
  };
}
