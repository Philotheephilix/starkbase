import type {
  QueryOptions,
  PaginatedResponse,
  ContractRecord,
  GraphQLResponse,
} from '@starkbase/types';

export class QueryService {
  async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    // TODO: proxy to Apibara/Torii GraphQL endpoint
    return { data: undefined, errors: [{ message: 'GraphQL endpoint not yet configured' }] };
  }

  async getRecords(
    contractAddress: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<ContractRecord>> {
    // TODO: query indexed Postgres data
    return { items: [], total: 0, limit: options.limit ?? 20, offset: options.offset ?? 0 };
  }
}
