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
    creator_wallet TEXT NOT NULL DEFAULT '',
    deployed_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS schemas (
    id               TEXT PRIMARY KEY,
    platform_id      TEXT NOT NULL,
    name             TEXT NOT NULL,
    fields           TEXT NOT NULL,
    onchain          INTEGER NOT NULL DEFAULT 0,
    onchain_tx_hash  TEXT,
    onchain_commitment TEXT,
    created_at       INTEGER DEFAULT (unixepoch()),
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

  CREATE TABLE IF NOT EXISTS blob_files (
    id               TEXT PRIMARY KEY,      -- UUID (user-facing id)
    platform_id      TEXT NOT NULL,
    blob_id          TEXT NOT NULL,         -- EigenDA cert hex
    commitment       TEXT NOT NULL,         -- SHA-256 of raw bytes
    filename         TEXT,                  -- original file name
    mime_type        TEXT,                  -- MIME content-type
    size             INTEGER NOT NULL,      -- bytes
    deleted          INTEGER NOT NULL DEFAULT 0,
    onchain          INTEGER NOT NULL DEFAULT 0,
    onchain_tx_hash  TEXT,
    uploaded_by      TEXT,                  -- wallet address of uploader
    created_at       INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY,
    platform_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    image_url       TEXT NOT NULL,
    max_supply      INTEGER NOT NULL DEFAULT 0,
    contract_address TEXT UNIQUE,
    tx_hash         TEXT,
    creator_wallet  TEXT NOT NULL,
    deployed_at     INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS event_mints (
    id         TEXT PRIMARY KEY,
    event_id   TEXT NOT NULL REFERENCES events(id),
    token_id   TEXT NOT NULL,
    recipient  TEXT NOT NULL,
    tx_hash    TEXT,
    minted_at  INTEGER DEFAULT (unixepoch())
  );

`;

// Migrations for columns added after initial deployment (SQLite ignores duplicate column errors).
const MIGRATIONS = [
  `ALTER TABLE schemas ADD COLUMN onchain INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE schemas ADD COLUMN onchain_tx_hash TEXT`,
  `ALTER TABLE schemas ADD COLUMN onchain_commitment TEXT`,
  `ALTER TABLE blob_files ADD COLUMN onchain INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE blob_files ADD COLUMN onchain_tx_hash TEXT`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, platform_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, image_url TEXT NOT NULL, max_supply INTEGER NOT NULL DEFAULT 0, contract_address TEXT UNIQUE, tx_hash TEXT, creator_wallet TEXT NOT NULL, deployed_at INTEGER DEFAULT (unixepoch()))`,
  `CREATE TABLE IF NOT EXISTS event_mints (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), token_id TEXT NOT NULL, recipient TEXT NOT NULL, tx_hash TEXT, minted_at INTEGER DEFAULT (unixepoch()))`,
  `ALTER TABLE deployed_tokens ADD COLUMN creator_wallet TEXT NOT NULL DEFAULT ''`,
];

export function createDb(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  for (const m of MIGRATIONS) {
    try { db.exec(m); } catch { /* column already exists */ }
  }
  return db;
}

// Singleton for production use
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) _db = createDb();
  return _db;
}
