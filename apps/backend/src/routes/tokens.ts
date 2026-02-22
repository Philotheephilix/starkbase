import type { FastifyInstance } from 'fastify';
import { TokenService } from '../services/token-service';

const svc = new TokenService();

export async function tokenRoutes(app: FastifyInstance) {
  app.post<{ Body: { name: string; symbol: string; initialSupply: string; platformId: string } }>(
    '/create',
    async (req) =>
      svc.create(req.body.name, req.body.symbol, req.body.initialSupply, req.body.platformId)
  );

  app.post<{
    Params: { address: string };
    Body: { recipient: string; amount: string; reason: string };
  }>('/:address/mint', async (req) =>
    svc.mintReward(req.params.address, req.body.recipient, req.body.amount, req.body.reason)
  );
}
