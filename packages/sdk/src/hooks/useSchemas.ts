import { useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { SchemaCollectionDef, SchemaRecord, SchemaVerifyResult } from '@starkbase/types';

export function useSchemas() {
  const client = useStarkbaseContext();

  const listSchemas = useCallback(
    (): Promise<SchemaRecord[]> => client.schemas.list(),
    [client]
  );

  const createSchema = useCallback(
    (name: string, def: SchemaCollectionDef, opts?: { onchain?: boolean }): Promise<SchemaRecord> =>
      client.schemas.create(name, def, opts),
    [client]
  );

  const getSchema = useCallback(
    (name: string): Promise<SchemaRecord> => client.schemas.get(name),
    [client]
  );

  const verifySchema = useCallback(
    (name: string): Promise<SchemaVerifyResult> => client.schemas.verify(name),
    [client]
  );

  const collection = useCallback(
    (name: string) => client.schema(name),
    [client]
  );

  return { listSchemas, createSchema, getSchema, verifySchema, collection };
}
