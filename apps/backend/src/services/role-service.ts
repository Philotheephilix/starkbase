import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  MEMBER_PERMISSIONS,
  type Permission,
} from '../constants/permissions';

export interface RoleRow {
  id: string;
  platformId: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: number;
}

export class RoleService {
  private db: Database.Database;
  constructor(db: Database.Database) {
    this.db = db;
  }

  /** Create admin + member system roles with default permissions. Idempotent. */
  initSystemRoles(platformId: string): void {
    const existing = this.db
      .prepare('SELECT COUNT(*) as cnt FROM roles WHERE platform_id = ? AND is_system = 1')
      .get(platformId) as any;
    if (existing && existing.cnt >= 2) return;

    this.db.transaction(() => {
      const insertRole = this.db.prepare(
        'INSERT OR IGNORE INTO roles (id, platform_id, name, is_system, created_at) VALUES (?, ?, ?, 1, ?)',
      );
      const insertPerm = this.db.prepare(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)',
      );

      const now = Date.now();

      // Check if admin exists
      const adminExists = this.db.prepare("SELECT id FROM roles WHERE platform_id = ? AND name = 'admin' AND is_system = 1").get(platformId) as any;
      if (!adminExists) {
        const adminId = randomUUID();
        insertRole.run(adminId, platformId, 'admin', now);
        for (const p of ADMIN_PERMISSIONS) {
          insertPerm.run(adminId, p);
        }
      }

      // Check if member exists
      const memberExists = this.db.prepare("SELECT id FROM roles WHERE platform_id = ? AND name = 'member' AND is_system = 1").get(platformId) as any;
      if (!memberExists) {
        const memberId = randomUUID();
        insertRole.run(memberId, platformId, 'member', now);
        for (const p of MEMBER_PERMISSIONS) {
          insertPerm.run(memberId, p);
        }
      }
    })();
  }

  /** Create a custom (non-system) role. */
  createRole(platformId: string, name: string, permissions: string[]): RoleRow {
    this.validatePermissions(permissions);

    const id = randomUUID();
    const now = Date.now();

    this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO roles (id, platform_id, name, is_system, created_at) VALUES (?, ?, ?, 0, ?)',
        )
        .run(id, platformId, name, now);

      const insertPerm = this.db.prepare(
        'INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)',
      );
      for (const p of permissions) {
        insertPerm.run(id, p);
      }
    })();

    return {
      id,
      platformId,
      name,
      isSystem: false,
      permissions: permissions as Permission[],
      createdAt: now,
    };
  }

  /** List all roles for a platform, each with their permissions. */
  listRoles(platformId: string): RoleRow[] {
    const roles = this.db
      .prepare('SELECT id, platform_id, name, is_system, created_at FROM roles WHERE platform_id = ?')
      .all(platformId) as any[];

    return roles.map((r) => this.hydrateRole(r));
  }

  /** Get a single role by id, or null. */
  getRole(roleId: string): RoleRow | null {
    const r = this.db
      .prepare('SELECT id, platform_id, name, is_system, created_at FROM roles WHERE id = ?')
      .get(roleId) as any | undefined;
    if (!r) return null;
    return this.hydrateRole(r);
  }

  /** Replace all permissions for a role. */
  updateRolePermissions(roleId: string, permissions: string[]): void {
    this.validatePermissions(permissions);

    this.db.transaction(() => {
      this.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
      const insert = this.db.prepare(
        'INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)',
      );
      for (const p of permissions) {
        insert.run(roleId, p);
      }
    })();
  }

  /** Delete a custom role and all associated data. Throws on system roles. */
  deleteRole(roleId: string): void {
    const role = this.db
      .prepare('SELECT is_system FROM roles WHERE id = ?')
      .get(roleId) as any | undefined;
    if (!role) throw new Error('Role not found');
    if (role.is_system === 1) {
      throw new Error('Cannot delete system role');
    }

    this.db.transaction(() => {
      this.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
      this.db.prepare('DELETE FROM platform_user_roles WHERE role_id = ?').run(roleId);
      this.db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
    })();
  }

  /** Assign a role to a user. Validates role and user belong to the same platform. */
  assignRole(userId: string, roleId: string, assignedBy: string): void {
    // Verify role and user belong to the same platform
    const role = this.db.prepare('SELECT platform_id FROM roles WHERE id = ?').get(roleId) as any;
    if (!role) throw new Error('Role not found');
    const user = this.db.prepare('SELECT platform_id FROM platform_users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('User not found');
    if (role.platform_id !== user.platform_id) {
      throw new Error('Role and user must belong to the same platform');
    }

    this.db
      .prepare(
        'INSERT OR IGNORE INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?)',
      )
      .run(userId, roleId, assignedBy, Date.now());
  }

  /** Remove a role assignment from a user. */
  removeRole(userId: string, roleId: string): void {
    this.db
      .prepare('DELETE FROM platform_user_roles WHERE user_id = ? AND role_id = ?')
      .run(userId, roleId);
  }

  /** Get the union of all permissions from all roles assigned to a user. */
  getUserPermissions(userId: string): Permission[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT rp.permission
         FROM platform_user_roles pur
         JOIN role_permissions rp ON rp.role_id = pur.role_id
         WHERE pur.user_id = ?`,
      )
      .all(userId) as Array<{ permission: string }>;

    return rows.map((r) => r.permission as Permission);
  }

  /** Get all roles assigned to a user, each with permissions. */
  getUserRoles(userId: string): RoleRow[] {
    const roles = this.db
      .prepare(
        `SELECT r.id, r.platform_id, r.name, r.is_system, r.created_at
         FROM platform_user_roles pur
         JOIN roles r ON r.id = pur.role_id
         WHERE pur.user_id = ?`,
      )
      .all(userId) as any[];

    return roles.map((r) => this.hydrateRole(r));
  }

  // ── private helpers ──────────────────────────────────────────────────

  private validatePermissions(permissions: string[]): void {
    for (const p of permissions) {
      if (!ALL_PERMISSIONS.includes(p as Permission)) {
        throw new Error('Invalid permission');
      }
    }
  }

  private hydrateRole(row: any): RoleRow {
    const perms = this.db
      .prepare('SELECT permission FROM role_permissions WHERE role_id = ?')
      .all(row.id) as Array<{ permission: string }>;

    return {
      id: row.id,
      platformId: row.platform_id,
      name: row.name,
      isSystem: row.is_system === 1,
      permissions: perms.map((p) => p.permission as Permission),
      createdAt: row.created_at,
    };
  }
}
