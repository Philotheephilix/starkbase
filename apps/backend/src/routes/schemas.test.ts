import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../index';
import { createDb } from '../db/index';

vi.mock('../services/wallet-service', () => ({
  WalletService: vi.fn().mockImplementation(() => ({
    derivePrivateKey: () => '0xprivkey',
    computeAddress: () => '0xcomputedaddr',
    getProvider: () => ({}),
    getDeployer: () => ({}),
    deployAccount: vi.fn().mockResolvedValue({ address: '0xdeployedaddr', transactionHash: '0xtx' }),
  })),
}));

vi.mock('axios', () => {
  const aliceJsonBuf = Buffer.from(JSON.stringify({ name: 'Alice', age: 25 }));
  const aliceArrayBuffer = aliceJsonBuf.buffer.slice(
    aliceJsonBuf.byteOffset,
    aliceJsonBuf.byteOffset + aliceJsonBuf.byteLength
  );
  return {
    default: {
      post: vi.fn().mockResolvedValue({ data: Buffer.from('fakecert').buffer }),
      get: vi.fn().mockResolvedValue({ data: aliceArrayBuffer }),
    },
  };
});

async function bootstrap(db: ReturnType<typeof createDb>) {
  const app = buildApp(db);
  const platRes = await app.inject({
    method: 'POST', url: '/platforms', payload: { name: 'Test' },
  });
  const { apiKey, id: platformId } = JSON.parse(platRes.body);

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { apiKey, username: 'alice', password: 'secret' },
  });
  const { sessionToken } = JSON.parse(regRes.body);
  return { app, platformId, sessionToken };
}

describe('Schema routes', () => {
  it('POST /schemas creates a schema', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    const res = await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe('users');
  });

  it('GET /schemas/:name returns schema definition', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });

    const res = await app.inject({
      method: 'GET', url: '/schemas/users',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).fields.name.type).toBe('string');
  });

  it('POST /schemas/:name/docs/:key uploads a document', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });

    const res = await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice', age: 25 },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).key).toBe('alice');
    expect(JSON.parse(res.body).version).toBe(1);
  });

  it('GET /schemas/:name/docs/:key returns document', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice', age: 25 },
    });

    const res = await app.inject({
      method: 'GET', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).key).toBe('alice');
  });

  it('PUT /schemas/:name/docs/:key updates a document', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice' },
    });

    const res = await app.inject({
      method: 'PUT', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice Updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).version).toBe(2);
  });

  it('DELETE /schemas/:name/docs/:key soft-deletes', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice' },
    });

    const delRes = await app.inject({
      method: 'DELETE', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('GET /schemas/:name/docs/:key/history returns all versions', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice' },
    });
    await app.inject({
      method: 'PUT', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice V2' },
    });

    const res = await app.inject({
      method: 'GET', url: '/schemas/users/docs/alice/history',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const history = JSON.parse(res.body);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });

  it('requires auth — 401 without token', async () => {
    const db = createDb(':memory:');
    const app = buildApp(db);
    const res = await app.inject({ method: 'GET', url: '/schemas/users' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /schemas/:name/docs returns all documents', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice' },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/bob',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Bob' },
    });

    const res = await app.inject({
      method: 'GET', url: '/schemas/users/docs',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const docs = JSON.parse(res.body);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs).toHaveLength(2);
  });

  it('POST /schemas/:name/docs/query filters documents', async () => {
    const db = createDb(':memory:');
    const { app, sessionToken } = await bootstrap(db);

    await app.inject({
      method: 'POST', url: '/schemas',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'users', fields: { name: { type: 'string', required: true } } },
    });
    await app.inject({
      method: 'POST', url: '/schemas/users/docs/alice',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Alice' },
    });

    const res = await app.inject({
      method: 'POST', url: '/schemas/users/docs/query',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { filter: { name: 'ZZZ_NO_MATCH' } },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveLength(0);
  });
});
