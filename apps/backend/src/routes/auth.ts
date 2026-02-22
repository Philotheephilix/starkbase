import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth-service';

const svc = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { provider: string; redirectUri: string } }>('/initiate', async (req) => {
    const { provider, redirectUri } = req.body;
    return svc.initiateAuth(provider, redirectUri);
  });

  app.post<{ Body: { code: string; state: string; provider: string } }>(
    '/callback',
    async (req) => {
      // TODO: exchange OAuth code for JWT with provider
      return { jwt: 'placeholder_jwt', userIdentifier: 'user@example.com', provider: req.body.provider };
    }
  );

  app.post<{
    Body: { jwt: string; zkProof: string[]; ephemeralPublicKey: string; expirationBlock: number };
  }>('/deploy', async (req) => {
    return svc.deployAccount(req.body);
  });

  app.get('/session', async (req) => {
    const user = (req as typeof req & { user: { accountAddress: string; provider: string } }).user;
    return { accountAddress: user.accountAddress, provider: user.provider };
  });
}
