import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDb } from '../db/index';
import { PlatformService } from './platform-service';
import { EventService } from './event-service';
import type Database from 'better-sqlite3';

// Mock starknet.js CallData
vi.mock('starknet', () => ({
  CallData: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue([]),
  })),
}));

// Mock fs.readFileSync so artifact reads don't hit disk
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ abi: [] })),
  };
});

const mockProvider = {
  waitForTransaction: vi.fn().mockResolvedValue({}),
  callContract: vi.fn().mockResolvedValue(['0x1']), // current() returns 1
};

const mockDeployer = {
  address: '0xdeployeraddr',
  declareAndDeploy: vi.fn().mockResolvedValue({
    deploy: { address: '0xcontractaddr', transaction_hash: '0xdeploytx' },
  }),
  execute: vi.fn().mockResolvedValue({ transaction_hash: '0xminttx' }),
};

const mockWalletSvc = {
  getProvider: vi.fn().mockReturnValue(mockProvider),
  getDeployer: vi.fn().mockReturnValue(mockDeployer),
} as any;

let db: Database.Database;
let svc: EventService;
let platformId: string;

beforeEach(() => {
  db = createDb(':memory:');
  const platformSvc = new PlatformService(db);
  platformId = platformSvc.createPlatform('TestApp').id;
  svc = new EventService(db, mockWalletSvc);
  vi.clearAllMocks();
  mockProvider.waitForTransaction.mockResolvedValue({});
  mockProvider.callContract.mockResolvedValue(['0x1']);
  let deployCount = 0;
  mockDeployer.declareAndDeploy.mockImplementation(() => {
    deployCount++;
    return Promise.resolve({
      deploy: { address: `0xcontractaddr${deployCount}`, transaction_hash: `0xdeploytx${deployCount}` },
    });
  });
  mockDeployer.execute.mockResolvedValue({ transaction_hash: '0xminttx' });
});

afterEach(() => { db.close(); });

describe('EventService.createEvent', () => {
  it('deploys contract and returns EventRecord', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    const event = await svc.createEvent(
      platformId, 'Hackathon 2026', 'Annual hackathon', 'https://img.com/1.png', 0, '0xcreator'
    );
    expect(event.name).toBe('Hackathon 2026');
    expect(event.contractAddress).toBe('0xcontractaddr1');
    expect(event.txHash).toBe('0xdeploytx1');
    expect(event.creatorWallet).toBe('0xcreator');
    expect(event.maxSupply).toBe(0);
  });

  it('persists event to SQLite', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    const event = await svc.createEvent(
      platformId, 'Test Event', 'Desc', 'https://img.com/1.png', 5, '0xcreator'
    );
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id) as any;
    expect(row).toBeTruthy();
    expect(row.max_supply).toBe(5);
  });
});

describe('EventService.listEvents', () => {
  it('returns events for platform', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    await svc.createEvent(platformId, 'E1', 'D1', 'https://i.com/1.png', 0, '0xcreator');
    await svc.createEvent(platformId, 'E2', 'D2', 'https://i.com/2.png', 0, '0xcreator');
    const events = svc.listEvents(platformId);
    expect(events).toHaveLength(2);
  });
});

describe('EventService.mintToUser', () => {
  it('mints NFT and returns EventMint', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    const event = await svc.createEvent(
      platformId, 'Hackathon', 'Desc', 'https://i.com/1.png', 0, '0xcreator'
    );
    const mint = await svc.mintToUser(event.id, platformId, '0xcreator', '0xrecipient');
    expect(mint.eventId).toBe(event.id);
    expect(mint.recipient).toBe('0xrecipient');
    expect(mint.tokenId).toBe('1');
    expect(mint.txHash).toBe('0xminttx');
  });

  it('throws 403 when caller is not creator', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    const event = await svc.createEvent(
      platformId, 'Hackathon', 'Desc', 'https://i.com/1.png', 0, '0xcreator'
    );
    await expect(
      svc.mintToUser(event.id, platformId, '0xnotcreator', '0xrecipient')
    ).rejects.toThrow('Only the event creator');
  });

  it('throws 404 for unknown event', async () => {
    await expect(
      svc.mintToUser('nonexistent', platformId, '0xcreator', '0xrecipient')
    ).rejects.toThrow('not found');
  });
});

describe('EventService.listMints', () => {
  it('returns mints for event', async () => {
    process.env.EVENT_NFT_BASE_URL = 'https://api.example.com';
    const event = await svc.createEvent(
      platformId, 'E', 'D', 'https://i.com/1.png', 0, '0xcreator'
    );
    await svc.mintToUser(event.id, platformId, '0xcreator', '0xrecip1');
    await svc.mintToUser(event.id, platformId, '0xcreator', '0xrecip2');
    const mints = svc.listMints(event.id, platformId);
    expect(mints).toHaveLength(2);
  });
});
