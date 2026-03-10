import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../services/auth-service';

export async function authRoutes(
  app: FastifyInstance,
  opts: { authSvc: AuthService }
) {
  const { authSvc } = opts;

  app.post<{ Body: { apiKey: string; username: string; password: string } }>(
    '/register',
    async (req, reply) => {
      try {
        return await authSvc.register(req.body.apiKey, req.body.username, req.body.password);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.post<{ Body: { apiKey: string; username: string; password: string } }>(
    '/login',
    async (req, reply) => {
      try {
        return await authSvc.login(req.body.apiKey, req.body.username, req.body.password);
      } catch (err: any) {
        return reply.code(err.statusCode ?? 500).send({ error: err.message });
      }
    }
  );

  app.get<{ Params: { platformId: string } }>('/users/:platformId', async (req, reply) => {
    try {
      return authSvc.listUsers(req.params.platformId);
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message });
    }
  });

  app.get('/me', async (req, reply) => {
    const user = (req as typeof req & { user: unknown }).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    return user;
  });

  app.post('/logout', async () => {
    return { success: true }; // client drops the token
  });
}
