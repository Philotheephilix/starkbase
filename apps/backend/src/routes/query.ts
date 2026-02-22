import type { FastifyInstance } from 'fastify';
import { QueryService } from '../services/query-service';

const svc = new QueryService();

export async function queryRoutes(app: FastifyInstance) {
  app.post<{ Body: { query: string; variables?: Record<string, unknown> } }>(
    '/graphql',
    async (req) => svc.graphql(req.body.query, req.body.variables)
  );

  app.get<{ Params: { address: string }; Querystring: { limit?: number; offset?: number } }>(
    '/contracts/:address/records',
    async (req) => svc.getRecords(req.params.address, req.query)
  );
}
