import { useState, useCallback, useEffect } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { AuthUser, AuthResult } from '@starkbase/types';

const TOKEN_KEY = 'sb_session_token';

export function useAuth() {
  const client = useStarkbaseContext();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      client.setSessionToken(token);
      client.auth.me()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          client.clearSessionToken();
        })
        .finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, [client]);

  const register = useCallback(
    async (params: { username: string; password: string }): Promise<AuthResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.auth.register(params);
        localStorage.setItem(TOKEN_KEY, result.sessionToken);
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
        localStorage.setItem(TOKEN_KEY, result.sessionToken);
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
      localStorage.removeItem(TOKEN_KEY);
      client.clearSessionToken();
      setUser(null);
    }
  }, [client]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading: isLoading || !initialized,
    error,
    register,
    login,
    logout,
  };
}
