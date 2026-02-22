import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type {
  QueryOptions,
  PaginatedResponse,
  ContractRecord,
  GraphQLResponse,
} from '@starkbase/types';

export function useQuery() {
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
    graphql: <T = unknown>(query: string, variables?: Record<string, unknown>): Promise<GraphQLResponse<T>> =>
      withLoading(() => client.query.graphql<T>(query, variables)),
    getRecords: (address: string, options?: QueryOptions): Promise<PaginatedResponse<ContractRecord>> =>
      withLoading(() => client.query.getRecords(address, options)),
  };
}
