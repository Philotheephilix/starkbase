import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../index';
import { createDb } from '../db/index';

// Mock Starknet deployment — no real network calls in route tests
vi.mock('../services/wallet-service', () => ({
  WalletService: vi.fn().mockImplementation(() => ({
    derivePrivateKey: () => '0xprivkey',
    computeAddress: () => '0xcomputedaddr',
    getProvider: () => ({}),
    getDeployer: () => ({}),
    deployAccount: vi.fn().mockResolvedValue({
      address: '0xdeployedaddr',
      transactionHash: '0xtxhash',
    }),
  })),
}));

describe('Auth routes', () => {
  it('POST /auth/register returns 200 with walletAddress', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const platformRes = await app.inject({
      method: 'POST',
      url: '/platforms',
      payload: { name: 'Test App' },
    });
    const { apiKey } = JSON.parse(platformRes.body);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { apiKey, username: 'alice', password: 'secret123' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.walletAddress).toBe('0xdeployedaddr');
    expect(body.sessionToken).toBeTruthy();
  });

  it('POST /auth/register returns 409 for duplicate username', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const platformRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'App' } });
    const { apiKey } = JSON.parse(platformRes.body);

    await app.inject({ method: 'POST', url: '/auth/register', payload: { apiKey, username: 'alice', password: 'pass' } });
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload: { apiKey, username: 'alice', password: 'pass2' } });

    expect(res.statusCode).toBe(409);
  });

  it('POST /auth/login returns 200 with sessionToken', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const platformRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'App' } });
    const { apiKey } = JSON.parse(platformRes.body);

    await app.inject({ method: 'POST', url: '/auth/register', payload: { apiKey, username: 'alice', password: 'pass' } });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { apiKey, username: 'alice', password: 'pass' } });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).sessionToken).toBeTruthy();
  });

  it('POST /auth/login returns 401 for wrong password', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const platformRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'App' } });
    const { apiKey } = JSON.parse(platformRes.body);

    await app.inject({ method: 'POST', url: '/auth/register', payload: { apiKey, username: 'alice', password: 'pass' } });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { apiKey, username: 'alice', password: 'wrong' } });

    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me returns user info with valid token', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const platformRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'App' } });
    const { apiKey } = JSON.parse(platformRes.body);

    const regRes = await app.inject({ method: 'POST', url: '/auth/register', payload: { apiKey, username: 'alice', password: 'pass' } });
    const { sessionToken } = JSON.parse(regRes.body);

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(meRes.statusCode).toBe(200);
    expect(JSON.parse(meRes.body).username).toBe('alice');
  });

  it('GET /auth/me returns 401 without token', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);

    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
