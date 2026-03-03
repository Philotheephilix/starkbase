import type { AxiosInstance } from 'axios';
import type { CreatedToken, MintTokenResponse, TokenMintEvent } from '@starkbase/types';

export class TokensModule {
  constructor(private http: AxiosInstance) {}

  async deploy(
    name: string,
    symbol: string,
    initialSupply: string,
    recipientAddress: string
  ): Promise<CreatedToken> {
    const { data } = await this.http.post('/tokens/deploy', {
      name,
      symbol,
      initialSupply,
      recipientAddress,
    });
    return data;
  }

  async mint(
    contractAddress: string,
    recipient: string,
    amount: string
  ): Promise<MintTokenResponse> {
    const { data } = await this.http.post(`/tokens/${contractAddress}/mint`, {
      recipient,
      amount,
    });
    return data;
  }

  async list(): Promise<CreatedToken[]> {
    const { data } = await this.http.get('/tokens');
    return data;
  }

  async history(contractAddress: string): Promise<TokenMintEvent[]> {
    const { data } = await this.http.get(`/tokens/${contractAddress}/history`);
    return data;
  }
}
