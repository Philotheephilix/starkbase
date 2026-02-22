import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../db/index';
import { PlatformService } from './platform-service';
import type Database from 'better-sqlite3';

let db: Database.Database;
let svc: PlatformService;

beforeEach(() => {
  db = createDb(':memory:');
  svc = new PlatformService(db);
});

afterEach(() => { db.close(); });

describe('PlatformService', () => {
  it('creates a platform and returns it with an api_key', () => {
    const platform = svc.createPlatform('My App');
    expect(platform.name).toBe('My App');
    expect(platform.apiKey).toBeTruthy();
    expect(platform.id).toBeTruthy();
    expect(platform.createdAt).toBeTypeOf('number');
    expect(platform.createdAt).toBeGreaterThan(0);
  });

  it('resolves a platform by valid api_key', () => {
    const { apiKey } = svc.createPlatform('My App');
    const resolved = svc.getByApiKey(apiKey);
    expect(resolved).not.toBeNull();
    expect(resolved!.name).toBe('My App');
  });

  it('returns null for an unknown api_key', () => {
    expect(svc.getByApiKey('unknown-key')).toBeNull();
  });

  it('api_key starts with sb_', () => {
    const { apiKey } = svc.createPlatform('Test');
    expect(apiKey).toMatch(/^sb_/);
  });
});
