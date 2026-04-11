import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type Database from 'better-sqlite3';

const PUBLIC_PATHS = new Set([
  '/health',
  '/owners/register',
  '/owners/login',
  '/auth/register',
  '/auth/login',
]);
const PUBLIC_PATTERNS = [/^\/events\/[^/]+\/tokens\/[^/]+$/];

export interface OwnerIdentity {
  type: 'owner';
  ownerId: string;
  username: string;
  walletAddress: string;
  tokenVersion: number;
}

export interface UserIdentity {
  type: 'user';
  userId: string;
  username: string;
  platformId: string;
  walletAddress: string;
  tokenVersion: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    authType?: 'owner' | 'user';
    owner?: OwnerIdentity;
    user?: UserIdentity;
    platformId?: string;
  }
  interface FastifyInstance {
    ownerService: import('../services/owner-service').OwnerService;
    roleService: import('../services/role-service').RoleService;
    auditService: import('../services/audit-service').AuditService;
    db: import('better-sqlite3').Database;
  }
}

export function createAuthMiddleware(ownerJwtSecret: string, userJwtSecret: string, db: Database.Database) {
  return async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const path = request.url.split('?')[0];

    if (PUBLIC_PATHS.has(path)) return;
    if (PUBLIC_PATTERNS.some(p => p.test(path))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization token' });
    }

    const token = authHeader.slice(7);

    // Peek at unverified payload to determine token type
    const unverified = jwt.decode(token) as any;
    if (!unverified || !unverified.aud) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    try {
      if (unverified.aud === 'owner') {
        const decoded = jwt.verify(token, ownerJwtSecret, { issuer: 'starkbase', audience: 'owner' }) as any as OwnerIdentity;
        // Validate tokenVersion against DB
        const row = db.prepare('SELECT token_version FROM owners WHERE id = ?').get(decoded.ownerId) as any;
        if (!row || row.token_version !== decoded.tokenVersion) {
          return reply.status(401).send({ error: 'Token revoked' });
        }
        request.authType = 'owner';
        request.owner = decoded;
      } else if (unverified.aud === 'user') {
        const decoded = jwt.verify(token, userJwtSecret, { issuer: 'starkbase', audience: 'user' }) as any as UserIdentity;
        // Validate tokenVersion against DB
        const row = db.prepare('SELECT token_version FROM platform_users WHERE id = ?').get(decoded.userId) as any;
        if (!row || row.token_version !== decoded.tokenVersion) {
          return reply.status(401).send({ error: 'Token revoked' });
        }
        request.authType = 'user';
        request.user = decoded;
        request.platformId = decoded.platformId;
      } else {
        return reply.status(401).send({ error: 'Invalid token type' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  };
}
