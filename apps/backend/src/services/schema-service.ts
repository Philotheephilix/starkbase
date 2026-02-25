import crypto from 'crypto';
import axios from 'axios';
import type Database from 'better-sqlite3';
import { toFelt252 } from './blob-registry-service';
import type { BlobRegistryService } from './blob-registry-service';

const EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_URL ?? 'http://127.0.0.1:3100';

function contractAddress(): string {
  const addr = process.env.BLOB_REGISTRY_CONTRACT;
  if (!addr) throw Object.assign(
    new Error('BLOB_REGISTRY_CONTRACT env var not set — deploy the registry contract first'),
    { statusCode: 500 }
  );
  return addr;
}

export interface SchemaFieldDef {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
}

export interface SchemaRecord {
  id: string;
  platformId: string;
  name: string;
  fields: Record<string, SchemaFieldDef>;
  onchain: boolean;
  onchainTxHash?: string;
  onchainCommitment?: string;
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

export interface SchemaVerifyResult {
  verified: boolean;
  commitment: string;       // SHA-256 stored in SQLite
  onchainKey: string;       // toFelt252(commitment) — what's anchored onchain
  txHash: string | null;
  onchainWalletAddress: string | null;
}

type SchemaRow = {
  id: string;
  platform_id: string;
  name: string;
  fields: string;
  onchain: number;
  onchain_tx_hash: string | null;
  onchain_commitment: string | null;
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
  constructor(
    private db: Database.Database,
    private registrySvc?: BlobRegistryService
  ) {}

  /** Compute a deterministic commitment for a schema definition. */
  static schemaCommitment(name: string, fields: Record<string, SchemaFieldDef>): string {
    const canonical = JSON.stringify({ name, fields }, Object.keys(fields).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  async createSchema(
    platformId: string,
    name: string,
    fields: Record<string, SchemaFieldDef>,
    opts?: { onchain?: boolean; walletAddress?: string }
  ): Promise<SchemaRecord> {
    const id = crypto.randomUUID();
    const onchain = opts?.onchain === true;
    let txHash: string | null = null;
    let commitment: string | null = null;

    if (onchain) {
      if (!this.registrySvc) {
        throw Object.assign(new Error('Registry service not available for onchain anchoring'), { statusCode: 500 });
      }
      if (!opts?.walletAddress) {
        throw Object.assign(new Error('walletAddress required for onchain schema'), { statusCode: 400 });
      }
      commitment = SchemaService.schemaCommitment(name, fields);
      txHash = await this.registrySvc.create(
        contractAddress(),
        platformId,
        opts.walletAddress,
        commitment
      );
    }

    try {
      this.db
        .prepare(
          `INSERT INTO schemas (id, platform_id, name, fields, onchain, onchain_tx_hash, onchain_commitment)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, platformId, name, JSON.stringify(fields), onchain ? 1 : 0, txHash, commitment);
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw Object.assign(new Error(`Schema '${name}' already exists`), { statusCode: 409 });
      }
      throw err;
    }

    return this._rowToRecord(
      this.db.prepare('SELECT * FROM schemas WHERE id = ?').get(id) as SchemaRow
    );
  }

  getSchema(platformId: string, name: string): SchemaRecord {
    const row = this.db
      .prepare('SELECT * FROM schemas WHERE platform_id = ? AND name = ?')
      .get(platformId, name) as SchemaRow | undefined;
    if (!row) {
      throw Object.assign(new Error(`Schema '${name}' not found`), { statusCode: 404 });
    }
    return this._rowToRecord(row);
  }

  /** Verify onchain consistency: compare SQLite commitment key with onchain registry. */
  async verifySchema(platformId: string, name: string): Promise<SchemaVerifyResult> {
    if (!this.registrySvc) {
      throw Object.assign(new Error('Registry service not available'), { statusCode: 500 });
    }
    const schema = this.getSchema(platformId, name);
    if (!schema.onchain || !schema.onchainCommitment) {
      throw Object.assign(new Error(`Schema '${name}' was not anchored onchain`), { statusCode: 400 });
    }

    const onchainKey = toFelt252(schema.onchainCommitment);
    let walletAddress: string | null = null;
    let verified = false;
    try {
      walletAddress = await this.registrySvc.fetch(contractAddress(), platformId, schema.onchainCommitment);
      verified = walletAddress !== '0x0' && walletAddress !== '0x';
    } catch {
      verified = false;
    }

    return {
      verified,
      commitment: schema.onchainCommitment,
      onchainKey,
      txHash: schema.onchainTxHash ?? null,
      onchainWalletAddress: walletAddress,
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

    return { key: docKey, blobId, commitment, version: 1, createdBy: uploaderWallet, createdAt: new Date().toISOString() };
  }

  async findDocument(platformId: string, schemaName: string, docKey: string): Promise<DocumentRecord> {
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
    if (schema.onchain) {
      throw Object.assign(
        new Error(`Schema '${schemaName}' is anchored onchain — documents cannot be updated`),
        { statusCode: 403 }
      );
    }
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
      .run(crypto.randomUUID(), platformId, schemaName, docKey, blobId, commitment, newVersion, uploaderWallet);

    return { key: docKey, blobId, commitment, version: newVersion, createdBy: uploaderWallet, createdAt: new Date().toISOString() };
  }

  deleteDocument(platformId: string, schemaName: string, docKey: string): void {
    const schema = this.getSchema(platformId, schemaName);
    if (schema.onchain) {
      throw Object.assign(
        new Error(`Schema '${schemaName}' is anchored onchain — documents cannot be deleted`),
        { statusCode: 403 }
      );
    }
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

  getHistory(platformId: string, schemaName: string, docKey: string): DocumentVersion[] {
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

  private getLatestRow(platformId: string, schemaName: string, docKey: string): DocumentRow | null {
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

  private _rowToRecord(row: SchemaRow): SchemaRecord {
    return {
      id: row.id,
      platformId: row.platform_id,
      name: row.name,
      fields: JSON.parse(row.fields),
      onchain: row.onchain === 1,
      onchainTxHash: row.onchain_tx_hash ?? undefined,
      onchainCommitment: row.onchain_commitment ?? undefined,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    };
  }
}
