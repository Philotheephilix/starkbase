import type { FastifyInstance } from 'fastify';
import type { EventService } from '../services/event-service';

export async function eventRoutes(
  app: FastifyInstance,
  opts: { eventSvc: EventService }
) {
  const svc = opts.eventSvc;

  // Create event — deploys EventNFT contract
  app.post<{
    Body: { name: string; description: string; imageUrl: string; maxSupply?: number };
  }>('/', async (req, reply) => {
    const user = (req as any).user;
    const event = await svc.createEvent(
      user.platformId,
      req.body.name,
      req.body.description,
      req.body.imageUrl,
      req.body.maxSupply ?? 0,
      user.walletAddress
    );
    reply.status(201);
    return event;
  });

  // List events for platform
  app.get('/', async (req) => {
    const user = (req as any).user;
    return svc.listEvents(user.platformId);
  });

  // Get single event
  app.get<{ Params: { id: string } }>('/:id', async (req) => {
    const user = (req as any).user;
    return svc.getEvent(req.params.id, user.platformId);
  });

  // Mint to a recipient — only creator can do this
  app.post<{
    Params: { id: string };
    Body: { recipient: string };
  }>('/:id/mint', async (req, reply) => {
    const user = (req as any).user;
    const mint = await svc.mintToUser(
      req.params.id,
      user.platformId,
      user.walletAddress,
      req.body.recipient
    );
    reply.status(201);
    return mint;
  });

  // List mints for event
  app.get<{ Params: { id: string } }>('/:id/mints', async (req) => {
    const user = (req as any).user;
    return svc.listMints(req.params.id, user.platformId);
  });

  // Public ERC-721 metadata endpoint — no auth required (matched by regex in auth middleware)
  app.get<{ Params: { id: string; wallet: string } }>(
    '/:id/tokens/:wallet',
    async (req) => {
      const row = (svc as any).db
        .prepare('SELECT * FROM events WHERE id = ?')
        .get(req.params.id) as any;
      if (!row) {
        throw Object.assign(new Error('Event not found'), { statusCode: 404 });
      }
      return {
        name: row.name,
        description: row.description,
        image: row.image_url,
        attributes: [
          { trait_type: 'recipient', value: req.params.wallet },
          { trait_type: 'event_id', value: row.id },
        ],
      };
    }
  );
}
