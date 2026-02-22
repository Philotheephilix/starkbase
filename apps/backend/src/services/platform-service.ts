import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface Platform {
  id: string;
  name: string;
  apiKey: string;
  createdAt: number;
}

interface PlatformRow {
  id: string;
  name: string;
  api_key: string;
  created_at: number;
}

export class PlatformService {
  constructor(private db: Database.Database) {}

  createPlatform(name: string): Platform {
    const id = crypto.randomUUID();
    const apiKey = `sb_${crypto.randomBytes(24).toString('hex')}`;
    const createdAt = Math.floor(Date.now() / 1000);
    this.db
      .prepare('INSERT INTO platforms (id, name, api_key, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, apiKey, createdAt);
    return { id, name, apiKey, createdAt };
  }

  getByApiKey(apiKey: string): Platform | null {
    const row = this.db
      .prepare('SELECT * FROM platforms WHERE api_key = ?')
      .get(apiKey) as PlatformRow | undefined;
    if (!row) return null;
    return { id: row.id, name: row.name, apiKey: row.api_key, createdAt: row.created_at };
  }
}
