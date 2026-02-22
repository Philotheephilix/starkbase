import { createContext, useContext } from 'react';
import type { StarkbaseClient } from '../client';

export const StarkbaseContext = createContext<StarkbaseClient | null>(null);

export function useStarkbaseContext(): StarkbaseClient {
  const client = useContext(StarkbaseContext);
  if (!client) throw new Error('useStarkbase must be used within a StarkbaseProvider');
  return client;
}
