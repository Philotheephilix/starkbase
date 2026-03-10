import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface Platform {
  id: string;
  name: string;
  apiKey: string;
  creatorWallet: string;
  createdAt: number;
}

interface PlatformRow {
  id: string;
  name: string;
  api_key: string;
  creator_wallet: string;
  created_at: number;
}

export class PlatformService {
  constructor(private db: Database.Database) {}

  createPlatform(name: string, creatorWallet: string = ''): Platform {
    const id = crypto.randomUUID();
    const apiKey = `sb_${crypto.randomBytes(24).toString('hex')}`;
    const createdAt = Math.floor(Date.now() / 1000);
    this.db
      .prepare('INSERT INTO platforms (id, name, api_key, creator_wallet, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, apiKey, creatorWallet, createdAt);
    return { id, name, apiKey, creatorWallet, createdAt };
  }

  listByWallet(walletAddress: string): Platform[] {
    const rows = this.db
      .prepare('SELECT * FROM platforms WHERE creator_wallet = ? ORDER BY created_at DESC')
      .all(walletAddress) as PlatformRow[];
    return rows.map(row => this.toModel(row));
  }

  listAll(): Platform[] {
    const rows = this.db
      .prepare('SELECT * FROM platforms ORDER BY created_at DESC')
      .all() as PlatformRow[];
    return rows.map(row => this.toModel(row));
  }

  getById(id: string): Platform | null {
    const row = this.db
      .prepare('SELECT * FROM platforms WHERE id = ?')
      .get(id) as PlatformRow | undefined;
    return row ? this.toModel(row) : null;
  }

  getByApiKey(apiKey: string): Platform | null {
    const row = this.db
      .prepare('SELECT * FROM platforms WHERE api_key = ?')
      .get(apiKey) as PlatformRow | undefined;
    return row ? this.toModel(row) : null;
  }

  private toModel(row: PlatformRow): Platform {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.api_key,
      creatorWallet: row.creator_wallet,
      createdAt: row.created_at,
    };
  }
}
