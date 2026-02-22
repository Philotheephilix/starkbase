import crypto from 'crypto';
import axios from 'axios';
import type Database from 'better-sqlite3';
import type { UploadResponse, BlobMetadata } from '@starkbase/types';

const EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_URL ?? 'http://127.0.0.1:3100';

type BlobRow = {
  id: string;
  data_hash: string;
  commitment: string;
  size: number;
  content_type: string | null;
  uploader_wallet: string;
  platform_id: string;
  uploaded_at: number;
};

export class StorageService {
  constructor(private db: Database.Database) {}

  static computeDataHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static computeCommitment(data: Buffer): string {
    return crypto.createHash('sha256')
      .update(Buffer.from(data.toString('hex')))
      .digest('hex');
  }

  async upload(
    data: Buffer,
    uploaderWallet: string,
    platformId: string,
    contentType?: string
  ): Promise<UploadResponse> {
    const dataHash = StorageService.computeDataHash(data);
    const commitment = StorageService.computeCommitment(data);

    // POST raw bytes to EigenDA proxy; response body is the binary cert
    const res = await axios.post(
      `${EIGENDA_PROXY_URL}/put?commitment_mode=standard`,
      data,
      { responseType: 'arraybuffer', headers: { 'Content-Type': 'application/octet-stream' } }
    );
    const certHex = Buffer.from(res.data as ArrayBuffer).toString('hex');

    this.db.prepare(
      `INSERT OR IGNORE INTO blobs (id, data_hash, commitment, size, content_type, uploader_wallet, platform_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(certHex, dataHash, commitment, data.length, contentType ?? null, uploaderWallet, platformId);

    return { blobId: certHex, commitment, dataHash, size: data.length };
  }

  async get(blobId: string): Promise<Buffer> {
    // blobId is the hex-encoded EigenDA cert
    const res = await axios.get(
      `${EIGENDA_PROXY_URL}/get/${blobId}?commitment_mode=standard`,
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async verify(blobId: string, commitment: string, dataHash: string): Promise<boolean> {
    try {
      const data = await this.get(blobId);
      return (
        StorageService.computeDataHash(data) === dataHash &&
        StorageService.computeCommitment(data) === commitment
      );
    } catch {
      return false;
    }
  }

  async getMetadata(blobId: string): Promise<BlobMetadata> {
    const row = this.db
      .prepare('SELECT * FROM blobs WHERE id = ?')
      .get(blobId) as BlobRow | undefined;

    if (!row) throw new Error(`Blob ${blobId} not found`);

    return {
      blobId: row.id,
      commitment: row.commitment,
      dataHash: row.data_hash,
      size: row.size,
      contentType: row.content_type ?? undefined,
      uploaderWallet: row.uploader_wallet,
      platformId: row.platform_id,
      uploadedAt: new Date(row.uploaded_at * 1000).toISOString(),
    };
  }
}
