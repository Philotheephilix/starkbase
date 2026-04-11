import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

interface LogEntry {
  actorType: 'owner' | 'user';
  actorId: string;
  platformId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export interface AuditLogRow {
  id: string;
  actorType: string;
  actorId: string;
  platformId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: number;
}

export class AuditService {
  private db: Database.Database;
  constructor(db: Database.Database) { this.db = db; }

  log(entry: LogEntry): void {
    this.db.prepare(`
      INSERT INTO audit_logs (id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), entry.actorType, entry.actorId, entry.platformId ?? null,
      entry.action, entry.targetType ?? null, entry.targetId ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ipAddress ?? null, Date.now(),
    );
  }

  getByPlatform(platformId: string): AuditLogRow[] {
    const rows = this.db.prepare(
      "SELECT id, actor_type, actor_id, platform_id, action, target_type, target_id, metadata, ip_address, created_at FROM audit_logs WHERE platform_id = ? ORDER BY created_at DESC"
    ).all(platformId) as any[];
    return rows.map(r => ({
      id: r.id, actorType: r.actor_type, actorId: r.actor_id, platformId: r.platform_id,
      action: r.action, targetType: r.target_type, targetId: r.target_id,
      metadata: r.metadata, ipAddress: r.ip_address, createdAt: r.created_at,
    }));
  }
}
