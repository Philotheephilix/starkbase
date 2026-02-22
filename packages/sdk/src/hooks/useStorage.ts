import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { UploadResponse, BlobMetadata } from '@starkbase/types';

export function useStorage() {
  const client = useStarkbaseContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try { return await fn(); }
    catch (e) { setError(e as Error); throw e; }
    finally { setIsLoading(false); }
  }, []);

  return {
    isLoading,
    error,
    upload: (data: Uint8Array | ArrayBuffer, contentType?: string): Promise<UploadResponse> =>
      withLoading(() => client.storage.upload(data, contentType)),
    get: (blobId: string): Promise<Uint8Array> =>
      withLoading(() => client.storage.get(blobId)),
    verify: (blobId: string, commitment: string, dataHash: string): Promise<boolean> =>
      withLoading(() => client.storage.verify(blobId, commitment, dataHash)),
    getMetadata: (blobId: string): Promise<BlobMetadata> =>
      withLoading(() => client.storage.getMetadata(blobId)),
  };
}
