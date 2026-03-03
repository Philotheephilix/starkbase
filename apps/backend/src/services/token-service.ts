import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CallData, uint256, hash } from 'starknet';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';
import type { CreatedToken, MintTokenResponse, TokenMintEvent } from '@starkbase/types';

const TOKEN_SIERRA_PATH = path.resolve(
  __dirname,
  '../../../../contracts/artifacts/MyToken.json'
);
const TOKEN_CASM_PATH = path.resolve(
  __dirname,
  '../../../../contracts/token/target/dev/contracts_MyToken.compiled_contract_class.json'
);

type TokenRow = {
  id: string;
  contract_address: string;
  name: string;
  symbol: string;
  initial_supply: string;
  recipient_address: string;
  tx_hash: string;
  platform_id: string;
  creator_wallet: string;
  deployed_at: number;
};

function rowToToken(row: TokenRow): CreatedToken {
  return {
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    initialSupply: row.initial_supply,
    platformId: row.platform_id,
    creatorWallet: row.creator_wallet,
    transactionHash: row.tx_hash,
  };
}

export class TokenService {
  constructor(private db: Database.Database, private walletSvc: WalletService) {}

  async deployToken(
    name: string,
    symbol: string,
    initialSupply: string,
    recipientAddress: string,
    platformId: string,
    creatorWallet: string
  ): Promise<CreatedToken> {
    const sierra = JSON.parse(readFileSync(TOKEN_SIERRA_PATH, 'utf8'));
    const casm = JSON.parse(readFileSync(TOKEN_CASM_PATH, 'utf8'));

    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const supplyU256 = uint256.bnToUint256(BigInt(initialSupply));

    const myCallData = new CallData(sierra.abi);
    const constructorCalldata = myCallData.compile('constructor', {
      name,
      symbol,
      initial_supply: supplyU256,
      recipient: recipientAddress,
      owner: deployer.address,
    });

    const result = await deployer.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata,
    });

    const contractAddress = result.deploy.address;
    const txHash = result.deploy.transaction_hash;

    try {
      this.db.prepare(
        `INSERT INTO deployed_tokens
           (id, contract_address, name, symbol, initial_supply, recipient_address, tx_hash, platform_id, creator_wallet)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(crypto.randomUUID(), contractAddress, name, symbol, initialSupply, recipientAddress, txHash, platformId, creatorWallet);
    } catch {
      throw Object.assign(
        new Error(`Token contract '${contractAddress}' already exists`),
        { statusCode: 409 }
      );
    }

    return rowToToken(
      this.db.prepare('SELECT * FROM deployed_tokens WHERE contract_address = ?')
        .get(contractAddress) as TokenRow
    );
  }

  async mintToken(
    contractAddress: string,
    platformId: string,
    callerWallet: string,
    recipient: string,
    amount: string
  ): Promise<MintTokenResponse> {
    const row = this.db.prepare(
      'SELECT * FROM deployed_tokens WHERE contract_address = ? AND platform_id = ?'
    ).get(contractAddress, platformId) as TokenRow | undefined;

    if (!row) {
      throw Object.assign(
        new Error(`Token '${contractAddress}' not found`),
        { statusCode: 404 }
      );
    }

    if (row.creator_wallet.toLowerCase() !== callerWallet.toLowerCase()) {
      throw Object.assign(
        new Error('Only the token creator can mint tokens for this contract'),
        { statusCode: 403 }
      );
    }

    const sierra = JSON.parse(readFileSync(TOKEN_SIERRA_PATH, 'utf8'));
    const provider = this.walletSvc.getProvider();
    const deployer = this.walletSvc.getDeployer(provider);

    const amountU256 = uint256.bnToUint256(BigInt(amount));
    const myCallData = new CallData(sierra.abi);
    const calldata = myCallData.compile('mint', { to: recipient, amount: amountU256 });

    const { transaction_hash } = await deployer.execute({
      contractAddress,
      entrypoint: 'mint',
      calldata,
    });
    await provider.waitForTransaction(transaction_hash);

    return { txHash: transaction_hash, recipient, amount };
  }

  listTokens(platformId: string): CreatedToken[] {
    const rows = this.db.prepare(
      'SELECT * FROM deployed_tokens WHERE platform_id = ? ORDER BY deployed_at DESC'
    ).all(platformId) as TokenRow[];
    return rows.map(rowToToken);
  }

  async getMintHistory(contractAddress: string): Promise<TokenMintEvent[]> {
    const provider = this.walletSvc.getProvider();
    const TRANSFER_KEY = hash.getSelectorFromName('Transfer');

    const result = await provider.getEvents({
      address: contractAddress,
      keys: [[TRANSFER_KEY], ['0x0']], // Transfer from zero address = mint
      from_block: { block_number: 0 },
      to_block: 'latest',
      chunk_size: 100,
    });

    return result.events
      .map((e: any) => ({
        txHash: e.transaction_hash,
        recipient: e.keys[2],
        amount: uint256.uint256ToBN({ low: e.data[0], high: e.data[1] }).toString(),
        blockNumber: e.block_number,
      }))
      .reverse(); // newest first
  }
}
