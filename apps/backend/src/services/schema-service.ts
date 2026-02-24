import crypto from 'crypto';
import axios from 'axios';
import type Database from 'better-sqlite3';

const EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_URL ?? 'http://127.0.0.1:3100';

export interface SchemaFieldDef {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
}

export interface SchemaRecord {
  id: string;
  platformId: string;
  name: string;
  fields: Record<string, SchemaFieldDef>;
  createdAt: string;
}

export interface DocumentRecord {
  key: string;
  blobId: string;
  commitment: string;
  version: number;
  createdBy: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface DocumentVersion {
  blobId: string;
  commitment: string;
  version: number;
  deleted: boolean;
  createdBy: string;
  createdAt: string;
}

type SchemaRow = {
  id: string;
  platform_id: string;
  name: string;
  fields: string;
  created_at: number;
};

type DocumentRow = {
  id: string;
  platform_id: string;
  schema_name: string;
  doc_key: string;
  blob_id: string;
  commitment: string;
  version: number;
  deleted: number;
  created_by: string;
  created_at: number;
};

export class SchemaService {
  constructor(private db: Database.Database) {}

  createSchema(
    platformId: string,
    name: string,
    fields: Record<string, SchemaFieldDef>
  ): SchemaRecord {
    const id = crypto.randomUUID();
    try {
      this.db
        .prepare('INSERT INTO schemas (id, platform_id, name, fields) VALUES (?, ?, ?, ?)')
        .run(id, platformId, name, JSON.stringify(fields));
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw Object.assign(new Error(`Schema '${name}' already exists`), { statusCode: 409 });
      }
      throw err;
    }
    return { id, platformId, name, fields, createdAt: new Date().toISOString() };
  }

  getSchema(platformId: string, name: string): SchemaRecord {
    const row = this.db
      .prepare('SELECT * FROM schemas WHERE platform_id = ? AND name = ?')
      .get(platformId, name) as SchemaRow | undefined;
    if (!row) {
      throw Object.assign(new Error(`Schema '${name}' not found`), { statusCode: 404 });
    }
    return {
      id: row.id,
      platformId: row.platform_id,
      name: row.name,
      fields: JSON.parse(row.fields),
      createdAt: new Date(row.created_at * 1000).toISOString(),
    };
  }

  validateDocument(
    fields: Record<string, SchemaFieldDef>,
    data: Record<string, unknown>
  ): void {
    for (const [key, def] of Object.entries(fields)) {
      if (def.required && !(key in data)) {
        throw Object.assign(new Error(`Missing required field: ${key}`), { statusCode: 400 });
      }
      if (key in data && data[key] !== null && data[key] !== undefined) {
        const actual = Array.isArray(data[key]) ? 'array' : typeof data[key];
        if (actual !== def.type) {
          throw Object.assign(
            new Error(`Field '${key}' expected ${def.type}, got ${actual}`),
            { statusCode: 400 }
          );
        }
      }
    }
  }

  async uploadDocument(
    platformId: string,
    schemaName: string,
    docKey: string,
    data: Record<string, unknown>,
    uploaderWallet: string
  ): Promise<DocumentRecord> {
    const schema = this.getSchema(platformId, schemaName);
    this.validateDocument(schema.fields, data);

    const existing = this.db
      .prepare(
        `SELECT MAX(version) as max_v FROM schema_documents
         WHERE platform_id = ? AND schema_name = ? AND doc_key = ?`
      )
      .get(platformId, schemaName, docKey) as { max_v: number | null };

    if (existing.max_v !== null) {
      throw Object.assign(
        new Error(`Document '${docKey}' already exists. Use update.`),
        { statusCode: 409 }
      );
    }

    const { blobId, commitment } = await this.storeBlob(Buffer.from(JSON.stringify(data)));

    this.db
      .prepare(
        `INSERT INTO schema_documents
           (id, platform_id, schema_name, doc_key, blob_id, commitment, version, deleted, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)`
      )
      .run(crypto.randomUUID(), platformId, schemaName, docKey, blobId, commitment, uploaderWallet);

    return {
      key: docKey,
      blobId,
      commitment,
      version: 1,
      createdBy: uploaderWallet,
      createdAt: new Date().toISOString(),
    };
  }

  async findDocument(
    platformId: string,
    schemaName: string,
    docKey: string
  ): Promise<DocumentRecord> {
    const row = this.getLatestRow(platformId, schemaName, docKey);
    if (!row || row.deleted) {
      throw Object.assign(new Error(`Document '${docKey}' not found`), { statusCode: 404 });
    }
    const data = await this.fetchBlob(row.blob_id);
    return {
      key: row.doc_key,
      blobId: row.blob_id,
      commitment: row.commitment,
      version: row.version,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      data,
    };
  }

