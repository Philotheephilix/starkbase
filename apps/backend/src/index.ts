import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { contractRoutes } from './routes/contracts';
import { storageRoutes } from './routes/storage';
import { queryRoutes } from './routes/query';
import { nftRoutes } from './routes/nfts';
import { tokenRoutes } from './routes/tokens';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(helmet);

  app.addHook('onRequest', authMiddleware);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.register(authRoutes, { prefix: '/auth' });
  app.register(contractRoutes, { prefix: '/contracts' });
  app.register(storageRoutes, { prefix: '/storage' });
  app.register(queryRoutes, { prefix: '/query' });
  app.register(nftRoutes, { prefix: '/nfts' });
  app.register(tokenRoutes, { prefix: '/tokens' });

  return app;
}

if (require.main === module) {
  const app = buildApp();
  app.listen({ port: Number(process.env.PORT) || 8080, host: '0.0.0.0' }, (err) => {
    if (err) { app.log.error(err); process.exit(1); }
  });
}
