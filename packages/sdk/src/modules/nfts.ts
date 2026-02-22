import type { AxiosInstance } from 'axios';
import type { NFTMetadata, NFTCollection, MintedNFT } from '@starkbase/types';

export class NFTsModule {
  constructor(private http: AxiosInstance) {}

  async createCollection(
    name: string,
    symbol: string,
    platformId: string
  ): Promise<NFTCollection> {
    const { data } = await this.http.post('/nfts/collections', { name, symbol, platformId });
    return data;
  }

  async mint(
    contractAddress: string,
    recipient: string,
    metadata: NFTMetadata,
    labels: string[]
  ): Promise<MintedNFT> {
    const { data } = await this.http.post(`/nfts/${contractAddress}/mint`, {
      recipient,
      metadata,
      labels,
    });
    return data;
  }

  async addLabels(
    contractAddress: string,
    tokenId: string,
    labels: string[]
  ): Promise<{ success: boolean }> {
    const { data } = await this.http.post(
      `/nfts/${contractAddress}/tokens/${tokenId}/labels`,
      { labels }
    );
    return data;
  }
}
