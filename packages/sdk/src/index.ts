// Client
export { StarkbaseClient } from './client';

// React
export { StarkbaseProvider, useStarkbase } from './context/StarkbaseProvider';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useContracts } from './hooks/useContracts';
export { useStorage } from './hooks/useStorage';
export { useQuery } from './hooks/useQuery';
export { useNFTs } from './hooks/useNFTs';
export { useTokens } from './hooks/useTokens';

// Types (re-exported for convenience)
export type {
  StarkbaseConfig,
  SchemaDefinition,
  SchemaField,
  NFTMetadata,
  StorageMode,
  DeployedContract,
  ContractRecord,
  UploadResponse,
  BlobMetadata,
  NFTCollection,
  MintedNFT,
  CreatedToken,
  MintRewardResponse,
  QueryOptions,
  PaginatedResponse,
  GraphQLResponse,
} from '@starkbase/types';
