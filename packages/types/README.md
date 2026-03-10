# @starkbase/types

Type definitions for the [Starkbase](https://starkbase.vercel.app) SDK and backend services.

## Install

```bash
npm install @starkbase/types
```

## Usage

```typescript
import type {
  StarkbaseConfig,
  AuthResult,
  AuthUser,
  Platform,
  SchemaRecord,
  SchemaFieldDef,
  SchemaCollectionDef,
  DocumentRecord,
  DocumentVersion,
  BlobFile,
  BlobVerifyResult,
  EventRecord,
  EventMint,
  CreatedToken,
  MintTokenResponse,
  TokenMintEvent,
  NFTCollection,
  MintedNFT,
  NFTMetadata,
} from '@starkbase/types';
```

## Type Reference

### Config

| Type | Description |
|------|-------------|
| `StarkbaseConfig` | Client configuration: `apiUrl`, `providerUrl`, `platformId`, `apiKey`, `sessionToken` |

### Auth

| Type | Description |
|------|-------------|
| `RegisterRequest` | `{ apiKey, username, password }` |
| `LoginRequest` | `{ apiKey, username, password }` |
| `AuthResult` | `{ walletAddress, sessionToken, username, platformId }` |
| `AuthUser` | `{ userId, username, platformId, walletAddress }` |
| `Platform` | `{ id, name, apiKey, createdAt }` |

### Schemas & Documents

| Type | Description |
|------|-------------|
| `SchemaFieldDef` | `{ type: 'string' \| 'number' \| 'boolean' \| 'object' \| 'array', required? }` |
| `SchemaCollectionDef` | `{ fields: Record<string, SchemaFieldDef> }` |
| `SchemaRecord` | Schema metadata including `name`, `fields`, `onchain`, `onchainTxHash`, `onchainCommitment` |
| `SchemaVerifyResult` | `{ verified, commitment, onchainKey, txHash, onchainWalletAddress }` |
| `DocumentRecord` | `{ key, blobId, commitment, version, createdBy, createdAt, data? }` |
| `DocumentVersion` | `{ blobId, commitment, version, deleted, createdBy, createdAt }` |

### Blobs / Files

| Type | Description |
|------|-------------|
| `BlobFile` | File stored on EigenDA: `id`, `blobId`, `commitment`, `filename`, `mimeType`, `size`, `onchain`, etc. |
| `BlobVerifyResult` | `{ verified, commitment, onchainKey, txHash, onchainWalletAddress }` |
| `UploadResponse` | `{ blobId, commitment, dataHash, size }` |
| `BlobMetadata` | `{ blobId, commitment, dataHash, size, contentType, uploaderWallet, platformId, uploadedAt }` |

### Events (Proof-of-Attendance NFTs)

| Type | Description |
|------|-------------|
| `EventRecord` | `{ id, platformId, name, description, imageUrl, maxSupply, contractAddress, txHash, creatorWallet, deployedAt, mintCount? }` |
| `EventMint` | `{ id, eventId, tokenId, recipient, txHash, mintedAt }` |

### Tokens (ERC-20)

| Type | Description |
|------|-------------|
| `CreatedToken` | `{ contractAddress, name, symbol, initialSupply, platformId, creatorWallet, transactionHash }` |
| `MintTokenResponse` | `{ txHash, recipient, amount }` |
| `TokenMintEvent` | `{ txHash, recipient, amount, blockNumber }` |

### NFTs (ERC-721)

| Type | Description |
|------|-------------|
| `NFTCollection` | `{ contractAddress, name, symbol, platformId, transactionHash }` |
| `MintedNFT` | `{ tokenId, contractAddress, recipient, transactionHash }` |
| `NFTMetadata` | `{ name, description, image, attributes, external_url? }` |
| `NFTAttribute` | `{ trait_type, value }` |

### Contracts & Query

| Type | Description |
|------|-------------|
| `SchemaDefinition` | Full schema with `fields`, `storage`, `permissions` |
| `DeployedContract` | `{ contractAddress, transactionHash, schema, eigendaBlobId? }` |
| `ContractRecord` | `{ id, contractAddress, data, eigendaBlobId?, createdAt, updatedAt }` |
| `QueryOptions` | `{ limit?, offset?, orderBy?, orderDirection? }` |
| `PaginatedResponse<T>` | `{ items, total, limit, offset }` |
| `GraphQLResponse<T>` | `{ data?, errors? }` |

## License

MIT
