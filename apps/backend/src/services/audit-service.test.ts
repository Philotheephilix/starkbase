import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../db/index';
import { AuditService } from './audit-service';
import type Database from 'better-sqlite3';

let db: Database.Database;
let svc: AuditService;

beforeEach(() => {
  db = createDb(':memory:');
  svc = new AuditService(db);
});

afterEach(() => { db.close(); });

describe('AuditService', () => {
  it('log() creates an audit entry and it is retrievable from DB', () => {
    svc.log({
      actorType: 'owner',
      actorId: 'owner-1',
      platformId: 'plat-1',
      action: 'platform.create',
    });

    const row = db.prepare('SELECT * FROM audit_logs WHERE actor_id = ?').get('owner-1') as any;
    expect(row).toBeTruthy();
    expect(row.actor_type).toBe('owner');
    expect(row.action).toBe('platform.create');
    expect(row.platform_id).toBe('plat-1');
    expect(row.created_at).toBeTypeOf('number');
    expect(row.created_at).toBeGreaterThan(0);
  });

  it('log() with optional metadata and ipAddress stores them correctly', () => {
    const meta = { browser: 'Firefox', version: 42 };
    svc.log({
      actorType: 'user',
      actorId: 'user-1',
      platformId: 'plat-1',
      action: 'login',
      metadata: meta,
      ipAddress: '192.168.1.1',
    });

    const row = db.prepare('SELECT * FROM audit_logs WHERE actor_id = ?').get('user-1') as any;
    expect(row.metadata).toBe(JSON.stringify(meta));
    expect(row.ip_address).toBe('192.168.1.1');
  });

  it('getByPlatform() returns only entries for that platform, ordered by created_at DESC', () => {
    // Insert entries for two different platforms with different timestamps
    const now = Date.now();
    db.prepare(
      'INSERT INTO audit_logs (id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('id-1', 'owner', 'o1', 'plat-A', 'action.first', null, null, null, null, now - 2000);

    db.prepare(
      'INSERT INTO audit_logs (id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('id-2', 'owner', 'o1', 'plat-A', 'action.second', null, null, null, null, now - 1000);

    db.prepare(
      'INSERT INTO audit_logs (id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('id-3', 'owner', 'o1', 'plat-A', 'action.third', null, null, null, null, now);

    // Different platform
    db.prepare(
      'INSERT INTO audit_logs (id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('id-4', 'user', 'u1', 'plat-B', 'action.other', null, null, null, null, now);

    const results = svc.getByPlatform('plat-A');
    expect(results).toHaveLength(3);
    // Should be ordered DESC by created_at
    expect(results[0].action).toBe('action.third');
    expect(results[1].action).toBe('action.second');
    expect(results[2].action).toBe('action.first');
    // Should not include plat-B entries
    expect(results.every(r => r.platformId === 'plat-A')).toBe(true);
  });
});
