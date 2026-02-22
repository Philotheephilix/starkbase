import type { FastifyInstance } from 'fastify';
import type { TokenService } from '../services/token-service';

export async function tokenRoutes(
  app: FastifyInstance,
  opts: { tokenSvc: TokenService }
) {
  const svc = opts.tokenSvc;

  app.post<{
    Body: {
      name: string;
      symbol: string;
      initialSupply: string;
      recipientAddress: string;
      platformId: string;
    };
  }>('/create', async (req) =>
    svc.deployToken(
      req.body.name,
      req.body.symbol,
      req.body.initialSupply,
      req.body.recipientAddress,
      req.body.platformId
    )
  );

  app.post<{
    Params: { address: string };
    Body: { recipient: string; amount: string };
  }>('/:address/mint', async (req) =>
    svc.mintToken(req.params.address, req.body.recipient, req.body.amount)
  );

  app.get<{ Querystring: { platformId?: string } }>('/list', async (req) =>
    svc.listDeployedTokens(req.query.platformId)
  );
}
