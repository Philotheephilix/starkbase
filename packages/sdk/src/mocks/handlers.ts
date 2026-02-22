import { http, HttpResponse } from 'msw';

const BASE = 'https://api.starkbase.dev';

export const handlers = [
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: 'ok' })),

  http.post(`${BASE}/auth/initiate`, () =>
    HttpResponse.json({ authUrl: 'https://accounts.google.com/oauth?state=abc', state: 'abc' })
  ),

  http.post(`${BASE}/auth/deploy`, () =>
    HttpResponse.json({
      accountAddress: '0xdeadbeef',
      sessionToken: 'mock_token_123',
      transactionHash: '0xabc',
    })
  ),

  http.get(`${BASE}/auth/session`, () =>
    HttpResponse.json({ accountAddress: '0xdeadbeef', provider: 'google', expiresAt: 9999999 })
  ),

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
