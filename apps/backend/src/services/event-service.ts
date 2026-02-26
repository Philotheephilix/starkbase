import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CallData } from 'starknet';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';

const EVENT_SIERRA_PATH = path.resolve(
  __dirname,
  '../../../../contracts/artifacts/EventNFT.json'
);
const EVENT_CASM_PATH = path.resolve(
  __dirname,
  '../../../../contracts/nft/target/dev/contracts_EventNFT.compiled_contract_class.json'
);

export interface EventRecord {
  id: string;
  platformId: string;
  name: string;
  description: string;
  imageUrl: string;
  maxSupply: number;
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

type EventRow = {
  id: string;
  platform_id: string;
  name: string;
  description: string;
  image_url: string;
  max_supply: number;
  contract_address: string;
  tx_hash: string;
  creator_wallet: string;
  deployed_at: number;
  mint_count?: number;
};

type MintRow = {
  id: string;
  event_id: string;
  token_id: string;
  recipient: string;
  tx_hash: string | null;
  minted_at: number;
};

function rowToRecord(row: EventRow): EventRecord {
  return {
    id: row.id,
    platformId: row.platform_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    maxSupply: row.max_supply,
    contractAddress: row.contract_address,
    txHash: row.tx_hash,
    creatorWallet: row.creator_wallet,
    deployedAt: new Date(row.deployed_at * 1000).toISOString(),
    mintCount: row.mint_count,
  };
}

function mintRowToMint(row: MintRow): EventMint {
  return {
    id: row.id,
    eventId: row.event_id,
    tokenId: row.token_id,
    recipient: row.recipient,
    txHash: row.tx_hash ?? '',
    mintedAt: new Date(row.minted_at * 1000).toISOString(),
  };
}

export class EventService {
  constructor(
    private db: Database.Database,
    private walletSvc: WalletService
  ) {}

  async createEvent(
    platformId: string,
    name: string,
    description: string,
    imageUrl: string,
    maxSupply: number,
    creatorWallet: string
  ): Promise<EventRecord> {
    const id = crypto.randomUUID();
    const baseUrl = process.env.EVENT_NFT_BASE_URL ?? 'http://localhost:8080';
    const baseUri = `${baseUrl}/events/${id}/tokens/`;

    const sierra = JSON.parse(readFileSync(EVENT_SIERRA_PATH, 'utf8'));
    const casm = JSON.parse(readFileSync(EVENT_CASM_PATH, 'utf8'));

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const callData = new CallData(sierra.abi);
    const constructorCalldata = callData.compile('constructor', {
      event_name: name,
      event_symbol: 'EVT',
      event_description: description,
      image_url: imageUrl,
      max_supply: BigInt(maxSupply),
      base_uri: baseUri,
      owner: deployer.address,
      platform_creator: creatorWallet,
    });

    const result = await deployer.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata,
    });

    const contractAddress = result.deploy.address;
    const txHash = result.deploy.transaction_hash;

    this.db.prepare(
      `INSERT INTO events
         (id, platform_id, name, description, image_url, max_supply, contract_address, tx_hash, creator_wallet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, platformId, name, description, imageUrl, maxSupply, contractAddress, txHash, creatorWallet);

    return rowToRecord(
      this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow
    );
  }

  listEvents(platformId: string): EventRecord[] {
    const rows = this.db.prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_mints WHERE event_id = e.id) as mint_count
       FROM events e
       WHERE e.platform_id = ?
       ORDER BY e.deployed_at DESC`
    ).all(platformId) as EventRow[];
    return rows.map(rowToRecord);
  }

  getEvent(id: string, platformId: string): EventRecord {
    const row = this.db.prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_mints WHERE event_id = e.id) as mint_count
       FROM events e WHERE e.id = ? AND e.platform_id = ?`
    ).get(id, platformId) as EventRow | undefined;
    if (!row) {
      throw Object.assign(new Error(`Event '${id}' not found`), { statusCode: 404 });
    }
    return rowToRecord(row);
  }

  async mintToUser(
    eventId: string,
    platformId: string,
    callerWallet: string,
    recipient: string
  ): Promise<EventMint> {
    const event = this.getEvent(eventId, platformId);

    if (event.creatorWallet.toLowerCase() !== callerWallet.toLowerCase()) {
      throw Object.assign(
        new Error('Only the event creator can mint NFTs for this event'),
        { statusCode: 403 }
      );
    }

    const sierra = JSON.parse(readFileSync(EVENT_SIERRA_PATH, 'utf8'));
    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const callData = new CallData(sierra.abi);
    const calldata = callData.compile('mint', { recipient });

    const { transaction_hash } = await deployer.execute({
      contractAddress: event.contractAddress,
      entrypoint: 'mint',
      calldata,
    });
    await provider.waitForTransaction(transaction_hash);

    // Read the current token ID from the counter (equals last minted token ID)
    const counterResult = await provider.callContract({
      contractAddress: event.contractAddress,
      entrypoint: 'current',
      calldata: [],
    });
    const tokenId = BigInt(counterResult[0]).toString();

    const id = crypto.randomUUID();
    this.db.prepare(
      `INSERT INTO event_mints (id, event_id, token_id, recipient, tx_hash)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, eventId, tokenId, recipient, transaction_hash);

    return mintRowToMint(
      this.db.prepare('SELECT * FROM event_mints WHERE id = ?').get(id) as MintRow
    );
  }

  listMints(eventId: string, platformId: string): EventMint[] {
    // Verify event belongs to platform first
    this.getEvent(eventId, platformId);
    const rows = this.db.prepare(
      'SELECT * FROM event_mints WHERE event_id = ? ORDER BY minted_at DESC'
    ).all(eventId) as MintRow[];
    return rows.map(mintRowToMint);
  }
}
