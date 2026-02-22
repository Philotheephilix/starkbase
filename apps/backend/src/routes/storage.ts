import type { FastifyInstance } from 'fastify';
import { StorageService } from '../services/storage-service';

const svc = new StorageService();

export async function storageRoutes(app: FastifyInstance) {
  app.post<{ Body: { data: string; contentType?: string } }>('/upload', async (req) => {
    const buffer = Buffer.from(req.body.data, 'base64');
    return svc.upload(buffer, req.body.contentType);
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
