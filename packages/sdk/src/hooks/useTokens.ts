import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { CreatedToken, MintRewardResponse } from '@starkbase/types';

export function useTokens() {
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
    create: (name: string, symbol: string, initialSupply: string, platformId: string): Promise<CreatedToken> =>
      withLoading(() => client.tokens.create(name, symbol, initialSupply, platformId)),
    mintReward: (address: string, recipient: string, amount: string, reason: string): Promise<MintRewardResponse> =>
      withLoading(() => client.tokens.mintReward(address, recipient, amount, reason)),
  };
}
