import type { FastifyInstance } from 'fastify';
import { randomUUID, createHash } from 'crypto';

export async function ownerRoutes(app: FastifyInstance) {
  const ownerService = (app as any).ownerService;
  const roleService = (app as any).roleService;
  const auditService = (app as any).auditService;
  const db = (app as any).db;

  // ── Public routes ────────────────────────────────────────────────────

  app.post('/register', async (request, reply) => {
    const { username, password, email } = request.body as any;

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    try {
      const result = await ownerService.register({ username, password, email });
      auditService.log({
        actorType: 'owner',
        actorId: result.ownerId,
        action: 'owner:registered',
      });
      return result;
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        return reply.status(409).send({ error: 'Username already exists' });
      }
      throw err;
    }
  });

  app.post('/login', async (request, reply) => {
    const { username, password } = request.body as any;

    try {
      const result = await ownerService.login({ username, password });
      auditService.log({
        actorType: 'owner',
        actorId: result.ownerId,
        action: 'owner:login',
      });
      return result;
    } catch (err: any) {
      auditService.log({
        actorType: 'owner',
        actorId: username ?? 'unknown',
        action: 'owner:login_failed',
      });
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

  // ── Authenticated owner routes ───────────────────────────────────────

  app.get('/me', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    return ownerService.getById(request.owner!.ownerId);
  });

  app.get('/platforms', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }

    const platformIds = ownerService.getOwnedPlatformIds(request.owner!.ownerId);
    const platforms = platformIds.map((id: string) => {
      return db.prepare('SELECT id, name, created_at FROM platforms WHERE id = ?').get(id);
    }).filter(Boolean);

    return platforms;
  });

  app.post('/platforms', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }

    const { name } = request.body as any;
    if (!name) {
      return reply.status(400).send({ error: 'Platform name is required' });
    }

    const id = randomUUID();
    const rawApiKey = `sb_${randomUUID().replace(/-/g, '')}`;
    const apiKeyHash = createHash('sha256').update(rawApiKey).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    const ownerId = request.owner!.ownerId;

    db.prepare(
      'INSERT INTO platforms (id, name, api_key, creator_wallet, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, apiKeyHash, request.owner!.walletAddress, now);

    db.prepare(
      'INSERT INTO owner_platforms (owner_id, platform_id) VALUES (?, ?)'
    ).run(ownerId, id);

    db.prepare(
      'INSERT INTO platform_settings (platform_id, allowed_origins, registration_enabled, updated_at) VALUES (?, NULL, 1, ?)'
    ).run(id, now);

    roleService.initSystemRoles(id);

    auditService.log({
      actorType: 'owner',
      actorId: ownerId,
      platformId: id,
      action: 'platform:created',
      targetType: 'platform',
      targetId: id,
    });

    return { id, name, apiKey: rawApiKey, createdAt: now };
  });

  app.delete('/platforms/:platformId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    db.prepare('UPDATE platform_users SET deployed = -1 WHERE platform_id = ?').run(platformId);
    db.prepare('UPDATE blob_files SET deleted = 1 WHERE platform_id = ?').run(platformId);
    db.prepare('UPDATE schema_documents SET deleted = 1 WHERE platform_id = ?').run(platformId);
    db.prepare('DELETE FROM owner_platforms WHERE platform_id = ?').run(platformId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'platform:deleted',
      targetType: 'platform',
      targetId: platformId,
    });

    return { success: true };
  });

  // ── User management routes ───────────────────────────────────────────

  app.get('/platforms/:platformId/users', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const users = db.prepare(
      'SELECT id, platform_id, username, wallet_address, deployed, created_at FROM platform_users WHERE platform_id = ?'
    ).all(platformId) as any[];

    return users.map((u: any) => ({
      ...u,
      roles: roleService.getUserRoles(u.id),
    }));
  });

  app.post('/platforms/:platformId/users/:userId/roles', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, userId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { roleId } = request.body as any;
    roleService.assignRole(userId, roleId, request.owner!.ownerId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'role:assigned',
      targetType: 'user',
      targetId: userId,
      metadata: { roleId },
    });

    return { success: true };
  });

  app.delete('/platforms/:platformId/users/:userId/roles/:roleId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, userId, roleId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    roleService.removeRole(userId, roleId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'role:removed',
      targetType: 'user',
      targetId: userId,
      metadata: { roleId },
    });

    return { success: true };
  });

  app.delete('/platforms/:platformId/users/:userId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, userId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    // Remove all role assignments
    const userRoles = roleService.getUserRoles(userId);
    for (const role of userRoles) {
      roleService.removeRole(userId, role.id);
    }

    // Soft-delete user
    db.prepare('UPDATE platform_users SET deployed = -1 WHERE id = ? AND platform_id = ?').run(userId, platformId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'user:removed',
      targetType: 'user',
      targetId: userId,
    });

    return { success: true };
  });

  // ── Role management routes ───────────────────────────────────────────

  app.get('/platforms/:platformId/roles', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    return roleService.listRoles(platformId);
  });

  app.post('/platforms/:platformId/roles', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { name, permissions } = request.body as any;
    const role = roleService.createRole(platformId, name, permissions);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'role:created',
      targetType: 'role',
      targetId: role.id,
    });

    return role;
  });

  app.put('/platforms/:platformId/roles/:roleId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, roleId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { permissions } = request.body as any;
    roleService.updateRolePermissions(roleId, permissions);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'role:updated',
      targetType: 'role',
      targetId: roleId,
    });

    return roleService.getRole(roleId);
  });

  app.delete('/platforms/:platformId/roles/:roleId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, roleId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    roleService.deleteRole(roleId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'role:deleted',
      targetType: 'role',
      targetId: roleId,
    });

    return { success: true };
  });

  // ── Settings ─────────────────────────────────────────────────────────

  app.put('/platforms/:platformId/settings', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { allowedOrigins, registrationEnabled } = request.body as any;
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO platform_settings (platform_id, allowed_origins, registration_enabled, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(platform_id) DO UPDATE SET
        allowed_origins = COALESCE(?, allowed_origins),
        registration_enabled = COALESCE(?, registration_enabled),
        updated_at = ?
    `).run(
      platformId,
      allowedOrigins ?? null,
      registrationEnabled ?? 1,
      now,
      allowedOrigins ?? null,
      registrationEnabled ?? null,
      now,
    );

    return { success: true };
  });

  // ── API key rotation ─────────────────────────────────────────────────

  app.post('/platforms/:platformId/api-keys/rotate', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const rawApiKey = `sb_${randomUUID().replace(/-/g, '')}`;
    const apiKeyHash = createHash('sha256').update(rawApiKey).digest('hex');

    db.prepare('UPDATE platforms SET api_key = ? WHERE id = ?').run(apiKeyHash, platformId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'api_key:rotated',
      targetType: 'platform',
      targetId: platformId,
    });

    return { apiKey: rawApiKey };
  });

  // ── Storage registry management ──────────────────────────────────────

  app.post('/platforms/:platformId/registries', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { name, maxFileSize, maxTotalSize, allowedMimeTypes } = request.body as any;
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(
      'INSERT INTO storage_registries (id, platform_id, name, max_file_size, max_total_size, current_total_size, allowed_mime_types, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
    ).run(id, platformId, name, maxFileSize ?? 0, maxTotalSize ?? 0, allowedMimeTypes ? JSON.stringify(allowedMimeTypes) : null, now);

    return { id, name, platformId, maxFileSize: maxFileSize ?? 0, maxTotalSize: maxTotalSize ?? 0, allowedMimeTypes: allowedMimeTypes ?? null, createdAt: now };
  });

  app.get('/platforms/:platformId/registries', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    return db.prepare('SELECT * FROM storage_registries WHERE platform_id = ?').all(platformId);
  });

  app.put('/platforms/:platformId/registries/:registryId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, registryId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    const { maxFileSize, maxTotalSize, allowedMimeTypes } = request.body as any;
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      UPDATE storage_registries SET
        max_file_size = COALESCE(?, max_file_size),
        max_total_size = COALESCE(?, max_total_size),
        allowed_mime_types = COALESCE(?, allowed_mime_types)
      WHERE id = ? AND platform_id = ?
    `).run(
      maxFileSize ?? null,
      maxTotalSize ?? null,
      allowedMimeTypes ? JSON.stringify(allowedMimeTypes) : null,
      registryId,
      platformId,
    );

    return db.prepare('SELECT * FROM storage_registries WHERE id = ?').get(registryId);
  });

  app.delete('/platforms/:platformId/registries/:registryId', async (request, reply) => {
    if (request.authType !== 'owner') {
      return reply.status(401).send({ error: 'Owner token required' });
    }
    const { platformId, registryId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      return reply.status(403).send({ error: 'You do not own this platform' });
    }

    db.prepare('UPDATE blob_files SET deleted = 1 WHERE registry_id = ?').run(registryId);
    db.prepare('DELETE FROM storage_registries WHERE id = ? AND platform_id = ?').run(registryId, platformId);

    return { success: true };
  });
}
