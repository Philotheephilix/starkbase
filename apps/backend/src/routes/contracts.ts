import type { FastifyInstance } from 'fastify';
import { ContractService } from '../services/contract-service';
import type { SchemaDefinition } from '@starkbase/types';

const svc = new ContractService();

export async function contractRoutes(app: FastifyInstance) {
  app.post<{ Body: { schema: SchemaDefinition; owner: string } }>('/deploy', { config: { permission: 'tokens:deploy' } }, async (req) => {
    const { schema, owner } = req.body;
    return svc.deploy(schema, owner);
  });

  app.get<{ Params: { address: string } }>('/:address/schema', { config: { permission: 'schemas:read' } }, async (req) => {
    // TODO: fetch stored schema from DB
    return { address: req.params.address };
  });

  app.post<{ Params: { address: string }; Body: { data: Record<string, unknown> } }>(
    '/:address/records',
    { config: { permission: 'docs:write' } },
    async (req) => {
      return svc.createRecord(req.params.address, req.body.data);
    }
  );

  app.get<{ Params: { address: string; id: string } }>(
    '/:address/records/:id',
    { config: { permission: 'docs:read' } },
    async (req, reply) => {
      const record = await svc.getRecord(req.params.address, req.params.id);
      if (!record) return reply.code(404).send({ error: 'Record not found' });
      return record;
    }
  );

  app.get<{ Params: { address: string } }>('/:address', { config: { permission: 'schemas:read' } }, async (req) => ({
    address: req.params.address,
  }));
}
