import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'starkbase.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES platforms(id),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    wallet_address TEXT,
    deployed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(platform_id, username)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES platform_users(id),
    session_token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS blobs (
    id TEXT PRIMARY KEY,
    data_hash TEXT NOT NULL,
    commitment TEXT NOT NULL,
    size INTEGER NOT NULL,
    content_type TEXT,
    uploader_wallet TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    uploaded_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS registry_entries (
    id TEXT PRIMARY KEY,
    platform_key TEXT NOT NULL,    -- felt252 hex derived from platform UUID
    commitment_key TEXT NOT NULL,  -- felt252 hex derived from EigenDA commitment
    platform_id TEXT NOT NULL,     -- original platform UUID
    commitment TEXT NOT NULL,      -- original SHA256 commitment hex
    wallet_address TEXT NOT NULL,
    tx_hash TEXT,                  -- Starknet transaction hash
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(platform_key, commitment_key)
  );

  CREATE TABLE IF NOT EXISTS deployed_nfts (
    id TEXT PRIMARY KEY,
    contract_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    base_uri TEXT NOT NULL,
    owner_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    deployed_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS deployed_tokens (
    id TEXT PRIMARY KEY,
    contract_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    initial_supply TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    deployed_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS schemas (
    id          TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    name        TEXT NOT NULL,
    fields      TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    UNIQUE(platform_id, name)
  );

  CREATE TABLE IF NOT EXISTS schema_documents (
    id          TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    doc_key     TEXT NOT NULL,
    blob_id     TEXT NOT NULL,
    commitment  TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    deleted     INTEGER NOT NULL DEFAULT 0,
    created_by  TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    UNIQUE(platform_id, schema_name, doc_key, version),
    FOREIGN KEY (platform_id, schema_name) REFERENCES schemas(platform_id, name)
  );

`;

export function createDb(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

// Singleton for production use
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) _db = createDb();
  return _db;
}
