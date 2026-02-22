import type { AxiosInstance } from 'axios';
import type { UploadResponse, BlobMetadata } from '@starkbase/types';

export class StorageModule {
  constructor(private http: AxiosInstance) {}

  async upload(data: Uint8Array | ArrayBuffer, contentType?: string): Promise<UploadResponse> {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
    const { data: res } = await this.http.post('/storage/upload', { data: base64, contentType });
    return res;
  }

  async get(blobId: string): Promise<Uint8Array> {
    const { data } = await this.http.get(`/storage/blobs/${blobId}`, {
      responseType: 'arraybuffer',
    });
    return new Uint8Array(data as ArrayBuffer);
  }

  async verify(blobId: string, commitment: string, dataHash: string): Promise<boolean> {
    const { data } = await this.http.post('/storage/verify', { blobId, commitment, dataHash });
    return data.verified;
  }

  async getMetadata(blobId: string): Promise<BlobMetadata> {
    const { data } = await this.http.get(`/storage/blobs/${blobId}/metadata`);
    return data;
  }
}
