import { describe, it, expect, vi } from 'vitest';
import { createScopeMiddleware } from './scope';

function mockRequest(overrides: any = {}) {
  return { authType: undefined, owner: undefined, user: undefined, platformId: undefined, params: {}, ...overrides };
}
function mockReply() {
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => { reply.statusCode = code; return reply; });
  reply.send = vi.fn(() => reply);
  return reply;
}

// Mock db that returns a user row by default
function mockDb(userExists = true) {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(userExists ? { id: 'u1' } : undefined),
    }),
  } as any;
}

describe('scopeMiddleware', () => {
  const ownsPlatform = vi.fn();

  it('skips for public routes (no authType)', async () => {
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb());
    const req = mockRequest();
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('passes when owner owns the platform', async () => {
    ownsPlatform.mockReturnValue(true);
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb());
    const req = mockRequest({ authType: 'owner', owner: { ownerId: 'o1' }, params: { platformId: 'p1' } });
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(req.platformId).toBe('p1');
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rejects when owner does not own the platform', async () => {
    ownsPlatform.mockReturnValue(false);
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb());
    const req = mockRequest({ authType: 'owner', owner: { ownerId: 'o1' }, params: { platformId: 'p1' } });
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('passes for owner routes without platformId param', async () => {
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb());
    const req = mockRequest({ authType: 'owner', owner: { ownerId: 'o1' }, params: {} });
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('passes when user exists and is active', async () => {
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb(true));
    const req = mockRequest({ authType: 'user', user: { userId: 'u1', platformId: 'p1' }, platformId: 'p1' });
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rejects when user is soft-deleted', async () => {
    const scopeMiddleware = createScopeMiddleware(ownsPlatform, mockDb(false));
    const req = mockRequest({ authType: 'user', user: { userId: 'u1', platformId: 'p1' }, platformId: 'p1' });
    const reply = mockReply();
    await scopeMiddleware(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});
