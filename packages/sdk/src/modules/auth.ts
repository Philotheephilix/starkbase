import type { AxiosInstance } from 'axios';
import type { AuthResult, AuthUser } from '@starkbase/types';

export class AuthModule {
  constructor(
    private http: AxiosInstance,
    private apiKey: string | undefined
  ) {}

  async register(req: { username: string; password: string }): Promise<AuthResult> {
    const { data } = await this.http.post('/auth/register', {
      ...req,
      apiKey: this.apiKey,
    });
    return data;
  }

  async login(req: { username: string; password: string }): Promise<AuthResult> {
    const { data } = await this.http.post('/auth/login', {
      ...req,
      apiKey: this.apiKey,
    });
    return data;
  }

  async listUsers(platformId: string): Promise<Array<{ userId: string; username: string; walletAddress: string; deployed: boolean; createdAt: number }>> {
    const { data } = await this.http.get(`/auth/users/${platformId}`);
    return data;
  }

  async me(): Promise<AuthUser> {
    const { data } = await this.http.get('/auth/me');
    return data;
  }

  async logout(): Promise<void> {
    await this.http.post('/auth/logout');
  }
}
