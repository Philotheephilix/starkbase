import type { FastifyInstance } from 'fastify';
import { NFTService } from '../services/nft-service';
import type { NFTMetadata } from '@starkbase/types';

const svc = new NFTService();

export async function nftRoutes(app: FastifyInstance) {
  app.post<{ Body: { name: string; symbol: string; platformId: string } }>(
    '/collections',
    async (req) => svc.createCollection(req.body.name, req.body.symbol, req.body.platformId)
  );

  app.post<{
    Params: { address: string };
    Body: { recipient: string; metadata: NFTMetadata; labels: string[] };
  }>('/:address/mint', async (req) =>
    svc.mint(req.params.address, req.body.recipient, req.body.metadata, req.body.labels)
  );

  app.post<{ Params: { address: string; tokenId: string }; Body: { labels: string[] } }>(
    '/:address/tokens/:tokenId/labels',
    async (req) => svc.addLabels(req.params.address, req.params.tokenId, req.body.labels)
  );
}
