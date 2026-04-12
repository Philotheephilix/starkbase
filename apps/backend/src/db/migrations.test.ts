import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

let db: Database.Database;

/** Minimal prerequisite tables that exist in production but not in a fresh in-memory DB. */
function createPrerequisites(db: Database.Database) {
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
  `);
}

function tableExists(name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  return row !== undefined;
}

function getColumns(table: string): string[] {
  return (db.pragma(`table_info(${table})`) as Array<{ name: string }>).map(
    (c) => c.name,
  );
}

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createPrerequisites(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

// ── Table existence ─────────────────────────────────────────────────────

describe('new tables exist', () => {
  const tables = [
    'owners',
    'owner_platforms',
    'roles',
    'role_permissions',
    'platform_user_roles',
    'external_wallets',
    'platform_settings',
    'storage_registries',
    'audit_logs',
  ];

  for (const t of tables) {
    it(`creates ${t} table`, () => {
      expect(tableExists(t)).toBe(true);
    });
  }
});

// ── Idempotency ─────────────────────────────────────────────────────────

describe('idempotency', () => {
  it('can run migrations twice without error', () => {
    expect(() => runMigrations(db)).not.toThrow();
  });
});

// ── owners constraints ──────────────────────────────────────────────────

describe('owners', () => {
  it('enforces unique username', () => {
    db.prepare(
      `INSERT INTO owners (id, username, password_hash, wallet_address, created_at)
       VALUES ('o1', 'alice', 'h', '0x1', 1)`,
    ).run();
    expect(() =>
      db.prepare(
        `INSERT INTO owners (id, username, password_hash, wallet_address, created_at)
         VALUES ('o2', 'alice', 'h', '0x2', 2)`,
      ).run(),
    ).toThrow();
  });

  it('enforces unique email', () => {
    db.prepare(
      `INSERT INTO owners (id, username, email, password_hash, wallet_address, created_at)
       VALUES ('o1', 'a', 'a@b.c', 'h', '0x1', 1)`,
    ).run();
    expect(() =>
      db.prepare(
        `INSERT INTO owners (id, username, email, password_hash, wallet_address, created_at)
         VALUES ('o2', 'b', 'a@b.c', 'h', '0x2', 2)`,
      ).run(),
    ).toThrow();
  });
});

// ── owner_platforms constraints ──────────────────────────────────────────

describe('owner_platforms', () => {
  it('enforces FK to owners and platforms', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO owner_platforms (owner_id, platform_id) VALUES ('bad', 'bad')`,
      ).run(),
    ).toThrow();
  });

  it('enforces unique platform_id', () => {
    db.prepare(`INSERT INTO owners (id, username, password_hash, wallet_address, created_at) VALUES ('o1', 'a', 'h', '0x1', 1)`).run();
    db.prepare(`INSERT INTO owners (id, username, password_hash, wallet_address, created_at) VALUES ('o2', 'b', 'h', '0x2', 2)`).run();
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO owner_platforms (owner_id, platform_id) VALUES ('o1', 'p1')`).run();
    expect(() =>
      db.prepare(`INSERT INTO owner_platforms (owner_id, platform_id) VALUES ('o2', 'p1')`).run(),
    ).toThrow();
  });
});

// ── roles constraints ───────────────────────────────────────────────────

describe('roles', () => {
  it('enforces unique (platform_id, name)', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO roles (id, platform_id, name, created_at) VALUES ('r1', 'p1', 'admin', 1)`).run();
    expect(() =>
      db.prepare(`INSERT INTO roles (id, platform_id, name, created_at) VALUES ('r2', 'p1', 'admin', 2)`).run(),
    ).toThrow();
  });

  it('enforces FK to platforms', () => {
    expect(() =>
      db.prepare(`INSERT INTO roles (id, platform_id, name, created_at) VALUES ('r1', 'bad', 'admin', 1)`).run(),
    ).toThrow();
  });
});

// ── role_permissions ────────────────────────────────────────────────────

describe('role_permissions', () => {
  it('enforces FK to roles', () => {
    expect(() =>
      db.prepare(`INSERT INTO role_permissions (role_id, permission) VALUES ('bad', 'read')`).run(),
    ).toThrow();
  });

  it('enforces PK uniqueness', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO roles (id, platform_id, name, created_at) VALUES ('r1', 'p1', 'admin', 1)`).run();
    db.prepare(`INSERT INTO role_permissions (role_id, permission) VALUES ('r1', 'read')`).run();
    expect(() =>
      db.prepare(`INSERT INTO role_permissions (role_id, permission) VALUES ('r1', 'read')`).run(),
    ).toThrow();
  });
});

// ── platform_user_roles ─────────────────────────────────────────────────

describe('platform_user_roles', () => {
  it('enforces FK to platform_users and roles', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES ('bad', 'bad', 'x', 1)`,
      ).run(),
    ).toThrow();
  });
});

