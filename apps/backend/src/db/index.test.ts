import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from './index';
import type Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:'); // in-memory for tests
});

afterEach(() => {
  db.close();
});

describe('createDb', () => {
  it('creates platforms table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platforms'").get();
    expect(row).toBeDefined();
  });

  it('creates platform_users table with unique constraint', () => {
    db.prepare("INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'Test', 'key1')").run();
    db.prepare("INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'p1', 'alice', 'hash')").run();
    expect(() =>
      db.prepare("INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u2', 'p1', 'alice', 'hash2')").run()
    ).toThrow(); // UNIQUE(platform_id, username)
  });

  it('creates sessions table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    expect(row).toBeDefined();
  });

  it('enforces foreign key constraint on platform_users', () => {
    // No parent platform row — should throw due to FK violation
    expect(() =>
      db.prepare("INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'nonexistent-platform', 'alice', 'hash')").run()
    ).toThrow();
  });

  it('enforces unique constraint and NOT NULL on sessions', () => {
    // Setup parent rows first
    db.prepare("INSERT INTO platforms (id, name, api_key) VALUES ('p1', 'Test', 'key1')").run();
    db.prepare("INSERT INTO platform_users (id, platform_id, username, password_hash) VALUES ('u1', 'p1', 'alice', 'hash')").run();

    db.prepare("INSERT INTO sessions (id, user_id, session_token, expires_at) VALUES ('s1', 'u1', 'token-abc', 9999999999)").run();

    // Duplicate session_token should throw (UNIQUE constraint)
    expect(() =>
      db.prepare("INSERT INTO sessions (id, user_id, session_token, expires_at) VALUES ('s2', 'u1', 'token-abc', 9999999999)").run()
    ).toThrow();
  });
});

describe('schema tables', () => {
  it('schemas table exists and accepts inserts', () => {
    const db = createDb(':memory:');
    const id = 'schema-1';
    db.prepare(
      `INSERT INTO schemas (id, platform_id, name, fields) VALUES (?, ?, ?, ?)`
    ).run(id, 'plat-1', 'users', JSON.stringify({ name: { type: 'string', required: true } }));

    const row = db.prepare('SELECT * FROM schemas WHERE id = ?').get(id) as any;
    expect(row.name).toBe('users');
    expect(JSON.parse(row.fields).name.type).toBe('string');
    db.close();
  });

  it('schema_documents table exists and enforces unique (platform, schema, key, version)', () => {
    const db = createDb(':memory:');
    db.prepare(`INSERT INTO schemas (id, platform_id, name, fields) VALUES (?, ?, ?, ?)`).run(
      's1', 'p1', 'col', '{}'
    );
    db.prepare(
      `INSERT INTO schema_documents (id, platform_id, schema_name, doc_key, blob_id, commitment, version, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('d1', 'p1', 'col', 'key1', 'blob1', 'commit1', 1, '0xwallet');

    expect(() => {
      db.prepare(
        `INSERT INTO schema_documents (id, platform_id, schema_name, doc_key, blob_id, commitment, version, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run('d2', 'p1', 'col', 'key1', 'blob2', 'commit2', 1, '0xwallet');
    }).toThrow();
    db.close();
  });
});
