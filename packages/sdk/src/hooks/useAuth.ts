import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { AuthUser, AuthResult } from '@starkbase/types';

export function useAuth() {
  const client = useStarkbaseContext();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const register = useCallback(
    async (params: { username: string; password: string }): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.auth.register(params);
        client.setSessionToken(result.sessionToken);
        setUser({
          userId: '',
          username: result.username,
          platformId: result.platformId,
          walletAddress: result.walletAddress,
        });
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

  const login = useCallback(
    async (params: { username: string; password: string }): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.auth.login(params);
        client.setSessionToken(result.sessionToken);
        setUser({
          userId: '',
          username: result.username,
          platformId: result.platformId,
          walletAddress: result.walletAddress,
        });
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

  const logout = useCallback(async () => {
    try {
      await client.auth.logout();
    } finally {
      client.clearSessionToken();
      setUser(null);
    }
  }, [client]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    register,
    login,
    logout,
  };
}
