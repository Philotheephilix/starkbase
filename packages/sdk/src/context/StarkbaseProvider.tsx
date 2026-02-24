import React, { useMemo, type ReactNode } from 'react';
import { StarkbaseClient } from '../client';
import { StarkbaseContext, useStarkbaseContext } from './StarkbaseContext';
import type { StarkbaseConfig } from '@starkbase/types';

interface StarkbaseProviderProps extends StarkbaseConfig {
  children: ReactNode;
}

export function StarkbaseProvider({ children, ...config }: StarkbaseProviderProps) {
  const client = useMemo(
    () => new StarkbaseClient(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.apiUrl, config.providerUrl, config.platformId, config.apiKey]
  );

  return (
    <StarkbaseContext.Provider value={client}>
      {children}
    </StarkbaseContext.Provider>
  );
}

export { useStarkbaseContext as useStarkbase };
