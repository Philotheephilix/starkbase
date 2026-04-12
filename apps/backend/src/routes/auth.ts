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
      const { apiKey, username, password } = req.body ?? ({} as any);
      if (!apiKey || !username || !password) {
        return reply.code(400).send({ error: 'apiKey, username, and password are required' });
      }
      if (typeof username !== 'string' || username.length < 3 || username.length > 64) {
        return reply.code(400).send({ error: 'Username must be 3-64 characters' });
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
        return reply.code(400).send({ error: 'Password must be 8-256 characters' });
      }
      try {
        return await authSvc.register(apiKey, username, password);
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

  // GET /auth/users/:platformId removed — use GET /owners/platforms/:platformId/users (owner-only)

  app.get('/me', async (req, reply) => {
    const user = (req as typeof req & { user: unknown }).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    return user;
  });

  app.post('/logout', async () => {
    return { success: true }; // client drops the token
  });
}
