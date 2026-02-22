import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { StorageService } from '../services/storage-service';

type AuthUser = { walletAddress: string; platformId: string };

export async function storageRoutes(
  app: FastifyInstance,
  opts: { storageSvc: StorageService }
) {
  const svc = opts.storageSvc;

  app.post<{ Body: { data: string; contentType?: string } }>('/upload', async (req) => {
    const { walletAddress, platformId } = (req as FastifyRequest & { user: AuthUser }).user;
    const buffer = Buffer.from(req.body.data, 'base64');
    return svc.upload(buffer, walletAddress, platformId, req.body.contentType);
  });

  app.get<{ Params: { blobId: string } }>('/blobs/:blobId', async (req, reply) => {
    const data = await svc.get(req.params.blobId);
    return reply.send(data);
  });

  app.get<{ Params: { blobId: string } }>('/blobs/:blobId/metadata', async (req) =>
    svc.getMetadata(req.params.blobId)
  );

  app.post<{ Body: { blobId: string; commitment: string; dataHash: string } }>(
    '/verify',
    async (req) => {
      const ok = await svc.verify(req.body.blobId, req.body.commitment, req.body.dataHash);
      return { verified: ok };
    }
  );
}
