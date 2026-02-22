import type { AxiosInstance } from 'axios';
import type { CreatedToken, MintRewardResponse } from '@starkbase/types';

export class TokensModule {
  constructor(private http: AxiosInstance) {}

  async create(
    name: string,
    symbol: string,
    initialSupply: string,
    platformId: string
  ): Promise<CreatedToken> {
    const { data } = await this.http.post('/tokens/create', {
      name,
      symbol,
      initialSupply,
      platformId,
    });
    return data;
  }

  async mintReward(
    contractAddress: string,
    recipient: string,
    amount: string,
    reason: string
  ): Promise<MintRewardResponse> {
    const { data } = await this.http.post(`/tokens/${contractAddress}/mint`, {
      recipient,
      amount,
      reason,
    });
    return data;
  }
}