  async findAll(platformId: string, schemaName: string): Promise<DocumentRecord[]> {
    const rows = this.db
      .prepare(
        `SELECT d.* FROM schema_documents d
         INNER JOIN (
           SELECT doc_key, MAX(version) as max_v
           FROM schema_documents
           WHERE platform_id = ? AND schema_name = ?
           GROUP BY doc_key
         ) m ON d.doc_key = m.doc_key AND d.version = m.max_v
         WHERE d.platform_id = ? AND d.schema_name = ? AND d.deleted = 0`
      )
      .all(platformId, schemaName, platformId, schemaName) as DocumentRow[];

    return Promise.all(
      rows.map(async (row) => {
        const data = await this.fetchBlob(row.blob_id);
        return {
          key: row.doc_key,
          blobId: row.blob_id,
          commitment: row.commitment,
          version: row.version,
          createdBy: row.created_by,
          createdAt: new Date(row.created_at * 1000).toISOString(),
          data,
        };
      })
    );
  }

  async findMany(
    platformId: string,
    schemaName: string,
    filter: Record<string, unknown>
  ): Promise<DocumentRecord[]> {
    const all = await this.findAll(platformId, schemaName);
    return all.filter((doc) =>
      Object.entries(filter).every(([k, v]) => doc.data?.[k] === v)
    );
  }

  async updateDocument(
    platformId: string,
    schemaName: string,
    docKey: string,
    data: Record<string, unknown>,
    uploaderWallet: string
  ): Promise<DocumentRecord> {
    const schema = this.getSchema(platformId, schemaName);
    this.validateDocument(schema.fields, data);

    const existing = this.getLatestRow(platformId, schemaName, docKey);
    if (!existing || existing.deleted) {
      throw Object.assign(new Error(`Document '${docKey}' not found`), { statusCode: 404 });
    }

    const { blobId, commitment } = await this.storeBlob(Buffer.from(JSON.stringify(data)));
    const newVersion = existing.version + 1;

    this.db
      .prepare(
        `INSERT INTO schema_documents
           (id, platform_id, schema_name, doc_key, blob_id, commitment, version, deleted, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        crypto.randomUUID(),
        platformId,
        schemaName,
        docKey,
        blobId,
        commitment,
        newVersion,
        uploaderWallet
      );

    return {
      key: docKey,
      blobId,
      commitment,
      version: newVersion,
      createdBy: uploaderWallet,
      createdAt: new Date().toISOString(),
    };
  }

  deleteDocument(platformId: string, schemaName: string, docKey: string): void {
    const row = this.getLatestRow(platformId, schemaName, docKey);
    if (!row || row.deleted) {
      throw Object.assign(new Error(`Document '${docKey}' not found`), { statusCode: 404 });
    }
    this.db
      .prepare(
        `UPDATE schema_documents SET deleted = 1
         WHERE platform_id = ? AND schema_name = ? AND doc_key = ? AND version = ?`
      )
      .run(platformId, schemaName, docKey, row.version);
  }

  getHistory(
    platformId: string,
    schemaName: string,
    docKey: string
  ): DocumentVersion[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM schema_documents
         WHERE platform_id = ? AND schema_name = ? AND doc_key = ?
         ORDER BY version ASC`
      )
      .all(platformId, schemaName, docKey) as DocumentRow[];
    return rows.map((row) => ({
      blobId: row.blob_id,
      commitment: row.commitment,
      version: row.version,
      deleted: row.deleted === 1,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    }));
  }

  private getLatestRow(
    platformId: string,
    schemaName: string,
    docKey: string
  ): DocumentRow | null {
    return (
      (this.db
        .prepare(
          `SELECT * FROM schema_documents
           WHERE platform_id = ? AND schema_name = ? AND doc_key = ?
           ORDER BY version DESC LIMIT 1`
        )
        .get(platformId, schemaName, docKey) as DocumentRow | undefined) ?? null
    );
  }

  private async storeBlob(buffer: Buffer): Promise<{ blobId: string; commitment: string }> {
    const commitment = crypto.createHash('sha256').update(buffer).digest('hex');
    const res = await axios.post(
      `${EIGENDA_PROXY_URL}/put?commitment_mode=standard`,
      buffer,
      { responseType: 'arraybuffer', headers: { 'Content-Type': 'application/octet-stream' } }
    );
    const blobId = Buffer.from(res.data as ArrayBuffer).toString('hex');
    return { blobId, commitment };
  }

  private async fetchBlob(blobId: string): Promise<Record<string, unknown>> {
    const res = await axios.get(
      `${EIGENDA_PROXY_URL}/get/${blobId}?commitment_mode=standard`,
      { responseType: 'arraybuffer' }
    );
    return JSON.parse(Buffer.from(res.data as ArrayBuffer).toString('utf8'));
  }
}
