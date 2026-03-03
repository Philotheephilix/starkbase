import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDb } from '../db/index';
import { PlatformService } from './platform-service';
import { TokenService } from './token-service';
import type Database from 'better-sqlite3';

vi.mock('starknet', () => ({
  CallData: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue([]),
  })),
  uint256: {
    bnToUint256: vi.fn().mockReturnValue({ low: '0x1', high: '0x0' }),
    uint256ToBN: vi.fn().mockImplementation(({ low }: { low: string; high: string }) =>
      BigInt(low)
    ),
  },
  hash: {
    getSelectorFromName: vi.fn().mockReturnValue('0xtransferselector'),
  },
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ abi: [] })),
  };
});

const mockProvider = {
  waitForTransaction: vi.fn().mockResolvedValue({}),
  getEvents: vi.fn().mockResolvedValue({ events: [], is_last_page: true }),
};

const mockDeployer = {
  address: '0xdeployeraddr',
  declareAndDeploy: vi.fn().mockResolvedValue({
    deploy: { address: '0xtokencontract', transaction_hash: '0xdeploytx' },
  }),
  execute: vi.fn().mockResolvedValue({ transaction_hash: '0xminttx' }),
};

const mockWalletSvc = {
  getProvider: vi.fn().mockReturnValue(mockProvider),
  getDeployer: vi.fn().mockReturnValue(mockDeployer),
} as any;

let db: Database.Database;
let svc: TokenService;
let platformId: string;

beforeEach(() => {
  db = createDb(':memory:');
  const platformSvc = new PlatformService(db);
  platformId = platformSvc.createPlatform('GamePlatform').id;
  svc = new TokenService(db, mockWalletSvc);
  vi.clearAllMocks();
  mockProvider.waitForTransaction.mockResolvedValue({});
  mockProvider.getEvents.mockResolvedValue({ events: [], is_last_page: true });
  mockDeployer.declareAndDeploy.mockResolvedValue({
    deploy: { address: '0xtokencontract', transaction_hash: '0xdeploytx' },
  });
  mockDeployer.execute.mockResolvedValue({ transaction_hash: '0xminttx' });
});

afterEach(() => { db.close(); });

describe('TokenService.deployToken', () => {
  it('deploys contract and returns CreatedToken with creatorWallet', async () => {
    const result = await svc.deployToken(
      'Gold', 'GLD', '1000000', '0xrecipient', platformId, '0xcreator'
    );
    expect(result.contractAddress).toBe('0xtokencontract');
    expect(result.transactionHash).toBe('0xdeploytx');
    expect(result.name).toBe('Gold');
    expect(result.symbol).toBe('GLD');
    expect(result.creatorWallet).toBe('0xcreator');
    expect(result.platformId).toBe(platformId);
  });

  it('passes deployer.address as owner in constructor calldata', async () => {
    const { CallData } = await import('starknet');
    const compileMock = vi.fn().mockReturnValue([]);
    (CallData as any).mockImplementation(() => ({ compile: compileMock }));

    await svc.deployToken('Gold', 'GLD', '1000', '0xrecip', platformId, '0xcreator');

    expect(compileMock).toHaveBeenCalledWith('constructor', expect.objectContaining({
      owner: '0xdeployeraddr',
    }));
  });

  it('persists creator_wallet in deployed_tokens table', async () => {
    await svc.deployToken('Gold', 'GLD', '1000', '0xrecip', platformId, '0xcreator');
    const row = db.prepare('SELECT * FROM deployed_tokens WHERE contract_address = ?')
      .get('0xtokencontract') as any;
    expect(row.creator_wallet).toBe('0xcreator');
  });
});

describe('TokenService.mintToken', () => {
  it('mints tokens and returns MintTokenResponse', async () => {
    await svc.deployToken('Gold', 'GLD', '1000', '0xrecip', platformId, '0xcreator');
    const result = await svc.mintToken(
      '0xtokencontract', platformId, '0xcreator', '0xplayer', '500'
    );
    expect(result.txHash).toBe('0xminttx');
    expect(result.recipient).toBe('0xplayer');
    expect(result.amount).toBe('500');
  });

  it('throws 403 when caller is not the creator', async () => {
    await svc.deployToken('Gold', 'GLD', '1000', '0xrecip', platformId, '0xcreator');
    await expect(
      svc.mintToken('0xtokencontract', platformId, '0xnotcreator', '0xplayer', '500')
    ).rejects.toThrow('Only the token creator');
  });

  it('throws 404 for unknown contract address', async () => {
    await expect(
      svc.mintToken('0xunknown', platformId, '0xcreator', '0xplayer', '500')
    ).rejects.toThrow('not found');
  });
});

describe('TokenService.listTokens', () => {
  it('returns all tokens for the platform', async () => {
    await svc.deployToken('Gold', 'GLD', '1000', '0xrecip', platformId, '0xcreator');
    mockDeployer.declareAndDeploy.mockResolvedValue({
      deploy: { address: '0xtokencontract2', transaction_hash: '0xdeploytx2' },
    });
    await svc.deployToken('Gems', 'GEM', '500', '0xrecip', platformId, '0xcreator');
    const tokens = svc.listTokens(platformId);
    expect(tokens).toHaveLength(2);
  });

  it('returns empty array for platform with no tokens', () => {
    const tokens = svc.listTokens(platformId);
    expect(tokens).toHaveLength(0);
  });
});

describe('TokenService.getMintHistory', () => {
  it('returns parsed mint events from RPC', async () => {
    mockProvider.getEvents.mockResolvedValue({
      events: [
        {
          transaction_hash: '0xabc',
          keys: ['0xselector', '0x0', '0xrecipient'],
          data: ['0x64', '0x0'],   // 100 low, 0 high → amount "100"
          block_number: 1234,
        },
      ],
      is_last_page: true,
    });
    const history = await svc.getMintHistory('0xtokencontract');
    expect(history).toHaveLength(1);
    expect(history[0].txHash).toBe('0xabc');
    expect(history[0].recipient).toBe('0xrecipient');
    expect(history[0].amount).toBe('100');
    expect(history[0].blockNumber).toBe(1234);
  });

  it('returns empty array when no mints', async () => {
    mockProvider.getEvents.mockResolvedValue({ events: [], is_last_page: true });
    const history = await svc.getMintHistory('0xtokencontract');
    expect(history).toHaveLength(0);
  });

  it('calls getEvents with Transfer selector and zero-address from filter', async () => {
    mockProvider.getEvents.mockResolvedValue({ events: [], is_last_page: true });
    await svc.getMintHistory('0xtokencontract');
    expect(mockProvider.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xtokencontract',
        keys: expect.arrayContaining([expect.arrayContaining([expect.any(String)]), ['0x0']]),
      })
    );
  });
});
