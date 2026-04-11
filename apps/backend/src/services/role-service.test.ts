import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../db/index';
import { RoleService } from './role-service';
import { ADMIN_PERMISSIONS, MEMBER_PERMISSIONS } from '../constants/permissions';
import type Database from 'better-sqlite3';

let db: Database.Database;
let svc: RoleService;

const NOW = Date.now();

beforeEach(() => {
  db = createDb(':memory:');
  svc = new RoleService(db);

  // Insert test platform
  db.prepare(
    "INSERT INTO platforms (id, name, api_key, creator_wallet, created_at) VALUES (?, ?, ?, '', ?)",
  ).run('p1', 'test', 'sb_key1', NOW);
});

afterEach(() => {
  db.close();
});

function insertUser(id: string, platformId: string, username: string) {
  db.prepare(
    "INSERT INTO platform_users (id, platform_id, username, password_hash, wallet_address, deployed, created_at) VALUES (?, ?, ?, 'hash', '0x1', 0, ?)",
  ).run(id, platformId, username, NOW);
}

describe('RoleService', () => {
  // 1. initSystemRoles creates admin and member with correct permissions
  it('initSystemRoles creates admin and member with correct permissions', () => {
    svc.initSystemRoles('p1');
    const roles = svc.listRoles('p1');
    expect(roles).toHaveLength(2);

    const admin = roles.find((r) => r.name === 'admin')!;
    const member = roles.find((r) => r.name === 'member')!;

    expect(admin.isSystem).toBe(true);
    expect(member.isSystem).toBe(true);
    expect(admin.permissions.sort()).toEqual([...ADMIN_PERMISSIONS].sort());
    expect(member.permissions.sort()).toEqual([...MEMBER_PERMISSIONS].sort());
  });

  // 2. initSystemRoles is idempotent
  it('initSystemRoles is idempotent — calling twice does not duplicate', () => {
    svc.initSystemRoles('p1');
    svc.initSystemRoles('p1');
    const roles = svc.listRoles('p1');
    expect(roles).toHaveLength(2);
  });

  // 3. createRole creates custom role with specified permissions
  it('createRole creates custom role with specified permissions', () => {
    const role = svc.createRole('p1', 'editor', ['schemas:read', 'schemas:write']);
    expect(role.name).toBe('editor');
    expect(role.isSystem).toBe(false);
    expect(role.permissions).toEqual(['schemas:read', 'schemas:write']);

    const fetched = svc.getRole(role.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.permissions).toEqual(['schemas:read', 'schemas:write']);
  });

  // 4. createRole rejects invalid permission strings
  it('createRole rejects invalid permission strings', () => {
    expect(() => svc.createRole('p1', 'bad', ['not:a:permission'])).toThrow(
      'Invalid permission',
    );
  });

  // 5. createRole rejects duplicate name in same platform
  it('createRole rejects duplicate name in same platform', () => {
    svc.createRole('p1', 'editor', ['schemas:read']);
    expect(() => svc.createRole('p1', 'editor', ['schemas:write'])).toThrow();
  });

  // 6. updateRolePermissions replaces permissions
  it('updateRolePermissions replaces permissions on a custom role', () => {
    const role = svc.createRole('p1', 'editor', ['schemas:read']);
    svc.updateRolePermissions(role.id, ['docs:read', 'docs:write']);

    const updated = svc.getRole(role.id)!;
    expect(updated.permissions.sort()).toEqual(['docs:read', 'docs:write'].sort());
  });

  // 7. deleteRole deletes a custom role
  it('deleteRole deletes a custom role', () => {
    const role = svc.createRole('p1', 'temp', ['schemas:read']);
    svc.deleteRole(role.id);
    expect(svc.getRole(role.id)).toBeNull();
  });

  // 8. deleteRole refuses to delete a system role
  it('deleteRole refuses to delete a system role', () => {
    svc.initSystemRoles('p1');
    const admin = svc.listRoles('p1').find((r) => r.name === 'admin')!;
    expect(() => svc.deleteRole(admin.id)).toThrow('Cannot delete system role');
  });

  // 9. assignRole + getUserPermissions resolves permissions correctly
  it('assignRole + getUserPermissions resolves permissions correctly', () => {
    insertUser('u1', 'p1', 'user1');
    const role = svc.createRole('p1', 'editor', ['schemas:read', 'schemas:write']);
    svc.assignRole('u1', role.id, 'admin');

    const perms = svc.getUserPermissions('u1');
    expect(perms.sort()).toEqual(['schemas:read', 'schemas:write'].sort());
  });

  // 10. assignRole + getUserPermissions unions permissions from multiple roles
  it('assignRole + getUserPermissions unions permissions from multiple roles', () => {
    insertUser('u1', 'p1', 'user1');
    const r1 = svc.createRole('p1', 'editor', ['schemas:read', 'schemas:write']);
    const r2 = svc.createRole('p1', 'uploader', ['blobs:read', 'schemas:read']); // overlap
    svc.assignRole('u1', r1.id, 'admin');
    svc.assignRole('u1', r2.id, 'admin');

    const perms = svc.getUserPermissions('u1');
    expect(perms.sort()).toEqual(
      ['schemas:read', 'schemas:write', 'blobs:read'].sort(),
    );
  });

  // 11. removeRole removes role assignment, user loses those permissions
  it('removeRole removes role assignment and user loses those permissions', () => {
    insertUser('u1', 'p1', 'user1');
    const role = svc.createRole('p1', 'editor', ['schemas:read', 'schemas:write']);
    svc.assignRole('u1', role.id, 'admin');
    expect(svc.getUserPermissions('u1')).toHaveLength(2);

    svc.removeRole('u1', role.id);
    expect(svc.getUserPermissions('u1')).toHaveLength(0);
  });
});
