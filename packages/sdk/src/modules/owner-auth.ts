import { AxiosInstance } from 'axios';

export class OwnerAuthModule {
  constructor(private http: AxiosInstance) {}

  async register(req: { username: string; password: string; email?: string }) {
    const { data } = await this.http.post('/owners/register', req);
    return data;
  }

  async login(req: { username: string; password: string }) {
    const { data } = await this.http.post('/owners/login', req);
    return data;
  }

  async me() {
    const { data } = await this.http.get('/owners/me');
    return data;
  }
}
