import crypto from 'crypto';
import axios from 'axios';
import type Database from 'better-sqlite3';
import type { BlobFile } from '@starkbase/types';

const EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_URL ?? 'http://127.0.0.1:3100';

type BlobFileRow = {
  id: string;
  platform_id: string;
  blob_id: string;
  commitment: string;
  filename: string | null;
  mime_type: string | null;
  size: number;
  deleted: number;
  uploaded_by: string | null;
  created_at: number;
};

function rowToRecord(row: BlobFileRow): BlobFile {
  return {
    id: row.id,
    platformId: row.platform_id,
    blobId: row.blob_id,
    commitment: row.commitment,
    filename: row.filename ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: row.size,
    deleted: row.deleted === 1,
    uploadedBy: row.uploaded_by ?? undefined,
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

export class BlobFileService {
  constructor(private db: Database.Database) {}

  async upload(
    buffer: Buffer,
    platformId: string,
    uploadedBy: string,
    filename?: string,
    mimeType?: string
  ): Promise<BlobFile> {
    const commitment = crypto.createHash('sha256').update(buffer).digest('hex');

    const res = await axios.post(
      `${EIGENDA_PROXY_URL}/put?commitment_mode=standard`,
      buffer,
      { responseType: 'arraybuffer', headers: { 'Content-Type': 'application/octet-stream' } }
    );
    const blobId = Buffer.from(res.data as ArrayBuffer).toString('hex');

    const id = crypto.randomUUID();
    this.db
      .prepare(
        `INSERT INTO blob_files (id, platform_id, blob_id, commitment, filename, mime_type, size, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, platformId, blobId, commitment, filename ?? null, mimeType ?? null, buffer.length, uploadedBy);

    return rowToRecord(
      this.db.prepare('SELECT * FROM blob_files WHERE id = ?').get(id) as BlobFileRow
    );
  }

  list(platformId: string): BlobFile[] {
    const rows = this.db
      .prepare('SELECT * FROM blob_files WHERE platform_id = ? AND deleted = 0 ORDER BY created_at DESC')
      .all(platformId) as BlobFileRow[];
    return rows.map(rowToRecord);
  }

  getMetadata(id: string, platformId: string): BlobFile {
    const row = this.db
      .prepare('SELECT * FROM blob_files WHERE id = ? AND platform_id = ?')
      .get(id, platformId) as BlobFileRow | undefined;
    if (!row || row.deleted) {
      throw Object.assign(new Error(`Blob '${id}' not found`), { statusCode: 404 });
    }
    return rowToRecord(row);
  }

  async get(id: string, platformId: string): Promise<{ record: BlobFile; data: Buffer }> {
    const record = this.getMetadata(id, platformId);
    const res = await axios.get(
      `${EIGENDA_PROXY_URL}/get/${record.blobId}?commitment_mode=standard`,
      { responseType: 'arraybuffer' }
    );
    return { record, data: Buffer.from(res.data as ArrayBuffer) };
  }

  delete(id: string, platformId: string): void {
    const row = this.db
      .prepare('SELECT * FROM blob_files WHERE id = ? AND platform_id = ?')
      .get(id, platformId) as BlobFileRow | undefined;
    if (!row || row.deleted) {
      throw Object.assign(new Error(`Blob '${id}' not found`), { statusCode: 404 });
    }
    this.db
      .prepare('UPDATE blob_files SET deleted = 1 WHERE id = ? AND platform_id = ?')
      .run(id, platformId);
  }
}
