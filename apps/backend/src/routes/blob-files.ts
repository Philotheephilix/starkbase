import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BlobFileService } from '../services/blob-file-service';

type AuthUser = { walletAddress: string; platformId: string };

function getUser(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}

export async function blobFileRoutes(
  app: FastifyInstance,
  opts: { blobFileSvc: BlobFileService }
) {
  const svc = opts.blobFileSvc;

  // POST /blobs — upload a file (base64 JSON body)
  app.post<{
    Body: { data: string; filename?: string; mimeType?: string };
  }>('/', async (req, reply) => {
    try {
      const { walletAddress, platformId } = getUser(req);
      const buffer = Buffer.from(req.body.data, 'base64');
      const record = await svc.upload(
        buffer,
        platformId,
        walletAddress,
        req.body.filename,
        req.body.mimeType
      );
      return reply.code(201).send(record);
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });

  // GET /blobs — list all non-deleted blobs for the platform
  app.get('/', async (req, reply) => {
    try {
      const { platformId } = getUser(req);
      return svc.list(platformId);
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });

  // GET /blobs/:id/meta — metadata only
  app.get<{ Params: { id: string } }>('/:id/meta', async (req, reply) => {
    try {
      const { platformId } = getUser(req);
      return svc.getMetadata(req.params.id, platformId);
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });

  // GET /blobs/:id — download blob data
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    try {
      const { platformId } = getUser(req);
      const { record, data } = await svc.get(req.params.id, platformId);
      reply.header('Content-Type', record.mimeType ?? 'application/octet-stream');
      if (record.filename) {
        reply.header('Content-Disposition', `attachment; filename="${record.filename}"`);
      }
      return reply.send(data);
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });

  // DELETE /blobs/:id — soft-delete
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    try {
      const { platformId } = getUser(req);
      svc.delete(req.params.id, platformId);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });
}
