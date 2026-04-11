import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations';
import { OwnerService } from '../services/owner-service';
import { RoleService } from '../services/role-service';
import { AuditService } from '../services/audit-service';
import { createAuthMiddleware } from '../middleware/auth';
import { ownerRoutes } from './owners';

const JWT_OWNER_SECRET = 'test-owner-secret';

function buildApp() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create prerequisite tables that migrations reference
  db.exec(`
    CREATE TABLE platforms (
      id TEXT PRIMARY KEY,
      name TEXT,
      api_key TEXT UNIQUE,
      creator_wallet TEXT,
      created_at INTEGER
    );
    CREATE TABLE platform_users (
      id TEXT PRIMARY KEY,
      platform_id TEXT REFERENCES platforms(id),
      username TEXT,
      password_hash TEXT,
      wallet_address TEXT,
      deployed INTEGER DEFAULT 0,
      created_at INTEGER,
      UNIQUE(platform_id, username)
    );
    CREATE TABLE blob_files (
      id TEXT PRIMARY KEY,
      platform_id TEXT,
      blob_id TEXT,
      commitment TEXT,
      filename TEXT,
      mime_type TEXT,
      size INTEGER,
      deleted INTEGER DEFAULT 0,
      onchain INTEGER DEFAULT 0,
      onchain_tx_hash TEXT,
      uploaded_by TEXT,
      created_at INTEGER
    );
    CREATE TABLE schema_documents (
      id TEXT PRIMARY KEY,
      platform_id TEXT,
      schema_name TEXT,
      doc_key TEXT,
      blob_id TEXT,
      commitment TEXT,
      version INTEGER,
      deleted INTEGER DEFAULT 0,
      created_by TEXT,
      created_at INTEGER
    );
  `);

  runMigrations(db);

  const mockWalletService = {
    derivePrivateKey: () => '0xdeadbeef',
    computeAddress: () => '0xwallet123',
    deployAccount: async () => '0xtx',
  };

  const ownerService = new OwnerService(db, mockWalletService as any, JWT_OWNER_SECRET);
  const roleService = new RoleService(db);
  const auditService = new AuditService(db);

  const app = Fastify();
  app.decorate('ownerService', ownerService);
  app.decorate('roleService', roleService);
  app.decorate('auditService', auditService);
  app.decorate('db', db);

  // Add auth middleware that handles owner tokens
  app.addHook('onRequest', createAuthMiddleware(JWT_OWNER_SECRET, 'test-user-secret'));

  app.register(ownerRoutes, { prefix: '/owners' });

  return { app, db };
}

describe('Owner routes', () => {
  let app: ReturnType<typeof buildApp>['app'];
  let db: ReturnType<typeof buildApp>['db'];

  beforeAll(async () => {
    const built = buildApp();
    app = built.app;
    db = built.db;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  it('POST /owners/register — creates owner (200)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/owners/register',
      payload: { username: 'testowner', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeTruthy();
    expect(body.ownerId).toBeTruthy();
    expect(body.username).toBe('testowner');
    expect(body.walletAddress).toBeTruthy();
  });

  it('POST /owners/register — rejects duplicate (409)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/owners/register',
      payload: { username: 'testowner', password: 'password456' },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('already exists');
  });

  it('POST /owners/login — returns token (200)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/owners/login',
      payload: { username: 'testowner', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeTruthy();
    expect(body.ownerId).toBeTruthy();
  });

  it('POST /owners/login — rejects wrong password (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/owners/login',
      payload: { username: 'testowner', password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Invalid credentials');
  });

  it('GET /owners/me — returns profile with valid token (200)', async () => {
    // Login to get a token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/owners/login',
      payload: { username: 'testowner', password: 'password123' },
    });
    const { token } = JSON.parse(loginRes.body);

    const res = await app.inject({
      method: 'GET',
      url: '/owners/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.username).toBe('testowner');
    expect(body.id).toBeTruthy();
    expect(body.wallet_address).toBeTruthy();
    // Should not expose password hash
    expect(body.password_hash).toBeUndefined();
  });
});
