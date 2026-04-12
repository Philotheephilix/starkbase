import axios, { AxiosInstance } from 'axios';
import { OwnerAuthModule } from './modules/owner-auth';
import { OwnerPlatformsModule } from './modules/owner-platforms';
import { UserManagementModule } from './modules/user-management';
import { RolesModule } from './modules/roles';
import { RegistriesModule } from './modules/registries';
import { SettingsModule } from './modules/settings';
import { WalletModule } from './modules/wallet';

export interface OwnerClientConfig {
  apiUrl?: string;
  token?: string;
}

export class OwnerClient {
  private http: AxiosInstance;

  constructor(config: OwnerClientConfig = {}) {
    this.http = axios.create({
      baseURL: config.apiUrl ?? 'https://starknet.philotheephilix.in',
      headers: { 'Content-Type': 'application/json' },
    });
    if (config.token) {
      this.http.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
    }
  }

  setToken(token: string) {
    this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  get auth() { return new OwnerAuthModule(this.http); }
  get platforms() { return new OwnerPlatformsModule(this.http); }
  get users() { return new UserManagementModule(this.http); }
  get roles() { return new RolesModule(this.http); }
  get registries() { return new RegistriesModule(this.http); }
  get settings() { return new SettingsModule(this.http); }
  get wallet() { return new WalletModule(this.http, '/owners'); }
}
