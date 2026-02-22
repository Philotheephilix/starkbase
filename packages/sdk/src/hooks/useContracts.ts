import { useState, useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { SchemaDefinition, DeployedContract, ContractRecord } from '@starkbase/types';

export function useContracts() {
  const client = useStarkbaseContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        return await fn();
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    deploy: (schema: SchemaDefinition, owner: string): Promise<DeployedContract> =>
      withLoading(() => client.contracts.deploy(schema, owner)),
    createRecord: (address: string, data: Record<string, unknown>): Promise<ContractRecord> =>
      withLoading(() => client.contracts.createRecord(address, data)),
    getRecord: (address: string, id: string): Promise<ContractRecord> =>
      withLoading(() => client.contracts.getRecord(address, id)),
    getSchema: (address: string): Promise<SchemaDefinition> =>
      withLoading(() => client.contracts.getSchema(address)),
  };
}
