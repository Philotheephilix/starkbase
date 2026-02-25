import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { SchemaService, SchemaFieldDef } from '../services/schema-service';

type AuthUser = { walletAddress: string; platformId: string };

function getUser(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}

export async function schemaRoutes(
  app: FastifyInstance,
  opts: { schemaSvc: SchemaService }
) {
  const svc = opts.schemaSvc;

  // POST /schemas — create schema (onchain=true anchors commitment in registry contract)
  app.post<{ Body: { name: string; fields: Record<string, SchemaFieldDef>; onchain?: boolean } }>(
    '/',
    async (req, reply) => {
      const { walletAddress, platformId } = getUser(req);
      try {
        const schema = await svc.createSchema(
          platformId,
          req.body.name,
          req.body.fields,
          { onchain: req.body.onchain, walletAddress }
        );
        return reply.code(201).send(schema);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  // GET /schemas/:schemaName — get schema definition
  app.get<{ Params: { schemaName: string } }>(
    '/:schemaName',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return svc.getSchema(platformId, req.params.schemaName);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  // GET /schemas/:schemaName/verify — cross-reference SQLite commitment vs onchain registry
  app.get<{ Params: { schemaName: string } }>(
    '/:schemaName/verify',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return await svc.verifySchema(platformId, req.params.schemaName);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  // Static segment 'query' registered before param ':key' — Fastify prefers static over param
  app.post<{ Params: { schemaName: string }; Body: { filter: Record<string, unknown> } }>(
    '/:schemaName/docs/query',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return await svc.findMany(platformId, req.params.schemaName, req.body.filter ?? {});
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.post<{ Params: { schemaName: string; key: string }; Body: Record<string, unknown> }>(
    '/:schemaName/docs/:key',
    async (req, reply) => {
      const { walletAddress, platformId } = getUser(req);
      try {
        return await svc.uploadDocument(
          platformId,
          req.params.schemaName,
          req.params.key,
          req.body,
          walletAddress
        );
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.get<{ Params: { schemaName: string } }>(
    '/:schemaName/docs',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return await svc.findAll(platformId, req.params.schemaName);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  // Static segment 'history' registered before param ':key' for GET
  app.get<{ Params: { schemaName: string; key: string } }>(
    '/:schemaName/docs/:key/history',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return svc.getHistory(platformId, req.params.schemaName, req.params.key);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.get<{ Params: { schemaName: string; key: string } }>(
    '/:schemaName/docs/:key',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        return await svc.findDocument(platformId, req.params.schemaName, req.params.key);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.put<{ Params: { schemaName: string; key: string }; Body: Record<string, unknown> }>(
    '/:schemaName/docs/:key',
    async (req, reply) => {
      const { walletAddress, platformId } = getUser(req);
      try {
        return await svc.updateDocument(
          platformId,
          req.params.schemaName,
          req.params.key,
          req.body,
          walletAddress
        );
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.delete<{ Params: { schemaName: string; key: string } }>(
    '/:schemaName/docs/:key',
    async (req, reply) => {
      const { platformId } = getUser(req);
      try {
        svc.deleteDocument(platformId, req.params.schemaName, req.params.key);
        return { success: true };
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );
}
