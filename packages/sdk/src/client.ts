import axios, { type AxiosInstance } from 'axios';
import type { StarkbaseConfig } from '@starkbase/types';
import { AuthModule } from './modules/auth';
import { ContractsModule } from './modules/contracts';
import { StorageModule } from './modules/storage';
import { QueryModule } from './modules/query';
import { NFTsModule } from './modules/nfts';
import { TokensModule } from './modules/tokens';
import { PlatformsModule } from './modules/platforms';
import { SchemasModule, SchemaCollection } from './modules/schemas';
import { BlobsModule } from './modules/blobs';
import { EventsModule } from './modules/events';

export class StarkbaseClient {
  private http: AxiosInstance;

  constructor(private config: StarkbaseConfig = {}) {
    this.http = axios.create({
      baseURL: config.apiUrl ?? 'https://starknet.philotheephilix.in',
      headers: {
        'Content-Type': 'application/json',
        ...(config.platformId ? { 'X-Platform-ID': config.platformId } : {}),
      },
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

  get auth()      { return new AuthModule(this.http, this.config.apiKey); }
  get contracts() { return new ContractsModule(this.http); }
  get storage()   { return new StorageModule(this.http); }
  get query()     { return new QueryModule(this.http); }
  get nfts()      { return new NFTsModule(this.http); }
  get tokens()    { return new TokensModule(this.http); }
  get platforms() { return new PlatformsModule(this.http); }
  get schemas()   { return new SchemasModule(this.http); }
  get blobs()     { return new BlobsModule(this.http); }
  get events()    { return new EventsModule(this.http); }

  schema(name: string): SchemaCollection {
    return new SchemaCollection(this.http, name);
  }
}
