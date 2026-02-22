import type { AxiosInstance } from 'axios';
import type {
  AuthInitiateResponse,
  AuthCallbackResponse,
  AuthDeployResponse,
  AuthSession,
} from '@starkbase/types';

export class AuthModule {
  constructor(private http: AxiosInstance) {}

  async initiateAuth(
    provider: 'google' | 'discord' | 'apple',
    redirectUri: string
  ): Promise<AuthInitiateResponse> {
    const { data } = await this.http.post('/auth/initiate', { provider, redirectUri });
    return data;
  }

  async handleCallback(
    code: string,
    state: string,
    provider: string
  ): Promise<AuthCallbackResponse> {
    const { data } = await this.http.post('/auth/callback', { code, state, provider });
    return data;
  }

  async deployAccount(params: {
    jwt: string;
    zkProof: string[];
    ephemeralPublicKey: string;
    expirationBlock: number;
  }): Promise<AuthDeployResponse> {
    const { data } = await this.http.post('/auth/deploy', params);
    return data;
  }

  async getSession(): Promise<AuthSession> {
    const { data } = await this.http.get('/auth/session');
    return data;
  }
}
