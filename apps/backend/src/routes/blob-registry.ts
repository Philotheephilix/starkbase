import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BlobRegistryService } from '../services/blob-registry-service';

type AuthUser = { walletAddress: string; platformId: string };

function user(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}

function contractAddress(): string {
  const addr = process.env.BLOB_REGISTRY_CONTRACT;
  if (!addr) throw new Error('BLOB_REGISTRY_CONTRACT env var is not set — deploy the contract first');
  return addr;
}

export async function blobRegistryRoutes(
  app: FastifyInstance,
  opts: { registrySvc: BlobRegistryService }
) {
  const svc = opts.registrySvc;

  // Deploy the StarkbaseRegistry contract.
  // Only needs to be called once; save returned address to BLOB_REGISTRY_CONTRACT in .env.
  app.post('/deploy', async () => {
    const result = await svc.deployContract();
    return { address: result.address, txHash: result.txHash };
  });

  // Register a platform so it can create records.
  // platformId defaults to the caller's platform from the JWT if not provided.
  app.post<{ Body: { platformId?: string; contractAddress?: string } }>(
    '/register-platform',
    async (req) => {
      const { walletAddress, platformId: jwtPlatformId } = user(req);
      const platformId = req.body.platformId ?? jwtPlatformId;
      const contract = req.body.contractAddress ?? contractAddress();
      const txHash = await svc.registerPlatform(contract, platformId);
      return { platformId, txHash };
    }
  );

  // Store a (platformId, walletAddress, commitment) triple on-chain.
  // walletAddress defaults to the caller's wallet from the JWT.
  app.post<{ Body: { commitment: string; platformId?: string; walletAddress?: string; contractAddress?: string } }>(
    '/create',
    async (req) => {
      const { walletAddress: jwtWallet, platformId: jwtPlatform } = user(req);
      const platformId = req.body.platformId ?? jwtPlatform;
      const walletAddress = req.body.walletAddress ?? jwtWallet;
      const { commitment } = req.body;
      const contract = req.body.contractAddress ?? contractAddress();
      const txHash = await svc.create(contract, platformId, walletAddress, commitment);
      return { platformId, walletAddress, commitment, txHash };
    }
  );

  // Update the wallet address for an existing (platformId, commitment) pair on-chain.
  app.put<{ Body: { commitment: string; platformId?: string; walletAddress?: string; contractAddress?: string } }>(
    '/update',
    async (req) => {
      const { walletAddress: jwtWallet, platformId: jwtPlatform } = user(req);
      const platformId = req.body.platformId ?? jwtPlatform;
      const walletAddress = req.body.walletAddress ?? jwtWallet;
      const { commitment } = req.body;
      const contract = req.body.contractAddress ?? contractAddress();
      const txHash = await svc.update(contract, platformId, commitment, walletAddress);
      return { platformId, commitment, walletAddress, txHash };
    }
  );

  // Fetch the wallet address stored on-chain for a (platformId, commitment) pair.
  // Reverts if the platform is not registered.
  app.get<{ Querystring: { platformId: string; commitment: string; contractAddress?: string } }>(
    '/fetch',
    async (req) => {
      const { platformId, commitment, contractAddress: queryContract } = req.query;
      const contract = queryContract ?? contractAddress();
      const walletAddress = await svc.fetch(contract, platformId, commitment);
      return { platformId, commitment, walletAddress };
    }
  );

  // Check whether a platform is registered (read-only).
  app.get<{ Querystring: { platformId: string; contractAddress?: string } }>(
    '/is-registered',
    async (req) => {
      const { platformId, contractAddress: queryContract } = req.query;
      const contract = queryContract ?? contractAddress();
      const registered = await svc.isPlatformRegistered(contract, platformId);
      return { platformId, registered };
    }
  );

  // Get all commitments for a platform: reads on-chain keys, enriches from SQLite.
  app.get<{ Params: { platformId: string }; Querystring: { contractAddress?: string } }>(
    '/platform/:platformId/commitments',
    async (req) => {
      const { platformId } = req.params;
      const contract = req.query.contractAddress ?? contractAddress();
      const commitments = await svc.getPlatformCommitments(contract, platformId);
      return { platformId, count: commitments.length, commitments };
    }
  );
}
