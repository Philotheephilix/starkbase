import type Database from 'better-sqlite3';

/**
 * Run all v2 migrations: new tables for auth, RBAC, wallets, storage, audit,
 * plus column additions to existing tables.
 */
export function runMigrations(db: Database.Database): void {
  // ── New tables ────────────────────────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS owners (
      id              TEXT PRIMARY KEY,
      username        TEXT NOT NULL UNIQUE,
      email           TEXT UNIQUE,
      password_hash   TEXT NOT NULL,
      wallet_address  TEXT NOT NULL,
      token_version   INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_platforms (
      owner_id    TEXT NOT NULL REFERENCES owners(id),
      platform_id TEXT NOT NULL UNIQUE REFERENCES platforms(id),
      PRIMARY KEY (owner_id, platform_id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id          TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL REFERENCES platforms(id),
      name        TEXT NOT NULL,
      is_system   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      UNIQUE(platform_id, name)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id    TEXT NOT NULL REFERENCES roles(id),
      permission TEXT NOT NULL,
      PRIMARY KEY (role_id, permission)
    );

    CREATE TABLE IF NOT EXISTS platform_user_roles (
      user_id     TEXT NOT NULL REFERENCES platform_users(id),
      role_id     TEXT NOT NULL REFERENCES roles(id),
      assigned_by TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS external_wallets (
      id             TEXT PRIMARY KEY,
      owner_id       TEXT REFERENCES owners(id),
      user_id        TEXT REFERENCES platform_users(id),
      wallet_address TEXT NOT NULL,
      linked_at      INTEGER NOT NULL,
      CHECK ((owner_id IS NOT NULL AND user_id IS NULL) OR (owner_id IS NULL AND user_id IS NOT NULL))
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      platform_id          TEXT PRIMARY KEY REFERENCES platforms(id),
      allowed_origins      TEXT,
      registration_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at           INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storage_registries (
      id                 TEXT PRIMARY KEY,
      platform_id        TEXT NOT NULL REFERENCES platforms(id),
      name               TEXT NOT NULL,
      max_file_size      INTEGER NOT NULL DEFAULT 0,
      max_total_size     INTEGER NOT NULL DEFAULT 0,
      current_total_size INTEGER NOT NULL DEFAULT 0,
      allowed_mime_types TEXT,
      created_at         INTEGER NOT NULL,
      UNIQUE(platform_id, name)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      actor_type  TEXT NOT NULL,
      actor_id    TEXT NOT NULL,
      platform_id TEXT,
      action      TEXT NOT NULL,
      target_type TEXT,
      target_id   TEXT,
      metadata    TEXT,
      ip_address  TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_platform ON audit_logs(platform_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs(actor_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_platform_user_roles_user_id ON platform_user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_platform_user_roles_role_id ON platform_user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_owner_platforms_owner_id ON owner_platforms(owner_id);
    CREATE INDEX IF NOT EXISTS idx_roles_platform_id ON roles(platform_id);
  `);

  // ── Column additions to existing tables ───────────────────────────────

  const hasColumn = (table: string, column: string): boolean => {
    const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
    return cols.some((c) => c.name === column);
  };

  if (!hasColumn('platform_users', 'token_version')) {
    db.exec(`ALTER TABLE platform_users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0`);
  }

  if (!hasColumn('blob_files', 'registry_id')) {
    db.exec(`ALTER TABLE blob_files ADD COLUMN registry_id TEXT REFERENCES storage_registries(id)`);
  }
}
