import { describe, it, expect, vi } from 'vitest';
import { createPermissionMiddleware } from './permission';

function mockRequest(overrides: any = {}) {
  return { authType: undefined, owner: undefined, user: undefined, routeOptions: { config: {} }, ...overrides };
}
function mockReply() {
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => { reply.statusCode = code; return reply; });
  reply.send = vi.fn(() => reply);
  return reply;
}

describe('permissionMiddleware', () => {
  const getUserPermissions = vi.fn();
  const permissionMiddleware = createPermissionMiddleware(getUserPermissions);

  it('skips for owner requests on routes without permission config', async () => {
    const req = mockRequest({ authType: 'owner', routeOptions: { config: {} } });
    const reply = mockReply();
    await permissionMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rejects owner tokens on permission-gated user routes', async () => {
    const req = mockRequest({
      authType: 'owner',
      routeOptions: { config: { permission: 'schemas:read' } },
    });
    const reply = mockReply();
    await permissionMiddleware(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('passes when user has required permission', async () => {
    getUserPermissions.mockReturnValue(['schemas:read', 'docs:read']);
    const req = mockRequest({
      authType: 'user',
      user: { userId: 'u1' },
      routeOptions: { config: { permission: 'schemas:read' } },
    });
    const reply = mockReply();
    await permissionMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rejects when user lacks required permission', async () => {
    getUserPermissions.mockReturnValue(['schemas:read']);
    const req = mockRequest({
      authType: 'user',
      user: { userId: 'u1' },
      routeOptions: { config: { permission: 'schemas:write' } },
    });
    const reply = mockReply();
    await permissionMiddleware(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('skips when no permission is configured on route', async () => {
    const req = mockRequest({ authType: 'user', user: { userId: 'u1' }, routeOptions: { config: {} } });
    const reply = mockReply();
    await permissionMiddleware(req as any, reply);
    expect(reply.status).not.toHaveBeenCalled();
  });
});
