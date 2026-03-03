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
  const platRes = await app.inject({ method: 'POST', url: '/platforms', payload: { name: 'TestGame' } });
  const { apiKey } = JSON.parse(platRes.body);
  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { apiKey, username: 'alice', password: 'secret' },
  });
  const { sessionToken, walletAddress } = JSON.parse(regRes.body);
  return { app, sessionToken, walletAddress, apiKey };
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
    const { app, sessionToken, walletAddress, apiKey } = await bootstrap(db);

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
