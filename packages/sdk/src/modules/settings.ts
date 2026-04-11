import { AxiosInstance } from 'axios';

export class SettingsModule {
  constructor(private http: AxiosInstance) {}

  async update(platformId: string, req: { allowedOrigins?: string[]; registrationEnabled?: boolean }) {
    await this.http.put(`/owners/platforms/${platformId}/settings`, req);
  }
}
