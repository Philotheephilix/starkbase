/**
 * Deploy the StarkbaseRegistry contract to Starknet.
 *
 * Usage (from apps/backend/):
 *   node_modules/.bin/tsx scripts/deploy-registry.ts
 *
 * On success, prints the contract address. Add it to .env:
 *   BLOB_REGISTRY_CONTRACT=<address>
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { RpcProvider, Account } from 'starknet';

const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC_URL = process.env.STARKNET_RPC_URL ?? 'https://starknet-sepolia.public.blastapi.io';

if (!DEPLOYER_ADDRESS || !DEPLOYER_PRIVATE_KEY) {
  console.error('ERROR: DEPLOYER_ADDRESS and DEPLOYER_PRIVATE_KEY must be set in .env');
  process.exit(1);
}

const ARTIFACT_PATH = path.resolve(__dirname, '../../../contracts/target/dev/starkbase_registry_StarkbaseRegistry.contract_class.json');
const CASM_PATH = path.resolve(__dirname, '../../../contracts/target/dev/starkbase_registry_StarkbaseRegistry.compiled_contract_class.json');

async function main() {
  console.log('RPC:', RPC_URL);
  console.log('Deployer:', DEPLOYER_ADDRESS);

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const deployer = new Account({ provider, address: DEPLOYER_ADDRESS!, signer: DEPLOYER_PRIVATE_KEY! });

  const sierra = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
  const casm = JSON.parse(readFileSync(CASM_PATH, 'utf8'));

  console.log('\nDeclaring and deploying StarkbaseRegistry...');
  const result = await deployer.declareAndDeploy({
    contract: sierra,
    casm,
    constructorCalldata: [],
  });

  const address = result.deploy.address;
  const txHash = result.deploy.transaction_hash;

  console.log('\n✓ Contract deployed successfully!');
  console.log('  Address :', address);
  console.log('  Tx hash :', txHash);
  console.log('\nAdd this to apps/backend/.env:');
  console.log(`  BLOB_REGISTRY_CONTRACT=${address}`);
}

main().catch((err) => {
  console.error('Deployment failed:', err.message ?? err);
  process.exit(1);
});
