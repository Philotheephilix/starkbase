import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CallData } from 'starknet';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';

const NFT_SIERRA_PATH = path.resolve(
  __dirname,
  '../../../../contracts/artifacts/YourCollectible.json'
);
const NFT_CASM_PATH = path.resolve(
  __dirname,
  '../../../../contracts/nft/target/dev/contracts_YourCollectible.compiled_contract_class.json'
);

export type DeployNftResult = {
  contractAddress: string;
  txHash: string;
  name: string;
  symbol: string;
  baseUri: string;
  ownerAddress: string;
};

export type MintNftResult = {
  txHash: string;
  recipient: string;
  uri: string;
};

export class NFTService {
  constructor(private db: Database.Database, private walletSvc: WalletService) {}

  /** Declare + deploy the YourCollectible ERC-721 contract. */
  async deployNft(
    name: string,
    symbol: string,
    baseUri: string,
    ownerAddress: string,
    platformId: string
  ): Promise<DeployNftResult> {
    const sierra = JSON.parse(readFileSync(NFT_SIERRA_PATH, 'utf8'));
    const casm = JSON.parse(readFileSync(NFT_CASM_PATH, 'utf8'));

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const myCallData = new CallData(sierra.abi);
    const constructorCalldata = myCallData.compile('constructor', {
      name,
      symbol,
      base_uri: baseUri,
      owner: ownerAddress,
    });

    const result = await deployer.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata,
    });

    const contractAddress = result.deploy.address;
    const txHash = result.deploy.transaction_hash;

    this.db.prepare(
      `INSERT OR IGNORE INTO deployed_nfts
         (id, contract_address, name, symbol, base_uri, owner_address, tx_hash, platform_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), contractAddress, name, symbol, baseUri, ownerAddress, txHash, platformId);

    return { contractAddress, txHash, name, symbol, baseUri, ownerAddress };
  }

  /** Call mint_item on a deployed YourCollectible contract. */
  async mintNft(
    contractAddress: string,
    recipient: string,
    uri: string
  ): Promise<MintNftResult> {
    const sierra = JSON.parse(readFileSync(NFT_SIERRA_PATH, 'utf8'));
    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const myCallData = new CallData(sierra.abi);
    const calldata = myCallData.compile('mint_item', { recipient, uri });

    const { transaction_hash } = await deployer.execute({
      contractAddress,
      entrypoint: 'mint_item',
      calldata,
    });
    await provider.waitForTransaction(transaction_hash);

    return { txHash: transaction_hash, recipient, uri };
  }

  /** List all NFT collections deployed by this backend, optionally filtered by platform. */
  listDeployedNfts(platformId?: string): unknown[] {
    if (platformId) {
      return this.db
        .prepare('SELECT * FROM deployed_nfts WHERE platform_id = ? ORDER BY deployed_at DESC')
        .all(platformId) as unknown[];
    }
    return this.db
      .prepare('SELECT * FROM deployed_nfts ORDER BY deployed_at DESC')
      .all() as unknown[];
  }
}