// ── external_wallets CHECK ──────────────────────────────────────────────

describe('external_wallets', () => {
  it('rejects both owner_id and user_id set', () => {
    db.prepare(`INSERT INTO owners (id, username, password_hash, wallet_address, created_at) VALUES ('o1', 'a', 'h', '0x1', 1)`).run();
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'p1', 'alice', 'h')`).run();
    expect(() =>
      db.prepare(
        `INSERT INTO external_wallets (id, owner_id, user_id, wallet_address, linked_at)
         VALUES ('w1', 'o1', 'u1', '0xabc', 1)`,
      ).run(),
    ).toThrow();
  });

  it('rejects both owner_id and user_id null', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO external_wallets (id, owner_id, user_id, wallet_address, linked_at)
         VALUES ('w1', NULL, NULL, '0xabc', 1)`,
      ).run(),
    ).toThrow();
  });

  it('allows owner_id only', () => {
    db.prepare(`INSERT INTO owners (id, username, password_hash, wallet_address, created_at) VALUES ('o1', 'a', 'h', '0x1', 1)`).run();
    expect(() =>
      db.prepare(
        `INSERT INTO external_wallets (id, owner_id, user_id, wallet_address, linked_at)
         VALUES ('w1', 'o1', NULL, '0xabc', 1)`,
      ).run(),
    ).not.toThrow();
  });

  it('allows user_id only', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'p1', 'alice', 'h')`).run();
    expect(() =>
      db.prepare(
        `INSERT INTO external_wallets (id, owner_id, user_id, wallet_address, linked_at)
         VALUES ('w1', NULL, 'u1', '0xabc', 1)`,
      ).run(),
    ).not.toThrow();
  });
});

// ── platform_settings ───────────────────────────────────────────────────

describe('platform_settings', () => {
  it('enforces FK to platforms', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO platform_settings (platform_id, updated_at) VALUES ('bad', 1)`,
      ).run(),
    ).toThrow();
  });

  it('defaults registration_enabled to 1', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(`INSERT INTO platform_settings (platform_id, updated_at) VALUES ('p1', 1)`).run();
    const row = db.prepare(`SELECT registration_enabled FROM platform_settings WHERE platform_id='p1'`).get() as any;
    expect(row.registration_enabled).toBe(1);
  });
});

// ── storage_registries ──────────────────────────────────────────────────

describe('storage_registries', () => {
  it('enforces unique (platform_id, name)', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(
      `INSERT INTO storage_registries (id, platform_id, name, created_at) VALUES ('sr1', 'p1', 'images', 1)`,
    ).run();
    expect(() =>
      db.prepare(
        `INSERT INTO storage_registries (id, platform_id, name, created_at) VALUES ('sr2', 'p1', 'images', 2)`,
      ).run(),
    ).toThrow();
  });
});

// ── audit_logs indexes ──────────────────────────────────────────────────

describe('audit_logs', () => {
  it('has platform index', () => {
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_audit_logs_platform'")
      .get();
    expect(idx).toBeDefined();
  });

  it('has actor index', () => {
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_audit_logs_actor'")
      .get();
    expect(idx).toBeDefined();
  });

  it('accepts a full insert', () => {
    db.prepare(
      `INSERT INTO audit_logs (id, actor_type, actor_id, action, created_at)
       VALUES ('a1', 'owner', 'o1', 'login', 1)`,
    ).run();
    const row = db.prepare(`SELECT * FROM audit_logs WHERE id='a1'`).get() as any;
    expect(row.actor_type).toBe('owner');
  });
});

// ── Column additions ────────────────────────────────────────────────────

describe('column additions', () => {
  it('adds token_version to platform_users', () => {
    expect(getColumns('platform_users')).toContain('token_version');
  });

  it('adds registry_id to blob_files', () => {
    expect(getColumns('blob_files')).toContain('registry_id');
  });

  it('token_version defaults to 0', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    db.prepare(
      `INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'p1', 'alice', 'h')`,
    ).run();
    const row = db.prepare(`SELECT token_version FROM platform_users WHERE id='u1'`).get() as any;
    expect(row.token_version).toBe(0);
  });

  it('registry_id is nullable and references storage_registries', () => {
    db.prepare(`INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'P', 'k1')`).run();
    // Insert with NULL registry_id — should work
    db.prepare(
      `INSERT INTO blob_files (id, platform_id, blob_id, commitment, size)
       VALUES ('bf1', 'p1', 'b1', 'c1', 100)`,
    ).run();
    const row = db.prepare(`SELECT registry_id FROM blob_files WHERE id='bf1'`).get() as any;
    expect(row.registry_id).toBeNull();
  });
});
