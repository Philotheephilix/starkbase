import { AxiosInstance } from 'axios';

export class WalletModule {
  constructor(private http: AxiosInstance, private prefix: string) {}

  async export(req: { password: string }) {
    const { data } = await this.http.post(`${this.prefix}/wallet/export`, req);
    return data;
  }

  async link(req: { walletAddress: string; signature: string; challenge: string }) {
    const { data } = await this.http.post(`${this.prefix}/wallet/link`, req);
    return data;
  }
}
