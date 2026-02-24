import type { AxiosInstance } from 'axios';
import type { Platform } from '@starkbase/types';

export class PlatformsModule {
  constructor(private http: AxiosInstance) {}

  async create(name: string): Promise<Platform> {
    const { data } = await this.http.post('/platforms', { name });
    return data;
  }
}
