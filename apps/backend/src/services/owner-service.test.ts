import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDb } from '../db/index';
import { OwnerService } from './owner-service';
import type { WalletServiceLike } from './owner-service';
import type Database from 'better-sqlite3';

const mockWalletService: WalletServiceLike = {
  derivePrivateKey: vi.fn().mockReturnValue('0xdeadbeef'),
  computeAddress: vi.fn().mockReturnValue('0xwallet123'),
  deployAccount: vi.fn().mockResolvedValue('0xtxhash'),
};

const JWT_SECRET = 'test-owner-jwt-secret';

let db: Database.Database;
let ownerService: OwnerService;

beforeEach(() => {
  db = createDb(':memory:');
  ownerService = new OwnerService(db, mockWalletService, JWT_SECRET);
  vi.clearAllMocks();
});

afterEach(() => {
  db.close();
});

describe('OwnerService.register', () => {
  it('creates owner with hashed password and derived wallet', async () => {
    const result = await ownerService.register({
      username: 'alice',
      password: 'securepass',
      email: 'alice@example.com',
    });

    expect(result.token).toBeTruthy();
    expect(result.ownerId).toBeTruthy();
    expect(result.username).toBe('alice');
    expect(result.walletAddress).toBe('0xwallet123');

    expect(mockWalletService.derivePrivateKey).toHaveBeenCalledWith('owner:alice');
    expect(mockWalletService.computeAddress).toHaveBeenCalledWith('0xdeadbeef');

    // Verify password is hashed (not stored as plaintext)
    const row = db.prepare('SELECT password_hash FROM owners WHERE id = ?').get(result.ownerId) as {
      password_hash: string;
    };
    expect(row.password_hash).not.toBe('securepass');
    expect(row.password_hash.startsWith('$2')).toBe(true);
  });

  it('rejects duplicate username', async () => {
    await ownerService.register({ username: 'alice', password: 'pass1' });
    await expect(ownerService.register({ username: 'alice', password: 'pass2' })).rejects.toThrow(
      /UNIQUE constraint/,
    );
  });
});

describe('OwnerService.login', () => {
  beforeEach(async () => {
    await ownerService.register({ username: 'alice', password: 'correctpass' });
  });

  it('returns token on valid credentials', async () => {
    const result = await ownerService.login({ username: 'alice', password: 'correctpass' });
    expect(result.token).toBeTruthy();
    expect(result.username).toBe('alice');
    expect(result.walletAddress).toBe('0xwallet123');
  });

  it('rejects wrong password', async () => {
    await expect(ownerService.login({ username: 'alice', password: 'wrongpass' })).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('rejects non-existent username', async () => {
    await expect(ownerService.login({ username: 'nobody', password: 'pass' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});

describe('OwnerService.verifyToken', () => {
  it('decodes a valid owner token', async () => {
    const { token, ownerId } = await ownerService.register({ username: 'alice', password: 'pass' });
    const payload = ownerService.verifyToken(token);

    expect(payload.type).toBe('owner');
    expect(payload.ownerId).toBe(ownerId);
    expect(payload.username).toBe('alice');
    expect(payload.iss).toBe('starkbase');
    expect(payload.aud).toBe('owner');
  });

  it('rejects token with stale tokenVersion', async () => {
    const { token, ownerId } = await ownerService.register({ username: 'alice', password: 'pass' });

    // Bump token_version in DB to simulate revocation
    db.prepare('UPDATE owners SET token_version = token_version + 1 WHERE id = ?').run(ownerId);

    expect(() => ownerService.verifyToken(token)).toThrow('Token revoked');
  });
});

describe('OwnerService.getById', () => {
  it('returns owner without password_hash', async () => {
    const { ownerId } = await ownerService.register({ username: 'alice', password: 'pass' });
    const owner = ownerService.getById(ownerId);

    expect(owner).not.toBeNull();
    expect(owner!.username).toBe('alice');
    expect(owner!.wallet_address).toBe('0xwallet123');
    expect((owner as any).password_hash).toBeUndefined();
  });
});
