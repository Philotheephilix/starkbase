import { useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { SchemaCollectionDef, SchemaRecord } from '@starkbase/types';

export function useSchemas() {
  const client = useStarkbaseContext();

  const createSchema = useCallback(
    (name: string, def: SchemaCollectionDef): Promise<SchemaRecord> =>
      client.schemas.create(name, def),
    [client]
  );

  const getSchema = useCallback(
    (name: string): Promise<SchemaRecord> => client.schemas.get(name),
    [client]
  );

  const collection = useCallback(
    (name: string) => client.schema(name),
    [client]
  );

  return { createSchema, getSchema, collection };
}
