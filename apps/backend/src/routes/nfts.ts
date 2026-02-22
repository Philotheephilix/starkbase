import type { FastifyInstance } from 'fastify';
import type { NFTService } from '../services/nft-service';

export async function nftRoutes(
  app: FastifyInstance,
  opts: { nftSvc: NFTService }
) {
  const svc = opts.nftSvc;

  app.post<{
    Body: { name: string; symbol: string; baseUri: string; ownerAddress: string; platformId: string };
  }>('/collections', async (req) =>
    svc.deployNft(
      req.body.name,
      req.body.symbol,
      req.body.baseUri,
      req.body.ownerAddress,
      req.body.platformId
    )
  );

  app.post<{
    Params: { address: string };
    Body: { recipient: string; uri: string };
  }>('/:address/mint', async (req) =>
    svc.mintNft(req.params.address, req.body.recipient, req.body.uri)
  );

  app.get<{ Querystring: { platformId?: string } }>('/collections', async (req) =>
    svc.listDeployedNfts(req.query.platformId)
  );
}
