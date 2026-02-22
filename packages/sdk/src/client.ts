import axios, { type AxiosInstance } from 'axios';
import type { StarkbaseConfig } from '@starkbase/types';
import { AuthModule } from './modules/auth';
import { ContractsModule } from './modules/contracts';
import { StorageModule } from './modules/storage';
import { QueryModule } from './modules/query';
import { NFTsModule } from './modules/nfts';
import { TokensModule } from './modules/tokens';

export class StarkbaseClient {
  private http: AxiosInstance;

  constructor(private config: StarkbaseConfig = {}) {
    this.http = axios.create({
      baseURL: config.apiUrl ?? 'https://api.starkbase.dev',
      headers: { 'Content-Type': 'application/json' },
    });

    if (config.sessionToken) {
      this.setSessionToken(config.sessionToken);
    }
  }

  setSessionToken(token: string) {
    this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearSessionToken() {
    delete this.http.defaults.headers.common['Authorization'];
  }

  get auth()      { return new AuthModule(this.http); }
  get contracts() { return new ContractsModule(this.http); }
  get storage()   { return new StorageModule(this.http); }
  get query()     { return new QueryModule(this.http); }
  get nfts()      { return new NFTsModule(this.http); }
  get tokens()    { return new TokensModule(this.http); }
}
