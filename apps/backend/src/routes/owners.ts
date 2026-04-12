import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateApiKey, hashApiKey, newId } from '../utils/crypto';

export async function ownerRoutes(app: FastifyInstance) {
  const ownerService = app.ownerService;
  const roleService = app.roleService;
  const auditService = app.auditService;
  const db = app.db;

  /** Returns platformId if the request is from an owner who owns it, or sends 401/403. */
  function requireOwnership(request: FastifyRequest, reply: FastifyReply): string | null {
    if (request.authType !== 'owner') {
      reply.status(401).send({ error: 'Owner token required' });
      return null;
    }
    const { platformId } = request.params as any;
    if (!ownerService.ownsPlatform(request.owner!.ownerId, platformId)) {
      reply.status(403).send({ error: 'You do not own this platform' });
      return null;
    }
    return platformId;
  }

  // ── Public routes ────────────────────────────────────────────────────

  app.post('/register', async (request, reply) => {
    const { username, password, email } = request.body as any;

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }
    if (typeof username !== 'string' || username.length < 3 || username.length > 64) {
      return reply.status(400).send({ error: 'Username must be 3-64 characters' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
      return reply.status(400).send({ error: 'Password must be 8-256 characters' });
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
    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

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

    const platforms = db.prepare(
      'SELECT p.id, p.name, p.created_at FROM platforms p JOIN owner_platforms op ON p.id = op.platform_id WHERE op.owner_id = ? AND p.deleted_at IS NULL'
    ).all(request.owner!.ownerId);

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

    const id = newId();
    const rawApiKey = generateApiKey();
    const apiKeyHash = hashApiKey(rawApiKey);
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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    db.transaction(() => {
      db.prepare('UPDATE platform_users SET deployed = -1 WHERE platform_id = ?').run(platformId);
      db.prepare('UPDATE blob_files SET deleted = 1 WHERE platform_id = ?').run(platformId);
      db.prepare('UPDATE schema_documents SET deleted = 1 WHERE platform_id = ?').run(platformId);
      // Nullify API key to prevent further auth against deleted platform
      db.prepare('UPDATE platforms SET deleted_at = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), platformId);
      db.prepare('DELETE FROM platform_settings WHERE platform_id = ?').run(platformId);
      db.prepare('DELETE FROM owner_platforms WHERE platform_id = ?').run(platformId);
    })();

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'platform:deleted',
      targetType: 'platform',
      targetId: platformId,
      ipAddress: request.ip,
    });

    return { success: true };
  });

  // ── User management routes ───────────────────────────────────────────

  app.get('/platforms/:platformId/users', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    const users = db.prepare(
      'SELECT id, platform_id, username, wallet_address, deployed, created_at FROM platform_users WHERE platform_id = ?'
    ).all(platformId) as any[];

    return users.map((u: any) => ({
      ...u,
      roles: roleService.getUserRoles(u.id),
    }));
  });

  app.post('/platforms/:platformId/users/:userId/roles', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { userId } = request.params as any;

    const { roleId } = request.body as any;
    if (!roleId) {
      return reply.status(400).send({ error: 'roleId is required' });
    }
    try {
      roleService.assignRole(userId, roleId, request.owner!.ownerId);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }

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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { userId, roleId } = request.params as any;

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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { userId } = request.params as any;

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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    return roleService.listRoles(platformId);
  });

  app.post('/platforms/:platformId/roles', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    const { name, permissions } = request.body as any;
    if (!name || !permissions) {
      return reply.status(400).send({ error: 'name and permissions are required' });
    }

    try {
      const role = roleService.createRole(platformId, name, permissions);
      auditService.log({
        actorType: 'owner',
        actorId: request.owner!.ownerId,
        platformId,
        action: 'role:created',
        targetType: 'role',
        targetId: role.id,
        ipAddress: request.ip,
      });
      return role;
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        return reply.status(409).send({ error: 'Role name already exists in this platform' });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  app.put('/platforms/:platformId/roles/:roleId', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { roleId } = request.params as any;

    const { permissions } = request.body as any;
    if (!permissions) {
      return reply.status(400).send({ error: 'permissions are required' });
    }

    try {
      // Verify role belongs to this platform
      const role = roleService.getRole(roleId);
      if (!role || role.platformId !== platformId) {
        return reply.status(404).send({ error: 'Role not found in this platform' });
      }
      roleService.updateRolePermissions(roleId, permissions);
      auditService.log({
        actorType: 'owner',
        actorId: request.owner!.ownerId,
        platformId,
        action: 'role:updated',
        targetType: 'role',
        targetId: roleId,
        ipAddress: request.ip,
      });
      return roleService.getRole(roleId);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.delete('/platforms/:platformId/roles/:roleId', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { roleId } = request.params as any;

    try {
      roleService.deleteRole(roleId);
      auditService.log({
        actorType: 'owner',
        actorId: request.owner!.ownerId,
        platformId,
        action: 'role:deleted',
        targetType: 'role',
        targetId: roleId,
        ipAddress: request.ip,
      });
      return { success: true };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // ── Settings ─────────────────────────────────────────────────────────

  app.put('/platforms/:platformId/settings', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    const { allowedOrigins, registrationEnabled } = request.body as any;
    const now = Math.floor(Date.now() / 1000);
    const originsJson = allowedOrigins ? JSON.stringify(allowedOrigins) : null;
    const regEnabled = registrationEnabled !== undefined ? (registrationEnabled ? 1 : 0) : null;

    db.prepare(`
      INSERT INTO platform_settings (platform_id, allowed_origins, registration_enabled, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(platform_id) DO UPDATE SET
        allowed_origins = COALESCE(?, allowed_origins),
        registration_enabled = COALESCE(?, registration_enabled),
        updated_at = ?
    `).run(
      platformId,
      originsJson,
      regEnabled ?? 1,
      now,
      originsJson,
      regEnabled,
      now,
    );

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'platform:settings_updated',
      ipAddress: request.ip,
    });

    return { success: true };
  });

  // ── API key rotation ─────────────────────────────────────────────────

  app.post('/platforms/:platformId/api-keys/rotate', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    const rawApiKey = generateApiKey();
    const apiKeyHash = hashApiKey(rawApiKey);

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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    const { name, maxFileSize, maxTotalSize, allowedMimeTypes } = request.body as any;
    if (!name) {
      return reply.status(400).send({ error: 'Registry name is required' });
    }

    const id = newId();
    const now = Math.floor(Date.now() / 1000);

    try {
      db.prepare(
        'INSERT INTO storage_registries (id, platform_id, name, max_file_size, max_total_size, current_total_size, allowed_mime_types, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
      ).run(id, platformId, name, maxFileSize ?? 0, maxTotalSize ?? 0, allowedMimeTypes ? JSON.stringify(allowedMimeTypes) : null, now);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        return reply.status(409).send({ error: 'Registry name already exists in this platform' });
      }
      throw err;
    }

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'registry:created',
      targetType: 'registry',
      targetId: id,
      ipAddress: request.ip,
    });

    return { id, name, platformId, maxFileSize: maxFileSize ?? 0, maxTotalSize: maxTotalSize ?? 0, allowedMimeTypes: allowedMimeTypes ?? null, createdAt: now };
  });

  app.get('/platforms/:platformId/registries', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;

    return db.prepare('SELECT * FROM storage_registries WHERE platform_id = ?').all(platformId);
  });

  app.put('/platforms/:platformId/registries/:registryId', async (request, reply) => {
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { registryId } = request.params as any;

    const existing = db.prepare('SELECT * FROM storage_registries WHERE id = ? AND platform_id = ?').get(registryId, platformId);
    if (!existing) {
      return reply.status(404).send({ error: 'Registry not found' });
    }

    const { maxFileSize, maxTotalSize, allowedMimeTypes } = request.body as any;

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
    const platformId = requireOwnership(request, reply);
    if (!platformId) return;
    const { registryId } = request.params as any;

    db.prepare('UPDATE blob_files SET deleted = 1 WHERE registry_id = ?').run(registryId);
    db.prepare('DELETE FROM storage_registries WHERE id = ? AND platform_id = ?').run(registryId, platformId);

    auditService.log({
      actorType: 'owner',
      actorId: request.owner!.ownerId,
      platformId,
      action: 'registry:deleted',
      targetType: 'registry',
      targetId: registryId,
      ipAddress: request.ip,
    });

    return { success: true };
  });
}
