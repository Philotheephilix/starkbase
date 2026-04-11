import { AxiosInstance } from 'axios';

export class OwnerPlatformsModule {
  constructor(private http: AxiosInstance) {}

  async create(name: string) {
    const { data } = await this.http.post('/owners/platforms', { name });
    return data;
  }

  async list() {
    const { data } = await this.http.get('/owners/platforms');
    return data;
  }

  async delete(platformId: string) {
    await this.http.delete(`/owners/platforms/${platformId}`);
  }
}
