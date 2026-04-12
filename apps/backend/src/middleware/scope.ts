import { FastifyRequest, FastifyReply } from 'fastify';
import type Database from 'better-sqlite3';

export function createScopeMiddleware(
  ownsPlatform: (ownerId: string, platformId: string) => boolean,
  db: Database.Database,
) {
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
      // Verify user still exists and is active in their platform
      const row = db.prepare(
        'SELECT id FROM platform_users WHERE id = ? AND platform_id = ? AND deployed != -1'
      ).get(request.user!.userId, request.user!.platformId) as any;
      if (!row) {
        return reply.status(403).send({ error: 'User no longer active in this platform' });
      }
      return;
    }
  };
}
