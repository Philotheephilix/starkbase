import type { AxiosInstance } from 'axios';
import type {
  QueryOptions,
  PaginatedResponse,
  ContractRecord,
  GraphQLResponse,
} from '@starkbase/types';

export class QueryModule {
  constructor(private http: AxiosInstance) {}

  async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    const { data } = await this.http.post('/query/graphql', { query, variables });
    return data;
  }

  async getRecords(
    contractAddress: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<ContractRecord>> {
    const { data } = await this.http.get(`/query/contracts/${contractAddress}/records`, {
      params: options,
    });
    return data;
  }
}
