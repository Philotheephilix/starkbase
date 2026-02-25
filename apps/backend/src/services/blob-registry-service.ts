import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CallData } from 'starknet';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';

// Path to the compiled Sierra artifact (committed alongside source)
const ARTIFACT_PATH = path.resolve(
  __dirname,
  '../../../../contracts/artifacts/StarkbaseRegistry.json'
);
const CASM_PATH = path.resolve(
  __dirname,
  '../../../../contracts/target/dev/starkbase_registry_StarkbaseRegistry.compiled_contract_class.json'
);

/** Derive a felt252-safe hex value from an arbitrary string.
 *  sha256(input) → first 31 bytes (248 bits) → always fits in felt252 (<2^251). */
export function toFelt252(input: string): string {
  return '0x' + crypto.createHash('sha256').update(input).digest('hex').slice(0, 62);
}

type EntryRow = {
  id: string;
  platform_key: string;
  commitment_key: string;
  platform_id: string;
  commitment: string;
  wallet_address: string;
  tx_hash: string | null;
  created_at: number;
};

type RichRow = {
  commitment_key: string;
  platform_id: string;
  commitment: string;
  wallet_address: string;
  tx_hash: string | null;
  created_at: number;
  blob_id: string | null;
  blob_data_hash: string | null;
  blob_size: number | null;
  blob_content_type: string | null;
  blob_uploaded_at: number | null;
};

export type PlatformCommitmentEntry = {
  commitmentKey: string;
  platformId: string;
  commitment: string | null;
  walletAddress: string | null;
  txHash: string | null;
  registeredAt: string | null;
  blob: {
    blobId: string;
    dataHash: string | null;
    size: number;
    contentType: string | undefined;
    uploadedAt: string;
  } | null;
};

export class BlobRegistryService {
  constructor(private db: Database.Database, private walletSvc: WalletService) {}

