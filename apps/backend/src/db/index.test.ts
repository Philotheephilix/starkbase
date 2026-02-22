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
