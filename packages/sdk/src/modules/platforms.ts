import type { AxiosInstance } from 'axios';
import type { Platform } from '@starkbase/types';

export class PlatformsModule {
  constructor(private http: AxiosInstance) {}

  async create(name: string, creatorWallet?: string): Promise<Platform> {
    const { data } = await this.http.post('/platforms', { name, creatorWallet });
    return data;
  }

  async list(): Promise<Platform[]> {
    const { data } = await this.http.get('/platforms');
    return data;
  }

  async listByWallet(walletAddress: string): Promise<Platform[]> {
    const { data } = await this.http.get(`/platforms/wallet/${walletAddress}`);
    return data;
  }
}
