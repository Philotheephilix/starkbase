import { useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { BlobFile } from '@starkbase/types';

export function useBlobs() {
  const client = useStarkbaseContext();

  const upload = useCallback(
    (file: File | Uint8Array | ArrayBuffer, options?: { filename?: string; mimeType?: string }): Promise<BlobFile> =>
      client.blobs.upload(file, options),
    [client]
  );

  const list = useCallback((): Promise<BlobFile[]> => client.blobs.list(), [client]);

  const getMeta = useCallback(
    (id: string): Promise<BlobFile> => client.blobs.getMeta(id),
    [client]
  );

  const get = useCallback(
    (id: string): Promise<Uint8Array> => client.blobs.get(id),
    [client]
  );

  const remove = useCallback(
    (id: string): Promise<void> => client.blobs.delete(id),
    [client]
  );

  return { upload, list, getMeta, get, delete: remove };
}
