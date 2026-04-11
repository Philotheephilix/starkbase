import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../index';
import { createDb } from '../db/index';

vi.mock('../services/wallet-service', () => ({
  WalletService: vi.fn().mockImplementation(() => {
    let accountCount = 0;
    let tokenCount = 0;
    return {
      derivePrivateKey: () => '0xprivkey',
      computeAddress: () => '0xcomputedaddr',
      getProvider: vi.fn().mockReturnValue({
        waitForTransaction: vi.fn().mockResolvedValue({}),
        getEvents: vi.fn().mockResolvedValue({ events: [], is_last_page: true }),
      }),
      getDeployer: vi.fn().mockImplementation(() => ({
        address: '0xdeployeraddr',
        declareAndDeploy: vi.fn().mockImplementation(() => {
          tokenCount++;
          return Promise.resolve({
            deploy: {
              address: `0xtokencontract${tokenCount}`,
              transaction_hash: `0xdeploytx${tokenCount}`,
            },
          });
        }),
        execute: vi.fn().mockResolvedValue({ transaction_hash: '0xminttx' }),
      })),
      deployAccount: vi.fn().mockImplementation(() => {
        accountCount++;
        return Promise.resolve({ address: `0xdeployedaddr${accountCount}`, transactionHash: '0xtx' });
      }),
    };
  }),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ abi: [] })),
  };
});

vi.mock('starknet', () => ({
  CallData: vi.fn().mockImplementation(() => ({
    compile: vi.fn().mockReturnValue([]),
  })),
  uint256: {
    bnToUint256: vi.fn().mockReturnValue({ low: '0x1', high: '0x0' }),
    uint256ToBN: vi.fn().mockReturnValue(BigInt(0)),
  },
  hash: {
    getSelectorFromName: vi.fn().mockReturnValue('0xselector'),
  },
}));

async function bootstrap(db: ReturnType<typeof createDb>) {
  const app = buildApp(db);

  // Create owner and platform
  const ownerRegRes = await app.inject({
    method: 'POST', url: '/owners/register',
    payload: { username: `owner_${Date.now()}`, password: 'ownerpass123' },
  });
  const { token: ownerToken } = JSON.parse(ownerRegRes.body);
  const platRes = await app.inject({
    method: 'POST', url: '/owners/platforms',
    headers: { Authorization: `Bearer ${ownerToken}` },
    payload: { name: 'TestGame' },
  });
  const { apiKey, id: platformId } = JSON.parse(platRes.body);

  // Register user
  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { apiKey, username: 'alice', password: 'secret' },
  });
  const { sessionToken, walletAddress } = JSON.parse(regRes.body);

  // Assign admin role so user has all permissions needed for tests
  const adminRole = db.prepare("SELECT id FROM roles WHERE platform_id = ? AND name = 'admin'").get(platformId) as any;
  const user = db.prepare("SELECT id FROM platform_users WHERE platform_id = ? AND username = 'alice'").get(platformId) as any;
  if (adminRole && user) {
    db.prepare("INSERT OR IGNORE INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, 'system', ?)").run(user.id, adminRole.id, Date.now());
  }

  return { app, sessionToken, walletAddress, apiKey, platformId };
}

describe('Token routes', () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => { db = createDb(':memory:'); });

  it('POST /tokens/deploy requires auth', async () => {
    const { app } = await bootstrap(db);
    const res = await app.inject({
      method: 'POST', url: '/tokens/deploy',
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000000', recipientAddress: '0xrecip' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /tokens/deploy deploys a token contract and returns 201', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const res = await app.inject({
      method: 'POST', url: '/tokens/deploy',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000000', recipientAddress: '0xrecip' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe('Gold');
    expect(body.symbol).toBe('GLD');
    expect(body.contractAddress).toMatch(/^0xtokencontract/);
    expect(body.creatorWallet).toBeTruthy();
  });

  it('GET /tokens lists tokens for the platform', async () => {
    const { app, sessionToken } = await bootstrap(db);
    await app.inject({
      method: 'POST', url: '/tokens/deploy',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000', recipientAddress: '0xrecip' },
    });
    const res = await app.inject({
      method: 'GET', url: '/tokens',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const tokens = JSON.parse(res.body);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('Gold');
  });

  it('POST /tokens/:address/mint mints tokens and returns 201', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const deployRes = await app.inject({
      method: 'POST', url: '/tokens/deploy',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000', recipientAddress: '0xrecip' },
    });
    const { contractAddress } = JSON.parse(deployRes.body);
    const res = await app.inject({
      method: 'POST', url: `/tokens/${contractAddress}/mint`,
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { recipient: '0xplayer', amount: '100' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.recipient).toBe('0xplayer');
    expect(body.amount).toBe('100');
    expect(body.txHash).toBe('0xminttx');
  });

  it('POST /tokens/:address/mint returns 403 for non-creator', async () => {
    const { app, sessionToken, walletAddress, apiKey, platformId } = await bootstrap(db);

    // alice deploys the token
    const deployRes = await app.inject({
      method: 'POST', url: '/tokens/deploy',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000', recipientAddress: '0xrecip' },
    });
    const { contractAddress } = JSON.parse(deployRes.body);

    // bob registers on the SAME platform as alice
    const regRes2 = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { apiKey, username: 'bob', password: 'secret' },
    });
    const { sessionToken: bobToken, walletAddress: bobWallet } = JSON.parse(regRes2.body);
    expect(bobWallet).not.toBe(walletAddress); // wallets must differ for 403 check to be meaningful

    // Assign admin role to bob so he passes permission middleware (the 403 should come from creator check)
    const adminRole = db.prepare("SELECT id FROM roles WHERE platform_id = ? AND name = 'admin'").get(platformId) as any;
    const bobUser = db.prepare("SELECT id FROM platform_users WHERE platform_id = ? AND username = 'bob'").get(platformId) as any;
    if (adminRole && bobUser) {
      db.prepare("INSERT OR IGNORE INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, 'system', ?)").run(bobUser.id, adminRole.id, Date.now());
    }

    // bob tries to mint alice's token — should get 403 (wrong creator, same platform)
    const res = await app.inject({
      method: 'POST', url: `/tokens/${contractAddress}/mint`,
      headers: { Authorization: `Bearer ${bobToken}` },
      payload: { recipient: '0xplayer', amount: '100' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /tokens/:address/history returns mint history', async () => {
    const { app, sessionToken } = await bootstrap(db);
    const deployRes = await app.inject({
      method: 'POST', url: '/tokens/deploy',
      headers: { Authorization: `Bearer ${sessionToken}` },
      payload: { name: 'Gold', symbol: 'GLD', initialSupply: '1000', recipientAddress: '0xrecip' },
    });
    const { contractAddress } = JSON.parse(deployRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/tokens/${contractAddress}/history`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });
});
