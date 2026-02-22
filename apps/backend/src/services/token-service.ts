import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CallData, uint256 } from 'starknet';
import type Database from 'better-sqlite3';
import type { WalletService } from './wallet-service';

const TOKEN_SIERRA_PATH = path.resolve(
  __dirname,
  '../../../../contracts/artifacts/MyToken.json'
);
const TOKEN_CASM_PATH = path.resolve(
  __dirname,
  '../../../../contracts/token/target/dev/contracts_MyToken.compiled_contract_class.json'
);

export type DeployTokenResult = {
  contractAddress: string;
  txHash: string;
  name: string;
  symbol: string;
  initialSupply: string;
  recipientAddress: string;
};

export type MintTokenResult = {
  txHash: string;
  recipient: string;
  amount: string;
};

export class TokenService {
  constructor(private db: Database.Database, private walletSvc: WalletService) {}

  /** Declare + deploy the MyToken ERC-20 contract. */
  async deployToken(
    name: string,
    symbol: string,
    initialSupply: string,
    recipientAddress: string,
    platformId: string
  ): Promise<DeployTokenResult> {
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
    });

    const result = await deployer.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata,
    });

    const contractAddress = result.deploy.address;
    const txHash = result.deploy.transaction_hash;

    this.db.prepare(
      `INSERT OR IGNORE INTO deployed_tokens
         (id, contract_address, name, symbol, initial_supply, recipient_address, tx_hash, platform_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), contractAddress, name, symbol, initialSupply, recipientAddress, txHash, platformId);

    return { contractAddress, txHash, name, symbol, initialSupply, recipientAddress };
  }

  /** Call mint on a deployed MyToken contract. */
  async mintToken(
    contractAddress: string,
    recipient: string,
    amount: string
  ): Promise<MintTokenResult> {
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

  /** List all tokens deployed by this backend, optionally filtered by platform. */
  listDeployedTokens(platformId?: string): unknown[] {
    if (platformId) {
      return this.db
        .prepare('SELECT * FROM deployed_tokens WHERE platform_id = ? ORDER BY deployed_at DESC')
        .all(platformId) as unknown[];
    }
    return this.db
      .prepare('SELECT * FROM deployed_tokens ORDER BY deployed_at DESC')
      .all() as unknown[];
  }
}
