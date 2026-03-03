import type { FastifyInstance } from 'fastify';
import type { TokenService } from '../services/token-service';

export async function tokenRoutes(
  app: FastifyInstance,
  opts: { tokenSvc: TokenService }
) {
  const svc = opts.tokenSvc;

  // Deploy a new token contract — only authenticated users
  app.post<{
    Body: { name: string; symbol: string; initialSupply: string; recipientAddress: string };
  }>('/deploy', async (req, reply) => {
    const user = (req as any).user;
    const token = await svc.deployToken(
      req.body.name,
      req.body.symbol,
      req.body.initialSupply,
      req.body.recipientAddress,
      user.platformId,
      user.walletAddress
    );
    reply.status(201);
    return token;
  });

  // Mint tokens to a recipient — only the token's creator
  app.post<{
    Params: { address: string };
    Body: { recipient: string; amount: string };
  }>('/:address/mint', async (req, reply) => {
    const user = (req as any).user;
    const result = await svc.mintToken(
      req.params.address,
      user.platformId,
      user.walletAddress,
      req.body.recipient,
      req.body.amount
    );
    reply.status(201);
    return result;
  });

  // List all tokens for the authenticated platform
  app.get('/', async (req) => {
    const user = (req as any).user;
    return svc.listTokens(user.platformId);
  });

  // Fetch on-chain mint history from Starknet RPC
  app.get<{ Params: { address: string } }>('/:address/history', async (req) => {
    return svc.getMintHistory(req.params.address);
  });
}
