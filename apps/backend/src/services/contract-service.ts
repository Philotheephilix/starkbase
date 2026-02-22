import crypto from 'crypto';
import type {
  SchemaDefinition,
  StorageMode,
  DeployedContract,
  ContractRecord,
} from '@starkbase/types';

const CAIRO_TYPE_MAP: Record<string, string> = {
  string: 'ByteArray',
  u64: 'u64',
  u128: 'u128',
  u256: 'u256',
  bool: 'bool',
  felt252: 'felt252',
  address: 'ContractAddress',
};

export class ContractService {
  /**
   * Adaptive storage rule:
   *   ≤ 3 fields → store entirely on-chain
   *   > 3 fields → hybrid (data blob in EigenDA + keccak256 commitment on-chain)
   */
  determineStorageMode(schema: SchemaDefinition): StorageMode {
    return schema.fields.length > 3 ? 'hybrid' : 'onchain';
  }

  generateCairoInterface(schema: SchemaDefinition): string {
    const structName = schema.name.replace(/\s+/g, '_');
    const fields = schema.fields
      .map((f) => `    ${f.name}: ${CAIRO_TYPE_MAP[f.type] ?? 'felt252'},`)
      .join('\n');

    return `
#[derive(Drop, Serde, starknet::Store)]
struct ${structName} {
${fields}
}

#[starknet::interface]
trait I${structName}Store<TContractState> {
    fn create(ref self: TContractState, record: ${structName}) -> u64;
    fn get(self: @TContractState, id: u64) -> ${structName};
    fn update(ref self: TContractState, id: u64, record: ${structName});
    fn delete(ref self: TContractState, id: u64);
}
`.trim();
  }

  async deploy(
    schema: SchemaDefinition,
    owner: string,
    eigendaBlobId?: string
  ): Promise<DeployedContract> {
    const storageMode = this.determineStorageMode(schema);
    const resolvedSchema: SchemaDefinition = {
      ...schema,
      storage: { ...schema.storage, mode: storageMode },
    };

    // TODO: Scarb compile + Starknet deploy via Starkli
    const contractAddress = `0x${crypto.randomBytes(32).toString('hex').slice(0, 63)}`;
    const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;

    return {
      contractAddress,
      transactionHash,
      schema: resolvedSchema,
      eigendaBlobId: storageMode === 'hybrid' ? eigendaBlobId : undefined,
    };
  }

  async createRecord(
    contractAddress: string,
    data: Record<string, unknown>
  ): Promise<ContractRecord> {
    // TODO: call deployed Starknet contract
    const id = crypto.randomUUID();
    return {
      id,
      contractAddress,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getRecord(contractAddress: string, recordId: string): Promise<ContractRecord | null> {
    // TODO: query indexed contract data
    return null;
  }
}
