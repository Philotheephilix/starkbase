import { describe, it, expect } from 'vitest';
import { WalletService } from './wallet-service';

const svc = new WalletService('test-master-secret');

describe('WalletService.derivePrivateKey', () => {
  it('returns the same key for the same inputs every time', () => {
    const k1 = svc.derivePrivateKey('platform-1', 'alice');
    const k2 = svc.derivePrivateKey('platform-1', 'alice');
    expect(k1).toBe(k2);
  });

  it('returns a different key for a different platform', () => {
    const k1 = svc.derivePrivateKey('platform-1', 'alice');
    const k2 = svc.derivePrivateKey('platform-2', 'alice');
    expect(k1).not.toBe(k2);
  });

  it('returns a different key for a different username', () => {
    const k1 = svc.derivePrivateKey('platform-1', 'alice');
    const k2 = svc.derivePrivateKey('platform-1', 'bob');
    expect(k1).not.toBe(k2);
  });

  it('returns a hex string starting with 0x', () => {
    const key = svc.derivePrivateKey('platform-1', 'alice');
    expect(key).toMatch(/^0x[0-9a-f]+$/i);
  });
});

describe('WalletService.computeAddress', () => {
  it('returns a deterministic Starknet address', () => {
    const key = svc.derivePrivateKey('platform-1', 'alice');
    const addr1 = svc.computeAddress(key);
    const addr2 = svc.computeAddress(key);
    expect(addr1).toBe(addr2);
  });

  it('returns a hex string starting with 0x', () => {
    const key = svc.derivePrivateKey('platform-1', 'alice');
    const addr = svc.computeAddress(key);
    expect(addr).toMatch(/^0x[0-9a-f]+$/i);
  });

  it('different private keys produce different addresses', () => {
    const k1 = svc.derivePrivateKey('platform-1', 'alice');
    const k2 = svc.derivePrivateKey('platform-2', 'alice');
    expect(svc.computeAddress(k1)).not.toBe(svc.computeAddress(k2));
  });
});
