import { http, HttpResponse } from 'msw';

const BASE = 'https://api.starkbase.dev';

export const handlers = [
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: 'ok' })),

  // Auth
  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json({
      walletAddress: '0xdeadbeef',
      sessionToken: 'mock_token_123',
      username: 'alice',
      platformId: 'platform_1',
    })
  ),

  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      walletAddress: '0xdeadbeef',
      sessionToken: 'mock_token_456',
      username: 'alice',
      platformId: 'platform_1',
    })
  ),

  http.get(`${BASE}/auth/me`, () =>
    HttpResponse.json({
      userId: 'user-uuid',
      username: 'alice',
      platformId: 'platform_1',
      walletAddress: '0xdeadbeef',
    })
  ),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({ success: true })),

  http.post(`${BASE}/contracts/deploy`, () =>
    HttpResponse.json({
      contractAddress: '0xcontract123',
      transactionHash: '0xtx123',
      schema: {
        name: 'Test',
        version: '1.0.0',
        fields: [],
        storage: { mode: 'onchain', commitment: 'keccak256' },
        permissions: { create: ['owner'], read: ['public'], update: ['owner'], delete: ['owner'] },
      },
    })
  ),

  http.post(`${BASE}/storage/upload`, () =>
    HttpResponse.json({
      blobId: 'blob-123',
      commitment: '0xcommit',
      dataHash: '0xhash',
      size: 11,
    })
  ),

  http.post(`${BASE}/nfts/collections`, () =>
    HttpResponse.json({
      contractAddress: '0xnft123',
      name: 'Test Collection',
      symbol: 'TEST',
      platformId: 'platform_1',
      transactionHash: '0xtx456',
    })
  ),

  http.post(`${BASE}/tokens/create`, () =>
    HttpResponse.json({
      contractAddress: '0xtoken123',
      name: 'Test Token',
      symbol: 'TST',
      initialSupply: '1000000',
      platformId: 'platform_1',
      transactionHash: '0xtx789',
    })
  ),
];