  /** Declare + deploy the StarkbaseRegistry contract.
   *  Returns the deployed contract address and the deploy tx hash. */
  async deployContract(): Promise<{ address: string; txHash: string }> {
    const sierra = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
    const casm = JSON.parse(readFileSync(CASM_PATH, 'utf8'));

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const result = await deployer.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata: [],
    });

    const address = result.deploy.address;
    const txHash = result.deploy.transaction_hash;

    return { address, txHash };
  }

  /** Call register_platform on the deployed contract. Returns the tx hash. */
  async registerPlatform(contractAddress: string, platformId: string): Promise<string> {
    const platformKey = toFelt252(platformId);
    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const { transaction_hash } = await deployer.execute({
      contractAddress,
      entrypoint: 'register_platform',
      calldata: CallData.compile({ platform_id: platformKey }),
    });
    await provider.waitForTransaction(transaction_hash);
    return transaction_hash;
  }

  /** Call create on the deployed contract and persist the entry to SQLite.
   *  Auto-registers the platform if it has not been registered yet. */
  async create(
    contractAddress: string,
    platformId: string,
    walletAddress: string,
    commitment: string
  ): Promise<string> {
    const platformKey = toFelt252(platformId);
    const commitmentKey = toFelt252(commitment);

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    // Auto-register the platform if it is not yet registered on-chain
    const isRegistered = await this.isPlatformRegistered(contractAddress, platformId);
    if (!isRegistered) {
      await this.registerPlatform(contractAddress, platformId);
    }

    const { transaction_hash } = await deployer.execute({
      contractAddress,
      entrypoint: 'create',
      calldata: CallData.compile({
        platform_id: platformKey,
        wallet_address: walletAddress,
        commitment: commitmentKey,
      }),
    });
    await provider.waitForTransaction(transaction_hash);

    // Persist to local DB for fast lookups
    this.db.prepare(
      `INSERT OR REPLACE INTO registry_entries
         (id, platform_key, commitment_key, platform_id, commitment, wallet_address, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      platformKey,
      commitmentKey,
      platformId,
      commitment,
      walletAddress,
      transaction_hash
    );

    return transaction_hash;
  }

  /** Call update on the deployed contract and update the SQLite entry. */
  async update(
    contractAddress: string,
    platformId: string,
    commitment: string,
    walletAddress: string
  ): Promise<string> {
    const platformKey = toFelt252(platformId);
    const commitmentKey = toFelt252(commitment);

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const { transaction_hash } = await deployer.execute({
      contractAddress,
      entrypoint: 'update',
      calldata: CallData.compile({
        platform_id: platformKey,
        commitment: commitmentKey,
        wallet_address: walletAddress,
      }),
    });
    await provider.waitForTransaction(transaction_hash);

    this.db.prepare(
      `UPDATE registry_entries SET wallet_address = ?, tx_hash = ?
       WHERE platform_key = ? AND commitment_key = ?`
    ).run(walletAddress, transaction_hash, platformKey, commitmentKey);

    return transaction_hash;
  }

  /** Call fetch (read-only). Returns the wallet address stored on-chain.
   *  Throws if the platform is not registered (contract reverts). */
  async fetch(
    contractAddress: string,
    platformId: string,
    commitment: string
  ): Promise<string> {
    const platformKey = toFelt252(platformId);
    const commitmentKey = toFelt252(commitment);

    const provider = this.walletSvc.getProvider();

    const result = await provider.callContract({
      contractAddress,
      entrypoint: 'fetch',
      calldata: CallData.compile({
        platform_id: platformKey,
        commitment: commitmentKey,
      }),
    });

    // result is an array of felt252 hex strings; ContractAddress is one felt252
    return result[0] ?? '0x0';
  }

  /** Check on-chain whether a platform is registered (read-only). */
  async isPlatformRegistered(contractAddress: string, platformId: string): Promise<boolean> {
    const platformKey = toFelt252(platformId);
    const provider = this.walletSvc.getProvider();

    const result = await provider.callContract({
      contractAddress,
      entrypoint: 'is_registered',
      calldata: CallData.compile({ platform_id: platformKey }),
    });
    // bool is returned as 0x0 or 0x1
    return result[0] !== '0x0';
  }

  /** Look up a registry entry from the local SQLite cache. */
  getLocalEntry(platformId: string, commitment: string): EntryRow | undefined {
    const platformKey = toFelt252(platformId);
    const commitmentKey = toFelt252(commitment);
    return this.db
      .prepare('SELECT * FROM registry_entries WHERE platform_key = ? AND commitment_key = ?')
      .get(platformKey, commitmentKey) as EntryRow | undefined;
  }

  /** Call get_commitments on-chain, then enrich each entry from SQLite.
   *
   *  Flow:
   *    1. callContract get_commitments → array of commitment_key felt252 values
   *    2. For each key, join registry_entries → blobs to get full metadata
   *    3. Return merged list
   */
  async getPlatformCommitments(
    contractAddress: string,
    platformId: string
  ): Promise<PlatformCommitmentEntry[]> {
    const platformKey = toFelt252(platformId);
    const provider = this.walletSvc.getProvider();

    // On-chain call: returns [len, key0, key1, ...]
    const raw = await provider.callContract({
      contractAddress,
      entrypoint: 'get_commitments',
      calldata: CallData.compile({ platform_id: platformKey }),
    });

    // Parse Cairo Array<felt252>: first element is the length
    const len = Number(BigInt(raw[0] ?? '0x0'));
    const onChainKeys = raw.slice(1, 1 + len);  // felt252 hex strings

    if (onChainKeys.length === 0) return [];

    // Enrich each key from SQLite
    const placeholders = onChainKeys.map(() => '?').join(', ');
    const rows = this.db.prepare(
      `SELECT
         r.commitment_key,
         r.platform_id,
         r.commitment,
         r.wallet_address,
         r.tx_hash,
         r.created_at,
         b.id        AS blob_id,
         b.data_hash AS blob_data_hash,
         b.size      AS blob_size,
         b.content_type AS blob_content_type,
         b.uploaded_at  AS blob_uploaded_at
       FROM registry_entries r
       LEFT JOIN blobs b ON b.commitment = r.commitment
       WHERE r.platform_key = ? AND r.commitment_key IN (${placeholders})`
    ).all(platformKey, ...onChainKeys) as RichRow[];

    // Build a lookup map for ordering by on-chain insertion order
    const byKey = new Map(rows.map(r => [r.commitment_key, r]));

    return onChainKeys.map(key => {
      const row = byKey.get(key);
      return {
        commitmentKey: key,
        platformId: row?.platform_id ?? platformId,
        commitment: row?.commitment ?? null,
        walletAddress: row?.wallet_address ?? null,
        txHash: row?.tx_hash ?? null,
        registeredAt: row ? new Date(row.created_at * 1000).toISOString() : null,
        blob: row?.blob_id ? {
          blobId: row.blob_id,
          dataHash: row.blob_data_hash,
          size: row.blob_size ?? 0,
          contentType: row.blob_content_type ?? undefined,
          uploadedAt: new Date((row.blob_uploaded_at ?? 0) * 1000).toISOString(),
        } : null,
      };
    });
  }
}
