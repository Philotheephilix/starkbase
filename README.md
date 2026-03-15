# Starkbase

https://www.npmjs.com/package/@starkbase/sdk
https://www.npmjs.com/package/@starkbase/types

**Decentralized Backend-as-a-Service for Starknet** — Build full-stack dApps without writing Cairo.

> Firebase/Supabase equivalent for Starknet. One SDK. Auth, storage, tokens, NFTs, events — all wired to Starknet with zero blockchain UX friction.

**Live:** [starkbase.vercel.app](https://starkbase.vercel.app) | **API:** [starknet.philotheephilix.in](https://starknet.philotheephilix.in) | **Network:** Starknet Sepolia

---

## The Problem

Building on Starknet today means:
- Learning Cairo from scratch
- Managing wallets, seed phrases, browser extensions, and gas funding
- Juggling expensive onchain storage vs. unverifiable offchain storage
- No unified backend infrastructure — you wire everything yourself

**Starkbase eliminates all of this.** Developers get a single SDK that handles auth, data, files, tokens, and NFTs with automatic Starknet wallet management under the hood.

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Your App (React / Node / Any JS)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  @starkbase/sdk                                    │  │
│  │  useAuth() · useSchemas() · useTokens() · ...      │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │ REST API
┌───────────────────────▼──────────────────────────────────┐
│  Starkbase Backend (Fastify + SQLite)                    │
│  Auth · Schemas · Blobs · Tokens · NFTs · Events         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   EigenDA    │  │   Starknet   │  │  SQLite (WAL) │  │
│  │  Blob Store  │  │  Contracts   │  │   Metadata    │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Hybrid Storage Model:** Offchain data lives on EigenDA (decentralized data availability), while cryptographic commitments are anchored onchain via the StarkbaseRegistry contract. This gives you the cost of offchain storage with the trust of onchain verification.

---

## Use Cases

### 1. Authentication & Wallet Abstraction

Users register with a username and password. Behind the scenes, Starkbase deterministically derives a Starknet wallet (HMAC-SHA256), deploys an OpenZeppelin Account contract, and funds it — all invisible to the user.

```ts
const client = new StarkbaseClient({ baseUrl, platformId });
await client.auth.register("alice", "password123");
// → Wallet derived, funded, deployed on Starknet. JWT returned.
```

**No seed phrases. No MetaMask. No gas management.** Users get a real Starknet wallet without knowing it exists.

**Real-world use cases:**
- **Mobile apps** — onboard users with email/password, give them a wallet silently
- **Gaming** — players get wallets on signup, ready to earn and trade assets
- **Enterprise SaaS** — employees interact with blockchain without any crypto knowledge
- **Social platforms** — every user is wallet-ready for tipping, collecting, and trading

---

### 2. Schema-Based Document Store

Define typed collections, store documents with full CRUD and versioning, and optionally anchor schema commitments onchain for tamper-proof verification.

```ts
await client.schemas.create("profiles", [
  { name: "displayName", type: "string" },
  { name: "score", type: "number" },
]);

await client.schemas.createDocument("profiles", {
  displayName: "Alice",
  score: 42,
});
```

Documents are versioned with soft-delete support. Query them with filters. Anchor schemas onchain when you need external verifiability.

**Real-world use cases:**
- **Leaderboards & game state** — store player stats, rankings, and match history with onchain proof
- **Healthcare records** — tamper-proof patient data with verifiable schema commitments
- **Supply chain tracking** — log product journey from manufacturer to consumer with versioned records
- **Legal & compliance** — store audit trails and compliance documents with onchain anchoring for dispute resolution
- **CMS for dApps** — manage blog posts, product listings, or user profiles with typed schemas

---

### 3. Blob File Storage (EigenDA)

Upload files to EigenDA with automatic SHA-256 commitment computation. Optionally make blobs immutable by anchoring their commitment onchain.

```ts
await client.blobs.upload(file);
// → Stored on EigenDA, commitment computed, metadata tracked
```

Once anchored onchain, anyone can independently verify a file's integrity against its onchain commitment — no trust in the backend required.

**Real-world use cases:**
- **Media platforms** — store images, videos, and audio with tamper-proof integrity
- **Legal evidence** — anchor documents, contracts, and signatures with verifiable timestamps
- **Academic publishing** — publish research papers with immutable proof of authorship and date
- **Insurance claims** — upload damage photos and reports with onchain proof they haven't been altered
- **NFT metadata storage** — host NFT images and metadata on decentralized storage instead of centralized servers

---

### 4. ERC-20 Token Deployment

Deploy fungible tokens on Starknet in one call. The deploying user becomes the owner with minting rights.

```ts
await client.tokens.deploy("GameCoin", "GMC", 1000000);
await client.tokens.mint(contractAddress, recipientAddress, 500);
```

**BTC-Backed Stablecoin Staking:** Tokens deployed through Starkbase can be backed by BTC as a stablecoin, enabling true onchain staking. By pegging token value to BTC reserves, projects can offer decentralized staking mechanisms where participants lock BTC-backed tokens into Starknet smart contracts and earn yield — all verifiable onchain. This bridges Bitcoin's store-of-value with Starknet's programmability, creating a trust-minimized staking layer.

**Real-world use cases:**
- **In-game currencies** — deploy game coins players earn, spend, and trade across your ecosystem
- **Loyalty & rewards programs** — issue redeemable reward tokens for e-commerce, restaurants, or airlines
- **DAO governance** — launch governance tokens for community voting and treasury management
- **Creator economies** — let creators issue their own tokens for fan engagement and monetization
- **DeFi primitives** — deploy stablecoins, yield-bearing tokens, or liquidity pool tokens

---

### 5. NFT Collection Deployment (ERC-721)

Deploy full NFT collections with metadata and mint to any address.

```ts
await client.nfts.deploy("CoolArt", "CART");
await client.nfts.mint(contractAddress, recipientAddress, tokenURI, "Piece #1");
```

**Real-world use cases:**
- **Gaming leagues & ranks** — mint NFTs as league badges (Bronze, Silver, Gold, Diamond) that players earn by climbing ranks; each league NFT unlocks exclusive game modes, tournaments, and rewards
- **Subscription management** — issue NFTs as subscription passes for apps, SaaS products, or content platforms; token ownership = active subscription, with expiry and renewal logic onchain
- **Digital collectibles** — art, music, and media collections with provable scarcity
- **Real estate & property deeds** — tokenize property ownership with verifiable transfer history
- **Certification & credentials** — issue diplomas, professional certifications, and course completion badges as non-transferable NFTs
- **Membership & access passes** — exclusive club memberships, VIP passes, and gated community access tied to NFT ownership
- **Ticketing** — concert, sports, and festival tickets as NFTs with built-in anti-scalping and resale royalties

---

### 6. Proof-of-Attendance Events

Create events and mint attendance NFTs to participants. Each event deploys its own ERC-721 contract with immutable event metadata (name, description, image, max supply).

```ts
await client.events.create({
  name: "ETH Denver 2026",
  description: "Builder meetup",
  imageUrl: "https://...",
  maxSupply: 500,
});
await client.events.mint(eventId, recipientAddress);
```

**Real-world use cases:**
- **Hackathons & conferences** — mint attendance badges that live forever in participants' wallets
- **Online courses & workshops** — issue completion certificates as onchain proof of learning
- **Community meetups** — build reputation systems where attendance history is verifiable onchain
- **Corporate training** — track employee training completion with immutable records
- **Sports events & marathons** — finisher medals as NFTs with event metadata (time, distance, placement)
- **Airdrop eligibility** — use attendance NFTs as qualification criteria for future token airdrops

---

### 7. Multi-Tenant Platforms

Create isolated platforms with unique API keys. Each platform has its own users, schemas, data, and contracts — ideal for SaaS products building on Starknet.

```ts
const platform = await client.platforms.create("my-app", ownerWallet);
// → Isolated environment with its own API key
```

**Real-world use cases:**
- **White-label BaaS** — resell Starkbase as a branded backend to your own customers
- **Game studios** — spin up isolated backends per game title, each with its own tokens and NFTs
- **Agency model** — manage multiple client dApps from a single Starkbase deployment
- **Enterprise departments** — give each team or business unit its own isolated blockchain environment
- **Marketplace platforms** — each vendor gets their own platform with independent user base and contracts

---

## Why the SDK Matters

Without Starkbase, building a Starknet dApp means:

| Task | Without Starkbase | With Starkbase SDK |
|------|-------------------|-------------------|
| User onboarding | Wallet setup, funding, seed phrases | `client.auth.register()` |
| Data storage | Write Cairo, manage calldata | `client.schemas.createDocument()` |
| File storage | Roll your own infra | `client.blobs.upload()` |
| Token launch | Write & deploy Cairo ERC-20 | `client.tokens.deploy()` |
| NFT collection | Write & deploy Cairo ERC-721 | `client.nfts.deploy()` |
| Event ticketing | Build from scratch | `client.events.create()` |
| Multi-tenancy | Architect from scratch | `client.platforms.create()` |

**The SDK compresses weeks of blockchain engineering into single function calls.** It ships as `@starkbase/sdk` on npm with both vanilla TypeScript and React hooks (`useAuth`, `useSchemas`, `useTokens`, `useEvents`, etc.).

---

## BTC-Backed Onchain Staking

Starkbase's token infrastructure supports a BTC-backed stablecoin model for true onchain staking:

1. **Token Creation** — Deploy an ERC-20 on Starknet via `client.tokens.deploy()`
2. **BTC Backing** — Peg token supply to BTC reserves, creating a stable-value asset
3. **Onchain Staking** — Users lock BTC-backed tokens into staking contracts on Starknet
4. **Verifiable Yield** — Staking rewards are computed and distributed onchain, fully auditable
5. **Commitment Anchoring** — Reserve proofs are anchored via StarkbaseRegistry for transparency

This unlocks Bitcoin liquidity for Starknet DeFi without custodial bridges. BTC holders get programmable staking; Starknet gets deep liquidity and a trust-minimized stable asset.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Cairo + OpenZeppelin |
| Backend | Fastify, TypeScript, SQLite (WAL mode) |
| Blockchain | Starknet Sepolia, starknet.js v8 |
| Data Availability | EigenDA |
| Frontend | React 18, Vite, TailwindCSS v4, Radix-UI |
| SDK | TypeScript, React Hooks, Axios |
| Auth | JWT + bcrypt + HMAC-SHA256 wallet derivation |
| Build | pnpm workspaces, Turborepo, tsup |

---

## Quick Start

```bash
# Install the SDK
npm install @starkbase/sdk
```

```ts
import { StarkbaseClient } from "@starkbase/sdk";

const client = new StarkbaseClient({
  baseUrl: "https://starknet.philotheephilix.in",
  platformId: "your-platform-id",
});

// Register a user (auto-deploys Starknet wallet)
await client.auth.register("username", "password");

// Create a schema and store data
await client.schemas.create("todos", [
  { name: "title", type: "string" },
  { name: "done", type: "boolean" },
]);

// Deploy a token
await client.tokens.deploy("MyToken", "MTK", 1000000);
```

---

## Smart Contracts

| Contract | Description | Deployment |
|----------|-------------|------------|
| **StarkbaseRegistry** | Commitment anchoring & verification | Starknet Sepolia |
| **EventNFT** | Proof-of-attendance ERC-721 | Deployed per event |
| **MyToken** | ERC-20 with owner minting | Deployed per token |

---

## Project Structure

```
starkbase/
├── apps/
│   ├── backend/        # Fastify API server
│   └── web/            # React console dashboard
├── contracts/
│   ├── src/            # StarkbaseRegistry (Cairo)
│   ├── nft/            # EventNFT contract
│   └── token/          # ERC-20 contract
└── packages/
    ├── sdk/            # @starkbase/sdk (npm)
    └── types/          # Shared TypeScript types
```

---

## License

MIT
