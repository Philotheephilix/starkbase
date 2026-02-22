import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { NFTMetadata, NFTCollection, MintedNFT } from '@starkbase/types';

export function useNFTs() {
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
    createCollection: (name: string, symbol: string, platformId: string): Promise<NFTCollection> =>
      withLoading(() => client.nfts.createCollection(name, symbol, platformId)),
    mint: (address: string, recipient: string, metadata: NFTMetadata, labels: string[]): Promise<MintedNFT> =>
      withLoading(() => client.nfts.mint(address, recipient, metadata, labels)),
    addLabels: (address: string, tokenId: string, labels: string[]): Promise<{ success: boolean }> =>
      withLoading(() => client.nfts.addLabels(address, tokenId, labels)),
  };
}
