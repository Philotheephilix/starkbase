import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { AuthSession, AuthInitiateResponse, AuthDeployResponse } from '@starkbase/types';

export function useAuth() {
  const client = useStarkbaseContext();
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initiateAuth = useCallback(
    async (
      provider: 'google' | 'discord' | 'apple',
      redirectUri: string
    ): Promise<AuthInitiateResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await client.auth.initiateAuth(provider, redirectUri);
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const deployAccount = useCallback(
    async (params: {
      jwt: string;
      zkProof: string[];
      ephemeralPublicKey: string;
      expirationBlock: number;
    }): Promise<AuthDeployResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.auth.deployAccount(params);
        client.setSessionToken(result.sessionToken);
        setUser({ accountAddress: result.accountAddress, provider: 'google', expiresAt: 0 });
        return result;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const logout = useCallback(() => {
    client.clearSessionToken();
    setUser(null);
  }, [client]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    initiateAuth,
    deployAccount,
    logout,
  };
}
