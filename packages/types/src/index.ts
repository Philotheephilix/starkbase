// ─── Config ───────────────────────────────────────────────────────────────────

export interface StarkbaseConfig {
  apiUrl?: string;
  providerUrl?: string;
  sessionToken?: string;
  platformId?: string;
  apiKey?: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export type StorageMode = 'onchain' | 'eigenda' | 'hybrid';
export type CommitmentAlgorithm = 'keccak256' | 'sha256';

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface SchemaField {
  name: string;
  type: string; // 'string' | 'u64' | 'felt252' | 'bool' | etc.
  required: boolean;
  indexed?: boolean;
  maxLength?: number;
  default?: string;
}

export interface SchemaPermissions {
  create: string[]; // e.g. ['owner'] | ['public']
  read: string[];
  update: string[];
  delete: string[];
}

export interface SchemaDefinition {
  name: string;
  version: string;
  fields: SchemaField[];
  storage: {
    mode: StorageMode;
    commitment: CommitmentAlgorithm;
  };
  permissions: SchemaPermissions;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  apiKey: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  apiKey: string;
  username: string;
  password: string;
}

export interface AuthResult {
  walletAddress: string;
  sessionToken: string;
  username: string;
  platformId: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  platformId: string;
  walletAddress: string;
}

export interface Platform {
  id: string;
  name: string;
  apiKey: string;
  createdAt: number;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface DeployedContract {
  contractAddress: string;
  transactionHash: string;
  schema: SchemaDefinition;
  eigendaBlobId?: string; // set when storage.mode is 'hybrid'
}

export interface ContractRecord {
  id: string;
  contractAddress: string;
  data: Record<string, unknown>;
  eigendaBlobId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface UploadResponse {
  blobId: string;
  commitment: string;
  dataHash: string;
  size: number;
}

export interface BlobMetadata {
  blobId: string;
  commitment: string;
  dataHash: string;
  size: number;
  contentType?: string;
  uploaderWallet: string;
  platformId: string;
  uploadedAt: string;
}

// ─── NFT ──────────────────────────────────────────────────────────────────────

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
  external_url?: string;
}

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  platformId: string;
  transactionHash: string;
}

export interface MintedNFT {
  tokenId: string;
  contractAddress: string;
  recipient: string;
  transactionHash: string;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export interface CreatedToken {
  contractAddress: string;
  name: string;
  symbol: string;
  initialSupply: string;
  platformId: string;
  transactionHash: string;
}

export interface MintRewardResponse {
  transactionHash: string;
  recipient: string;
  amount: string;
  reason: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown[]; path?: unknown[] }>;
}

// ─── Blob Files ───────────────────────────────────────────────────────────────

export interface BlobFile {
  id: string;           // UUID (user-facing id)
  platformId: string;
  blobId: string;       // EigenDA cert hex
  commitment: string;   // SHA-256 of raw bytes
  filename?: string;
  mimeType?: string;
  size: number;
  deleted: boolean;
  onchain: boolean;
  onchainTxHash?: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface BlobVerifyResult {
  verified: boolean;
  commitment: string;         // SHA-256 stored in SQLite
  onchainKey: string;         // toFelt252(commitment) — felt252 anchored onchain
  txHash: string | null;
  onchainWalletAddress: string | null;
}

// ─── Schema Document Store ────────────────────────────────────────────────────

export interface SchemaFieldDef {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
}

export interface SchemaCollectionDef {
  fields: Record<string, SchemaFieldDef>;
}

export interface SchemaRecord {
  id: string;
  platformId: string;
  name: string;
  fields: Record<string, SchemaFieldDef>;
  onchain: boolean;
  onchainTxHash?: string;
  onchainCommitment?: string;
  createdAt: string;
}

export interface SchemaVerifyResult {
  verified: boolean;
  commitment: string;         // SHA-256 of the schema definition
  onchainKey: string;         // toFelt252(commitment) — felt252 anchored onchain
  txHash: string | null;
  onchainWalletAddress: string | null;
}

export interface DocumentRecord {
  key: string;
  blobId: string;
  commitment: string;
  version: number;
  createdBy: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface DocumentVersion {
  blobId: string;
  commitment: string;
  version: number;
  deleted: boolean;
  createdBy: string;
  createdAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface EventRecord {
  id: string;
  platformId: string;
  name: string;
  description: string;
  imageUrl: string;
  maxSupply: number;       // 0 = unlimited
  contractAddress: string;
  txHash: string;
  creatorWallet: string;
  deployedAt: string;
  mintCount?: number;
}

export interface EventMint {
  id: string;
  eventId: string;
  tokenId: string;
  recipient: string;
  txHash: string;
  mintedAt: string;
}
