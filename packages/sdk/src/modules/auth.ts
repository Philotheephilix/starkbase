import type { AxiosInstance } from 'axios';
import type { RegisterRequest, LoginRequest, AuthResult, AuthUser } from '@starkbase/types';

export class AuthModule {
  constructor(private http: AxiosInstance) {}

  async register(req: RegisterRequest): Promise<AuthResult> {
    const { data } = await this.http.post('/auth/register', req);
    return data;
  }

  async login(req: LoginRequest): Promise<AuthResult> {
    const { data } = await this.http.post('/auth/login', req);
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
