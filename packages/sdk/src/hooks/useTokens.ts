import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { CreatedToken, MintTokenResponse, TokenMintEvent } from '@starkbase/types';

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
    deploy: (
      name: string,
      symbol: string,
      initialSupply: string,
      recipientAddress: string
    ): Promise<CreatedToken> =>
      withLoading(() => client.tokens.deploy(name, symbol, initialSupply, recipientAddress)),
    mint: (
      contractAddress: string,
      recipient: string,
      amount: string
    ): Promise<MintTokenResponse> =>
      withLoading(() => client.tokens.mint(contractAddress, recipient, amount)),
    list: (): Promise<CreatedToken[]> =>
      withLoading(() => client.tokens.list()),
    history: (contractAddress: string): Promise<TokenMintEvent[]> =>
      withLoading(() => client.tokens.history(contractAddress)),
  };
}
