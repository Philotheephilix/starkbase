import type { AxiosInstance } from 'axios';
import type { BlobFile } from '@starkbase/types';

export class BlobsModule {
  constructor(private http: AxiosInstance) {}

  /**
   * Upload a file to EigenDA.
   * Accepts a browser File, Uint8Array, or ArrayBuffer.
   * Pass onchain=true to anchor the commitment in the registry contract (immutable after upload).
   */
  async upload(
    file: File | Uint8Array | ArrayBuffer,
    options?: { filename?: string; mimeType?: string; onchain?: boolean }
  ): Promise<BlobFile> {
    let bytes: Uint8Array;
    let filename = options?.filename;
    let mimeType = options?.mimeType;

    if (file instanceof File) {
      bytes = new Uint8Array(await file.arrayBuffer());
      filename ??= file.name;
      mimeType ??= file.type || undefined;
    } else if (file instanceof ArrayBuffer) {
      bytes = new Uint8Array(file);
    } else {
      bytes = file;
    }

    // Encode as base64 for transport
    const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));

    const { data } = await this.http.post('/blobs', {
      data: base64,
      filename,
      mimeType,
      onchain: options?.onchain,
    });
    return data as BlobFile;
  }

  /** List all non-deleted blobs for the current platform. */
  async list(): Promise<BlobFile[]> {
    const { data } = await this.http.get('/blobs');
    return data as BlobFile[];
  }

  /** Get blob metadata without downloading the data. */
  async getMeta(id: string): Promise<BlobFile> {
    const { data } = await this.http.get(`/blobs/${id}/meta`);
    return data as BlobFile;
  }

  /**
   * Download blob data from EigenDA.
   * Returns the raw bytes as a Uint8Array.
   */
  async get(id: string): Promise<Uint8Array> {
    const { data } = await this.http.get(`/blobs/${id}`, {
      responseType: 'arraybuffer',
    });
    return new Uint8Array(data as ArrayBuffer);
  }

  /** Soft-delete a blob (marks deleted in SQLite; EigenDA data is permanent).
   *  Throws 403 if the blob was uploaded with onchain=true. */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/blobs/${id}`);
  }

  /** Verify onchain consistency: compare SQLite commitment key with the onchain registry. */
  async verify(id: string): Promise<import('@starkbase/types').BlobVerifyResult> {
    const { data } = await this.http.get(`/blobs/${id}/verify`);
    return data;
  }
}
