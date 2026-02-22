import type { AxiosInstance } from 'axios';
import type { SchemaDefinition, DeployedContract, ContractRecord } from '@starkbase/types';

export class ContractsModule {
  constructor(private http: AxiosInstance) {}

  async deploy(schema: SchemaDefinition, owner: string): Promise<DeployedContract> {
    const { data } = await this.http.post('/contracts/deploy', { schema, owner });
    return data;
  }

  async getSchema(contractAddress: string): Promise<SchemaDefinition> {
    const { data } = await this.http.get(`/contracts/${contractAddress}/schema`);
    return data;
  }

  async createRecord(
    contractAddress: string,
    recordData: Record<string, unknown>
  ): Promise<ContractRecord> {
    const { data } = await this.http.post(`/contracts/${contractAddress}/records`, {
      data: recordData,
    });
    return data;
  }

  async getRecord(contractAddress: string, recordId: string): Promise<ContractRecord> {
    const { data } = await this.http.get(`/contracts/${contractAddress}/records/${recordId}`);
    return data;
  }
}
