import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type Database from 'better-sqlite3';
import { getDb } from './db/index';
import { WalletService } from './services/wallet-service';
import { PlatformService } from './services/platform-service';
import { AuthService } from './services/auth-service';
import { createAuthMiddleware } from './middleware/auth';
import { createScopeMiddleware } from './middleware/scope';
import { createPermissionMiddleware } from './middleware/permission';
import { authRoutes } from './routes/auth';
import { ownerRoutes } from './routes/owners';
import { OwnerService } from './services/owner-service';
import { RoleService } from './services/role-service';
import { AuditService } from './services/audit-service';
import { contractRoutes } from './routes/contracts';
import { storageRoutes } from './routes/storage';
import { StorageService } from './services/storage-service';
import { BlobRegistryService } from './services/blob-registry-service';
import { NFTService } from './services/nft-service';
import { TokenService } from './services/token-service';
import { blobRegistryRoutes } from './routes/blob-registry';
import { queryRoutes } from './routes/query';
import { nftRoutes } from './routes/nfts';
import { tokenRoutes } from './routes/tokens';
import { SchemaService } from './services/schema-service';
import { schemaRoutes } from './routes/schemas';
import { BlobFileService } from './services/blob-file-service';
import { blobFileRoutes } from './routes/blob-files';
import { EventService } from './services/event-service';
import { eventRoutes } from './routes/events';

const MASTER_SECRET = process.env.STARKBASE_MASTER_SECRET ?? 'dev-master-secret';
const JWT_OWNER_SECRET = process.env.JWT_OWNER_SECRET ?? 'dev-owner-secret';
const JWT_USER_SECRET = process.env.JWT_USER_SECRET ?? 'dev-user-secret';

export function buildApp(db?: Database.Database) {
  const resolvedDb = db ?? getDb();
  const walletSvc = new WalletService(MASTER_SECRET);
  const platformSvc = new PlatformService(resolvedDb);
  const authSvc = new AuthService(resolvedDb, walletSvc, platformSvc, JWT_USER_SECRET);
  const storageSvc = new StorageService(resolvedDb);
  const registrySvc = new BlobRegistryService(resolvedDb, walletSvc);
  const nftSvc = new NFTService(resolvedDb, walletSvc);
  const tokenSvc = new TokenService(resolvedDb, walletSvc);
  const schemaSvc = new SchemaService(resolvedDb, registrySvc);
  const blobFileSvc = new BlobFileService(resolvedDb, registrySvc);
  const eventSvc = new EventService(resolvedDb, walletSvc);
  const ownerSvc = new OwnerService(resolvedDb, walletSvc, JWT_OWNER_SECRET);
  const roleSvc = new RoleService(resolvedDb);
  const auditSvc = new AuditService(resolvedDb);

  // maxParamLength: EigenDA cert hex strings are several hundred chars; default 100 is too short
  const app = Fastify({ logger: false, maxParamLength: 4096 });

  app.register(cors, { origin: true });
  app.register(helmet, { contentSecurityPolicy: false });

  // Middleware chain: auth → scope → permission
  app.addHook('onRequest', createAuthMiddleware(JWT_OWNER_SECRET, JWT_USER_SECRET));
  app.addHook('onRequest', createScopeMiddleware((ownerId, platformId) => ownerSvc.ownsPlatform(ownerId, platformId)));
  app.addHook('onRequest', createPermissionMiddleware((userId) => roleSvc.getUserPermissions(userId)));

  // Decorate for route access
  app.decorate('ownerService', ownerSvc);
  app.decorate('roleService', roleSvc);
  app.decorate('auditService', auditSvc);
  app.decorate('db', resolvedDb);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Owner routes (separate auth system)
  app.register(ownerRoutes, { prefix: '/owners' });

  // User-facing routes
  app.register(authRoutes, { prefix: '/auth', authSvc } as any);
  app.register(contractRoutes, { prefix: '/contracts' });
  app.register(storageRoutes, { prefix: '/storage', storageSvc } as any);
  app.register(blobRegistryRoutes, { prefix: '/registry', registrySvc } as any);
  app.register(queryRoutes, { prefix: '/query' });
  app.register(nftRoutes, { prefix: '/nfts', nftSvc } as any);
  app.register(tokenRoutes, { prefix: '/tokens', tokenSvc } as any);
  app.register(schemaRoutes, { prefix: '/schemas', schemaSvc } as any);
  app.register(blobFileRoutes, { prefix: '/blobs', blobFileSvc } as any);
  app.register(eventRoutes, { prefix: '/events', eventSvc } as any);

  return app;
}

if (require.main === module) {
  const app = buildApp();
  app.listen({ port: Number(process.env.PORT) || 8080, host: '0.0.0.0' }, (err) => {
    if (err) { app.log.error(err); process.exit(1); }
  });
}
