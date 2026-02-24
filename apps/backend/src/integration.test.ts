import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'net';
import { createDb } from './db/index';
import { buildApp } from './index';
import { StarkbaseClient } from '@starkbase/sdk';

// No mocks — real EigenDA (localhost:3100), real Starknet Sepolia, real SQLite in-memory

let backendUrl: string;
let app: Awaited<ReturnType<typeof buildApp>>;
let client: StarkbaseClient;
let platformApiKey: string;

// Unique per run to avoid "username already exists" on re-runs
const RUN_ID = Date.now();

beforeAll(async () => {
  const db = createDb(':memory:');
  app = buildApp(db);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address() as AddressInfo;
  backendUrl = `http://127.0.0.1:${addr.port}`;
}, 15_000);

afterAll(async () => {
  await app?.close();
});

describe('E2E: schema document store', () => {
  it('creates a platform', async () => {
    const tmp = new StarkbaseClient({ apiUrl: backendUrl });
    const platform = await tmp.platforms.create('integration-test');
    expect(platform.id).toBeTruthy();
    expect(platform.apiKey).toMatch(/^sb_/);
    platformApiKey = platform.apiKey;
  });

  it('registers a user (real Starknet wallet deployment)', async () => {
    client = new StarkbaseClient({ apiUrl: backendUrl, apiKey: platformApiKey });
    const result = await client.auth.register({
      username: `user_${RUN_ID}`,
      password: 'secret123',
    });
    expect(result.walletAddress).toMatch(/^0x/);
    expect(result.sessionToken).toBeTruthy();
    client.setSessionToken(result.sessionToken);
  }, 120_000);

  it('creates a schema with field definitions', async () => {
    const schema = await client.schemas.create('users', {
      fields: {
        name: { type: 'string', required: true },
        age:  { type: 'number' },
      },
    });
    expect(schema.name).toBe('users');
    expect(schema.fields.name.required).toBe(true);
  });

  it('uploads two documents to EigenDA', async () => {
    const users = client.schema('users');
    const doc = await users.upload('alice', { name: 'Alice', age: 25 });
    expect(doc.key).toBe('alice');
    expect(doc.version).toBe(1);
    expect(doc.blobId).toBeTruthy();
    await users.upload('bob', { name: 'Bob', age: 30 });
  }, 30_000);

  it('finds a document by key (fetches from EigenDA)', async () => {
    const doc = await client.schema('users').find('alice');
    expect(doc.data?.name).toBe('Alice');
    expect(doc.data?.age).toBe(25);
    expect(doc.version).toBe(1);
  });

  it('findAll returns both documents', async () => {
    const all = await client.schema('users').findAll();
    expect(all).toHaveLength(2);
    expect(all.map(d => d.key).sort()).toEqual(['alice', 'bob']);
  });

  it('findMany filters by field value', async () => {
    const results = await client.schema('users').findMany({ age: 25 });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('alice');
  });

  it('updates a document (append-only — new EigenDA blob)', async () => {
    const updated = await client.schema('users').update('alice', { name: 'Alice V2', age: 26 });
    expect(updated.version).toBe(2);
    expect(updated.blobId).toBeTruthy();
  }, 30_000);

  it('find returns the updated data (latest version)', async () => {
    const doc = await client.schema('users').find('alice');
    expect(doc.data?.name).toBe('Alice V2');
    expect(doc.data?.age).toBe(26);
    expect(doc.version).toBe(2);
  });

  it('history shows both versions', async () => {
    const history = await client.schema('users').history('alice');
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
    expect(history.every(v => !v.deleted)).toBe(true);
  });

  it('soft-deletes a document', async () => {
    await client.schema('users').delete('alice');
    await expect(client.schema('users').find('alice')).rejects.toThrow();
  });

  it('findAll excludes deleted documents', async () => {
    const all = await client.schema('users').findAll();
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe('bob');
  });

  it('rejects upload with missing required field', async () => {
    await expect(
      client.schema('users').upload('charlie', { age: 20 }) // missing 'name'
    ).rejects.toThrow();
  });

  it('rejects upload with wrong field type', async () => {
    await expect(
      client.schema('users').upload('charlie', { name: 'Charlie', age: 'twenty' })
    ).rejects.toThrow();
  });

  it('rejects duplicate upload (use update instead)', async () => {
    await expect(
      client.schema('users').upload('bob', { name: 'Bob Again', age: 31 })
    ).rejects.toThrow();
  });
});
