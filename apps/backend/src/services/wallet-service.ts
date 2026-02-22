import { createHmac } from 'crypto';
import { ec, hash, CallData, RpcProvider, Account, cairo } from 'starknet';

// OZ Account v0.8.1 — already declared on Starknet Sepolia
const OZ_ACCOUNT_CLASS_HASH =
  '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';

// STRK token on Starknet Sepolia
const STRK_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// 2 STRK in fri (1 STRK = 1e18 fri) — enough for one account deployment on Sepolia
const DEPLOY_GAS_AMOUNT = BigInt('2000000000000000000');

const DEFAULT_RPC = 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/oJTjnNCsJEOqYv3MMtrtT6LUFhwcW9pR';

export interface DeployResult {
  address: string;
  transactionHash: string;
}

export class WalletService {
  constructor(private masterSecret: string) {}

  derivePrivateKey(platformId: string, username: string): string {
    const hmac = createHmac('sha256', this.masterSecret)
      .update(`${platformId}:${username}`)
      .digest('hex');
    const raw = ec.starkCurve.grindKey(hmac);
    // grindKey returns a bare hex string in starknet v6; normalise to 0x-prefix
    return raw.startsWith('0x') ? raw : `0x${raw}`;
  }

  computeAddress(privateKey: string): string {
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    const constructorCalldata = CallData.compile({ publicKey });
    return hash.calculateContractAddressFromHash(
      publicKey,
      OZ_ACCOUNT_CLASS_HASH,
      constructorCalldata,
      0
    );
  }

  getProvider(): RpcProvider {
    // blockIdentifier: 'latest' — some RPCs (Alchemy) don't support 'pending' for getNonce
    return new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL ?? DEFAULT_RPC, blockIdentifier: 'latest' });
  }

  getDeployer(provider: RpcProvider): Account {
    const address = process.env.DEPLOYER_ADDRESS;
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!address || !privateKey) {
      throw new Error(
        'DEPLOYER_ADDRESS and DEPLOYER_PRIVATE_KEY env vars must be set before deploying wallets'
      );
    }
    return new Account({ provider, address, signer: privateKey });
  }

  async deployAccount(
    privateKey: string,
    provider: RpcProvider,
    deployerAccount: Account
  ): Promise<DeployResult> {
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    const constructorCalldata = CallData.compile({ publicKey });
    const accountAddress = this.computeAddress(privateKey);

    // 1. Fund the new account address with STRK so it can pay for its own deployment
    //    Account v8 defaults to V3 transactions (STRK fee payment)
    const { transaction_hash: fundTxHash } = await deployerAccount.execute({
      contractAddress: STRK_ADDRESS,
      entrypoint: 'transfer',
      calldata: CallData.compile({
        recipient: accountAddress,
        amount: cairo.uint256(DEPLOY_GAS_AMOUNT),
      }),
    });
    await provider.waitForTransaction(fundTxHash);

    // 2. Deploy the account from its own address
    const newAccount = new Account({ provider, address: accountAddress, signer: privateKey });
    const { transaction_hash: deployTxHash } = await newAccount.deployAccount({
      classHash: OZ_ACCOUNT_CLASS_HASH,
      constructorCalldata,
      addressSalt: publicKey,
    });
    await provider.waitForTransaction(deployTxHash);

    return { address: accountAddress, transactionHash: deployTxHash };
  }
}
