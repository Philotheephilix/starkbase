import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type Database from 'better-sqlite3';
import { getDb } from './db/index';
import { WalletService } from './services/wallet-service';
import { PlatformService } from './services/platform-service';
import { AuthService } from './services/auth-service';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
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

const MASTER_SECRET = process.env.STARKBASE_MASTER_SECRET ?? 'dev-master-secret';

export function buildApp(db?: Database.Database) {
  const resolvedDb = db ?? getDb();
  const walletSvc = new WalletService(MASTER_SECRET);
  const platformSvc = new PlatformService(resolvedDb);
  const authSvc = new AuthService(resolvedDb, walletSvc, platformSvc);
  const storageSvc = new StorageService(resolvedDb);
  const registrySvc = new BlobRegistryService(resolvedDb, walletSvc);
  const nftSvc = new NFTService(resolvedDb, walletSvc);
  const tokenSvc = new TokenService(resolvedDb, walletSvc);

  // maxParamLength: EigenDA cert hex strings are several hundred chars; default 100 is too short
  const app = Fastify({ logger: false, maxParamLength: 4096 });

  app.register(cors, { origin: true });
  app.register(helmet, { contentSecurityPolicy: false });

  app.addHook('onRequest', async (req, reply) => {
    await authMiddleware(req, reply);
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Admin: create a platform (no auth — internal/dev use)
  app.post<{ Body: { name: string } }>('/platforms', async (req) => {
    return platformSvc.createPlatform(req.body.name);
  });

  app.register(authRoutes, { prefix: '/auth', authSvc } as any);

  app.register(contractRoutes, { prefix: '/contracts' });
  app.register(storageRoutes, { prefix: '/storage', storageSvc } as any);
  app.register(blobRegistryRoutes, { prefix: '/registry', registrySvc } as any);
  app.register(queryRoutes, { prefix: '/query' });
  app.register(nftRoutes, { prefix: '/nfts', nftSvc } as any);
  app.register(tokenRoutes, { prefix: '/tokens', tokenSvc } as any);

  return app;
}

if (require.main === module) {
  const app = buildApp();
  app.listen({ port: Number(process.env.PORT) || 8080, host: '0.0.0.0' }, (err) => {
    if (err) { app.log.error(err); process.exit(1); }
  });
}
