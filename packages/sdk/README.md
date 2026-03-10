# @starkbase/sdk

The official SDK for [Starkbase](https://starkbase.vercel.app) — a backend-as-a-service for Starknet with built-in schema management, blob storage (EigenDA), NFT/token deployment, event-based proof-of-attendance, and onchain verification.

## Install

```bash
npm install @starkbase/sdk
```

**Peer dependencies** (React apps):

```bash
npm install react react-dom
```

## Quick Start

### Vanilla TypeScript / Node.js

```typescript
import { StarkbaseClient } from '@starkbase/sdk';

const client = new StarkbaseClient({
  apiUrl: 'https://starknet.philotheephilix.in',
  platformId: 'your-platform-id',
  apiKey: 'sb_your_api_key',
});

// Register a user (deploys a Starknet wallet)
const auth = await client.auth.register({
  username: 'alice',
  password: 'securepassword',
});
console.log('Wallet:', auth.walletAddress);

// Set the session token for authenticated requests
client.setSessionToken(auth.sessionToken);
```

### React

```tsx
import { StarkbaseProvider, useAuth, useSchemas } from '@starkbase/sdk';

function App() {
  return (
    <StarkbaseProvider
      apiUrl="https://starknet.philotheephilix.in"
      platformId="your-platform-id"
      apiKey="sb_your_api_key"
    >
      <MyApp />
    </StarkbaseProvider>
  );
}
```

---

## Configuration

```typescript
const client = new StarkbaseClient({
  apiUrl: 'https://starknet.philotheephilix.in', // Backend URL (default)
  platformId: 'uuid',          // Your platform ID
  apiKey: 'sb_...',            // Platform API key
  sessionToken: 'jwt...',     // Optional: restore existing session
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | `https://starknet.philotheephilix.in` | Backend API URL |
| `platformId` | `string` | — | Platform UUID |
| `apiKey` | `string` | — | Platform API key (used for auth requests) |
| `sessionToken` | `string` | — | JWT token to restore a session |

---

## Modules (Vanilla Client)

All modules are accessible as properties on `StarkbaseClient`:

```typescript
client.auth        // AuthModule
client.platforms   // PlatformsModule
client.schemas     // SchemasModule
client.blobs       // BlobsModule
client.events      // EventsModule
client.tokens      // TokensModule
client.nfts        // NFTsModule
client.contracts   // ContractsModule
client.storage     // StorageModule
client.query       // QueryModule
client.schema(name) // SchemaCollection (document CRUD for a specific schema)
```

---

## Auth

Register and login deploy Starknet wallets for users. Sessions are JWT-based.

```typescript
// Register (deploys a new Starknet wallet)
const result = await client.auth.register({
  username: 'alice',
  password: 'password123',
});
// result: { walletAddress, sessionToken, username, platformId }

// Login
const result = await client.auth.login({
  username: 'alice',
  password: 'password123',
});

// Set session for authenticated requests
client.setSessionToken(result.sessionToken);

// Get current user
const me = await client.auth.me();
// me: { userId, username, platformId, walletAddress }

// List all users in a platform
const users = await client.auth.listUsers('platform-uuid');
// users: [{ userId, username, walletAddress, deployed, createdAt }]

// Logout
await client.auth.logout();
client.clearSessionToken();
```

**React hook:**

```tsx
function LoginForm() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuth();

  const handleLogin = async () => {
    await login({ username: 'alice', password: 'password123' });
  };

  if (isLoading) return <p>Loading...</p>;
  if (isAuthenticated) return <p>Welcome, {user.username}!</p>;
  return <button onClick={handleLogin}>Login</button>;
}
```

Session is automatically restored from `localStorage` on mount.

---

## Platforms

Platforms are multi-tenant environments. Each platform has its own API key, users, schemas, and data.

```typescript
// Create a platform
const platform = await client.platforms.create('my-app', '0xCreatorWallet');
// platform: { id, name, apiKey, creatorWallet, createdAt }

// List all platforms
const all = await client.platforms.list();

// List platforms created by a specific wallet
const mine = await client.platforms.listByWallet('0xMyWallet...');
```

---

## Schemas

Schemas define typed document structures. Documents are stored on EigenDA with optional onchain commitment anchoring.

### Define & Create

```typescript
// Create a schema
const schema = await client.schemas.create(
  'users',
  {
    fields: {
      name: { type: 'string', required: true },
      age: { type: 'number', required: false },
      active: { type: 'boolean', required: true },
    },
  },
  { onchain: true } // Anchor schema commitment onchain
);

// List all schemas
const schemas = await client.schemas.list();

// Get a specific schema
const s = await client.schemas.get('users');
```

### Document CRUD

```typescript
const users = client.schema('users');

// Upload a document
const doc = await users.upload('alice', {
  name: 'Alice',
  age: 30,
  active: true,
});

// Find by key
const found = await users.find('alice');

// Find all documents
const all = await users.findAll();

// Query with filter
const active = await users.findMany({ active: true });

// Update
const updated = await users.update('alice', {
  name: 'Alice',
  age: 31,
  active: true,
});

// Version history
const versions = await users.history('alice');

// Delete
await users.delete('alice');
```

### Onchain Verification

```typescript
const result = await client.schemas.verify('users');
// result: {
//   verified: true,
//   commitment: 'sha256...',
//   onchainKey: 'felt252...',
//   txHash: '0x...',
//   onchainWalletAddress: '0x...'
// }
```

**React hook:**

```tsx
function SchemaManager() {
  const { listSchemas, createSchema, getSchema, verifySchema, collection } = useSchemas();

  const handleCreate = async () => {
    await createSchema('products', {
      fields: {
        title: { type: 'string', required: true },
        price: { type: 'number', required: true },
      },
    }, { onchain: true });
  };

  // Use collection for document CRUD
  const products = collection('products');
  const all = await products.findAll();
}
```

---

## Blobs (File Storage)

Upload files to EigenDA with optional onchain commitment anchoring for immutability.

```typescript
// Upload a file
const blob = await client.blobs.upload(file, {
  filename: 'photo.png',
  mimeType: 'image/png',
  onchain: true, // Immutable — cannot be deleted
});
// blob: { id, blobId, commitment, filename, mimeType, size, onchain, ... }

// List all blobs
const blobs = await client.blobs.list();

// Get metadata
const meta = await client.blobs.getMeta(blob.id);

// Download raw bytes
const data = await client.blobs.get(blob.id);

// Verify onchain consistency
const result = await client.blobs.verify(blob.id);
// result: { verified, commitment, onchainKey, txHash, onchainWalletAddress }

// Delete (soft-delete; throws 403 if onchain=true)
await client.blobs.delete(blob.id);
```

**React hook:**

```tsx
function FileUploader() {
  const { upload, list, get, verify, delete: remove } = useBlobs();

  const handleUpload = async (file: File) => {
    const blob = await upload(file, { onchain: true });
    console.log('Uploaded:', blob.id);
  };
}
```

---

## Events (Proof-of-Attendance NFTs)

Deploy event contracts and mint proof-of-attendance NFTs to attendees.

```typescript
// Create an event (deploys an ERC-721 contract)
const event = await client.events.createEvent(
  'Starknet Hackathon 2026',
  'Annual builder hackathon',
  'https://example.com/banner.png',
  100 // maxSupply (0 = unlimited)
);
// event: { id, contractAddress, txHash, ... }

// List events
const events = await client.events.listEvents();

// Mint NFT to attendee
const mint = await client.events.mint(event.id, '0xRecipientWallet');
// mint: { id, eventId, tokenId, recipient, txHash, mintedAt }

// List mints for an event
const mints = await client.events.listMints(event.id);
```

**React hook:**

```tsx
function EventManager() {
  const { createEvent, listEvents, mint, listMints } = useEvents();

  const handleMint = async (eventId: string, recipient: string) => {
    const result = await mint(eventId, recipient);
    console.log('Minted token #' + result.tokenId);
  };
}
```

---

## Tokens (ERC-20)

Deploy ERC-20 token contracts and mint tokens.

```typescript
// Deploy a token contract
const token = await client.tokens.deploy(
  'GameCoin',        // name
  'GMC',             // symbol
  '1000000',         // initialSupply
  '0xRecipient...'   // recipient of initial supply
);
// token: { contractAddress, name, symbol, initialSupply, transactionHash, ... }

// Mint more tokens (owner only)
const result = await client.tokens.mint(
  token.contractAddress,
  '0xRecipient...',
  '5000'
);
// result: { txHash, recipient, amount }

// List deployed tokens
const tokens = await client.tokens.list();

// Get onchain mint history (Transfer events from zero address)
const history = await client.tokens.history(token.contractAddress);
// history: [{ txHash, recipient, amount, blockNumber }]
```

**React hook:**

```tsx
function TokenDashboard() {
  const { deploy, mint, list, history, isLoading, error } = useTokens();

  const handleDeploy = async () => {
    const token = await deploy('GameCoin', 'GMC', '1000000', recipientAddress);
    console.log('Deployed at:', token.contractAddress);
  };
}
```

---

## NFTs (ERC-721 Collections)

Create NFT collections and mint NFTs with metadata and labels.

```typescript
// Create a collection
const collection = await client.nfts.createCollection('MyNFTs', 'MNFT', platformId);
// collection: { contractAddress, name, symbol, platformId, transactionHash }

// Mint an NFT
const nft = await client.nfts.mint(
  collection.contractAddress,
  '0xRecipient...',
  {
    name: 'Cool NFT #1',
    description: 'A rare collectible',
    image: 'https://example.com/nft.png',
    attributes: [{ trait_type: 'rarity', value: 'legendary' }],
  },
  ['rare', 'genesis']  // labels
);
// nft: { tokenId, contractAddress, recipient, transactionHash }

// Add labels to existing NFT
await client.nfts.addLabels(collection.contractAddress, nft.tokenId, ['featured']);
```

**React hook:**

```tsx
function NFTMinter() {
  const { createCollection, mint, addLabels, isLoading, error } = useNFTs();
}
```

---

## Contracts (Smart Contract Records)

Deploy contracts from schema definitions and store records onchain.

```typescript
// Deploy a contract
const contract = await client.contracts.deploy(schemaDefinition, '0xOwner');

// Create a record
const record = await client.contracts.createRecord(contract.contractAddress, {
  name: 'Alice',
  score: 100,
});

// Get a record
const r = await client.contracts.getRecord(contract.contractAddress, record.id);

// Get contract schema
const schema = await client.contracts.getSchema(contract.contractAddress);
```

---

## Storage (Raw EigenDA Blobs)

Low-level blob storage on EigenDA.

```typescript
// Upload raw bytes
const result = await client.storage.upload(
  new Uint8Array([1, 2, 3]),
  'application/octet-stream'
);
// result: { blobId, commitment, dataHash, size }

// Download
const data = await client.storage.get(result.blobId);

// Verify integrity
const valid = await client.storage.verify(result.blobId, result.commitment, result.dataHash);

// Get metadata
const meta = await client.storage.getMetadata(result.blobId);
```

---

## Query

GraphQL and paginated queries over contract data.

```typescript
// GraphQL query
const result = await client.query.graphql<{ users: User[] }>(
  '{ users { id name } }'
);

// Paginated records
const page = await client.query.getRecords(contractAddress, {
  limit: 10,
  offset: 0,
  orderBy: 'createdAt',
  orderDirection: 'desc',
});
// page: { items, total, limit, offset }
```

---

## React Hooks Summary

| Hook | Description |
|------|-------------|
| `useAuth()` | Authentication state + `login`, `register`, `logout` |
| `useSchemas()` | Schema CRUD + `collection(name)` for document ops |
| `useBlobs()` | File upload/download/verify via EigenDA |
| `useEvents()` | Event creation + NFT minting |
| `useTokens()` | ERC-20 deploy/mint/history |
| `useNFTs()` | ERC-721 collection/mint/labels |
| `useContracts()` | Smart contract deploy/records |
| `useStorage()` | Raw blob storage |
| `useQuery()` | GraphQL + paginated queries |

All hooks must be used inside `<StarkbaseProvider>`.

---

## Full Example

```tsx
import {
  StarkbaseProvider,
  useAuth,
  useSchemas,
  useBlobs,
  useEvents,
  useTokens,
} from '@starkbase/sdk';

function App() {
  return (
    <StarkbaseProvider
      apiUrl="https://starknet.philotheephilix.in"
      platformId="your-platform-id"
      apiKey="sb_your_api_key"
    >
      <Dashboard />
    </StarkbaseProvider>
  );
}

function Dashboard() {
  const { user, isAuthenticated, login } = useAuth();
  const { listSchemas, createSchema, collection } = useSchemas();
  const { upload, list: listBlobs } = useBlobs();
  const { createEvent, mint: mintNFT } = useEvents();
  const { deploy: deployToken, mint: mintToken } = useTokens();

  if (!isAuthenticated) {
    return (
      <button onClick={() => login({ username: 'admin', password: 'pass' })}>
        Login
      </button>
    );
  }

  return <div>Welcome, {user?.username}!</div>;
}
```

## License

MIT
