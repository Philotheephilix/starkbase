import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDb } from '../db/index';
import { AuthService } from './auth-service';
import { PlatformService } from './platform-service';
import { WalletService } from './wallet-service';
import type Database from 'better-sqlite3';

// Mock deployAccount so tests don't hit real Starknet
vi.mock('./wallet-service', () => {
  return {
    WalletService: vi.fn().mockImplementation(() => ({
      derivePrivateKey: (platformId: string, username: string) =>
        `0xprivkey_${platformId}_${username}`,
      computeAddress: (key: string) => `0xaddr_${key}`,
      getProvider: () => ({}),
      getDeployer: () => ({}),
      deployAccount: vi.fn().mockResolvedValue({
        address: '0xdeployedaddr',
        transactionHash: '0xtxhash',
      }),
    })),
  };
});

let db: Database.Database;
let platformSvc: PlatformService;
let walletSvc: WalletService;
let authSvc: AuthService;
let apiKey: string;

beforeEach(() => {
  db = createDb(':memory:');
  platformSvc = new PlatformService(db);
  walletSvc = new WalletService('test-secret');
  authSvc = new AuthService(db, walletSvc, platformSvc);

  const platform = platformSvc.createPlatform('Test App');
  apiKey = platform.apiKey;
});

afterEach(() => { db.close(); });

describe('AuthService.register', () => {
  it('creates a user and returns walletAddress + sessionToken', async () => {
    const result = await authSvc.register(apiKey, 'alice', 'password123');
    expect(result.walletAddress).toBe('0xdeployedaddr');
    expect(result.sessionToken).toBeTruthy();
    expect(result.username).toBe('alice');
    expect(result.platformId).toBeTruthy();
  });

  it('throws 409 if username already taken on same platform', async () => {
    await authSvc.register(apiKey, 'alice', 'pass1');
    await expect(authSvc.register(apiKey, 'alice', 'pass2')).rejects.toThrow('Username already exists');
  });

  it('allows same username on different platforms', async () => {
    const { apiKey: apiKey2 } = platformSvc.createPlatform('App 2');
    await authSvc.register(apiKey, 'alice', 'pass1');
    const result = await authSvc.register(apiKey2, 'alice', 'pass2');
    expect(result.username).toBe('alice');
  });
});

describe('AuthService.login', () => {
  beforeEach(async () => {
    await authSvc.register(apiKey, 'alice', 'correctpassword');
  });

  it('returns walletAddress + new sessionToken on correct password', async () => {
    const result = await authSvc.login(apiKey, 'alice', 'correctpassword');
    expect(result.walletAddress).toBeTruthy();
    expect(result.sessionToken).toBeTruthy();
  });

  it('throws 401 on wrong password', async () => {
    await expect(authSvc.login(apiKey, 'alice', 'wrongpassword')).rejects.toThrow('Invalid credentials');
  });

  it('throws 401 on unknown username', async () => {
    await expect(authSvc.login(apiKey, 'unknown', 'pass')).rejects.toThrow('Invalid credentials');
  });
});

describe('AuthService.verifySession', () => {
  it('returns user for valid session token', async () => {
    const { sessionToken } = await authSvc.register(apiKey, 'alice', 'pass');
    const user = authSvc.verifySession(sessionToken);
    expect(user.username).toBe('alice');
    expect(user.walletAddress).toBeTruthy();
  });

  it('throws for invalid token', () => {
    expect(() => authSvc.verifySession('bad.token.here')).toThrow();
  });
});
