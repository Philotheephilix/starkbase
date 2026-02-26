import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../index';
import { createDb } from '../db/index';

vi.mock('../services/wallet-service', () => ({
  WalletService: vi.fn().mockImplementation(() => ({
    derivePrivateKey: () => '0xprivkey',
    computeAddress: () => '0xcomputedaddr',
    getProvider: vi.fn().mockReturnValue({
      waitForTransaction: vi.fn().mockResolvedValue({}),
      callContract: vi.fn().mockResolvedValue(['0x1']),
    }),
    getDeployer: vi.fn().mockImplementation(() => {
      let deployCount = 0;
      return {
        address: '0xdeployeraddr',
        declareAndDeploy: vi.fn().mockImplementation(() => {
          deployCount++;
          return Promise.resolve({
            deploy: { address: `0xcontractaddr${deployCount}`, transaction_hash: `0xdeploytx${deployCount}` },
          });
        }),
        execute: vi.fn().mockResolvedValue({ transaction_hash: '0xminttx' }),
      };
    }),
    deployAccount: vi.fn().mockResolvedValue({ address: '0xdeployedaddr', transactionHash: '0xtx' }),
  })),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ abi: [] })),
  };
});

vi.mock('starknet', () => ({
  CallData: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue([]),
  })),
}));

async function bootstrap(db: ReturnType<typeof createDb>) {
  const app = buildApp(db);
  const platRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'Test' } });
  const { apiKey } = JSON.parse(platRes.body);
  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { apiKey, username: 'alice', password: 'secret' },
  });
  const { sessionToken, walletAddress } = JSON.parse(regRes.body);
  return { app, sessionToken, walletAddress };
}

describe('Event routes', () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => { db = createDb(':memory:'); });

  it('POST /events creates an event and returns 201', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const res = await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Hackathon', description: 'Annual hackathon', imageUrl: 'https://img.com/1.png' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe('Hackathon');
    expect(body.contractAddress).toMatch(/^0xcontractaddr/);
  });

  it('GET /events lists events for platform', async () => {
    const { app, sessionToken } = await bootstrap(db);
    await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'E1', description: 'D1', imageUrl: 'https://i.com/1.png' },
    });
    const res = await app.inject({
      method: 'GET', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.body);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('E1');
  });

  it('GET /events/:id returns event detail', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const createRes = await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'E1', description: 'D1', imageUrl: 'https://i.com/1.png' },
    });
    const { id } = JSON.parse(createRes.body);
    const res = await app.inject({
      method: 'GET', url: `/events/${id}`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).id).toBe(id);
  });

  it('POST /events/:id/mint mints an NFT', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const createRes = await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'E1', description: 'D1', imageUrl: 'https://i.com/1.png' },
    });
    const { id } = JSON.parse(createRes.body);
    const res = await app.inject({
      method: 'POST', url: `/events/${id}/mint`,
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { recipient: '0xrecipient' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.recipient).toBe('0xrecipient');
    expect(body.tokenId).toBe('1');
  });

  it('GET /events/:id/mints lists mints', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const createRes = await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'E1', description: 'D1', imageUrl: 'https://i.com/1.png' },
    });
    const { id } = JSON.parse(createRes.body);
    await app.inject({
      method: 'POST', url: `/events/${id}/mint`,
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { recipient: '0xrecip1' },
    });
    const res = await app.inject({
      method: 'GET', url: `/events/${id}/mints`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveLength(1);
  });

  it('GET /events/:id/tokens/:wallet returns ERC-721 metadata (no auth)', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const createRes = await app.inject({
      method: 'POST', url: '/events',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Hackathon', description: 'Annual', imageUrl: 'https://img.com/1.png' },
    });
    const { id } = JSON.parse(createRes.body);
    const res = await app.inject({
      method: 'GET',
      url: `/events/${id}/tokens/0xrecipient`,
      // no Authorization header
    });
    expect(res.statusCode).toBe(200);
    const meta = JSON.parse(res.body);
    expect(meta.name).toBe('Hackathon');
    expect(meta.image).toBe('https://img.com/1.png');
    expect(meta.attributes).toEqual(
      expect.arrayContaining([expect.objectContaining({ trait_type: 'recipient' })])
    );
  });
});
